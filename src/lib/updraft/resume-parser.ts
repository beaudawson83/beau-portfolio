// UpDraft Stage 01.2A — resume parsing.
//
// Single-step pipeline as of 2026-05-04: Gemini reads the file directly
// and returns structured JSON. Two paths under the hood:
//
//   PDF: send bytes inline as application/pdf to Gemini's generateContent
//        endpoint. Gemini's PDF support handles text-based PDFs AND
//        image-based PDFs (it OCRs internally) — that's a real win over
//        the prior pdf-parse approach which rejected image-only PDFs.
//
//   DOCX: still extract text via mammoth first (Gemini doesn't read DOCX
//         natively), then send the extracted text to Gemini. Same
//         SYS_RESUME_PARSER prompt + schema either way.
//
// Both paths converge on parseResumeFromUpload(buffer) — single entry
// point for the API route.
//
// History: this file used to do a deterministic two-step (extract text →
// pass to AI). pdf-parse was the source of truth for PDF text. Beau's
// 2026-05-04 testing surfaced that pdf-parse v2 has a different API than
// v1, leaving the PDF path broken; deeper inspection showed pdf-parse is
// fragile across PDF generators and rejects image-only PDFs entirely.
// Switching to Gemini-direct removes the dep, removes the v1/v2 surface,
// and OCRs image PDFs for free.

import 'server-only';
import { callGemini } from './gemini';
import type { ParsedResume } from '@/types';

// ---------------------------------------------------------------------------
// File-type detection (deterministic, magic-byte based)
// ---------------------------------------------------------------------------

export type ResumeFileType = 'pdf' | 'docx' | 'unknown';

const MAX_BYTES = 4 * 1024 * 1024;            // 4 MB per spec

export function detectFileType(buf: Buffer): ResumeFileType {
  if (buf.length < 4) return 'unknown';
  // PDF: `%PDF-`
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return 'pdf';
  }
  // DOCX (zip): `PK\x03\x04`
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return 'docx';
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// SYS_RESUME_PARSER schema (Gemini-flavored)
// ---------------------------------------------------------------------------

const RESUME_PARSE_SCHEMA = {
  type: 'object',
  properties: {
    identity: {
      type: 'object',
      properties: {
        name:     { type: 'string' },
        email:    { type: 'string' },
        phone:    { type: 'string', nullable: true },
        location: { type: 'string', nullable: true },
        linkedin: { type: 'string', nullable: true },
      },
      required: ['name', 'email', 'phone', 'location', 'linkedin'],
    },
    summary: { type: 'string', nullable: true },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company:    { type: 'string' },
          title:      { type: 'string' },
          start_date: { type: 'string' },        // YYYY-MM
          end_date:   { type: 'string' },        // YYYY-MM | "Present"
          location:   { type: 'string', nullable: true },
          bullets:    { type: 'array', items: { type: 'string' } },
        },
        required: ['company', 'title', 'start_date', 'end_date', 'location', 'bullets'],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree:      { type: 'string',  nullable: true },
          start_year:  { type: 'integer', nullable: true },
          end_year:    { type: 'integer', nullable: true },
        },
        required: ['institution', 'degree', 'start_year', 'end_year'],
      },
    },
    skills: { type: 'array', items: { type: 'string' } },
  },
  required: ['identity', 'summary', 'experience', 'education', 'skills'],
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParseSuccess {
  ok: true;
  parsed: ParsedResume;
  fileType: 'pdf' | 'docx';
  tokensIn: number;
  tokensOut: number;
  retried: boolean;
}

export interface ParseFailure {
  ok: false;
  error:
    | 'unsupported-type'
    | 'too-large'
    | 'empty'
    | 'docx-extract-failed'
    | 'ai-parse-failed';
  message: string;
  fileType?: ResumeFileType;
  tokensIn?: number;
  tokensOut?: number;
}

export type ParseResult = ParseSuccess | ParseFailure;

const PDF_USER_PROMPT =
  "Parse this resume PDF into the structured JSON schema. The PDF is " +
  "attached as inline data. Follow the SYS_RESUME_PARSER rules exactly — " +
  "extract only what's explicitly present, preserve bullet text verbatim, " +
  "and use null for any field not in the source. Return ONLY the JSON.";

export async function parseResumeFromUpload(buffer: Buffer): Promise<ParseResult> {
  if (buffer.length === 0) {
    return { ok: false, error: 'empty', message: 'The uploaded file is empty.' };
  }
  if (buffer.length > MAX_BYTES) {
    return {
      ok: false,
      error: 'too-large',
      message: 'Resume exceeds 4 MB. Compress or save a leaner version.',
    };
  }

  const fileType = detectFileType(buffer);

  if (fileType === 'pdf') {
    // Gemini reads PDFs natively. Pass bytes inline as base64.
    const result = await callGemini<ParsedResume>({
      systemPrompt: 'SYS_RESUME_PARSER',
      withAuditVoice: false,
      userPrompt: PDF_USER_PROMPT,
      inlineFiles: [
        {
          mimeType: 'application/pdf',
          data: buffer.toString('base64'),
        },
      ],
      responseSchema: RESUME_PARSE_SCHEMA,
      temperature: 0,
    });

    if (!result.ok || !result.json) {
      return {
        ok: false,
        error: 'ai-parse-failed',
        message:
          "Couldn't parse that PDF. Try the DOCX version, or pick \"Talk it through\".",
        fileType: 'pdf',
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      };
    }
    return {
      ok: true,
      parsed: result.json,
      fileType: 'pdf',
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      retried: result.retried,
    };
  }

  if (fileType === 'docx') {
    // DOCX → text via mammoth, then Gemini on the text.
    let text: string;
    try {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer });
      text = (value ?? '').trim();
    } catch (err) {
      console.error('updraft.parseResumeFromUpload: mammoth failed', err);
      return {
        ok: false,
        error: 'docx-extract-failed',
        message:
          "Couldn't read that DOCX. Try saving it again, or pick \"Talk it through\".",
        fileType: 'docx',
      };
    }
    if (text.length === 0) {
      return {
        ok: false,
        error: 'empty',
        message: 'That DOCX has no extractable text. Try a different file.',
        fileType: 'docx',
      };
    }

    const result = await callGemini<ParsedResume>({
      systemPrompt: 'SYS_RESUME_PARSER',
      withAuditVoice: false,
      userPrompt: text,
      responseSchema: RESUME_PARSE_SCHEMA,
      temperature: 0,
    });

    if (!result.ok || !result.json) {
      return {
        ok: false,
        error: 'ai-parse-failed',
        message:
          "Couldn't parse that DOCX. Try a different version, or pick \"Talk it through\".",
        fileType: 'docx',
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      };
    }
    return {
      ok: true,
      parsed: result.json,
      fileType: 'docx',
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      retried: result.retried,
    };
  }

  return {
    ok: false,
    error: 'unsupported-type',
    message: 'Only PDF and DOCX files are supported.',
  };
}
