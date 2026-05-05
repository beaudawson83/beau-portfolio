// UpDraft Stage 01.2A — resume extraction + AI parse.
//
// Two-step pipeline per stage-01-intake.md:
//   1. Extract raw text from PDF (pdf-parse) or DOCX (mammoth) deterministically.
//      Reject scanned/image-only PDFs with a clear error.
//   2. Hand raw text to Gemini with SYS_RESUME_PARSER + a strict response
//      schema that mirrors the schema in lib-system-prompts.md § SYS_RESUME_PARSER.
//
// Step 1 is fully deterministic — no model call. Step 2 is silent (no Audit
// voice) since this is structured extraction, not a user-facing turn.

import 'server-only';
import { callGemini } from './gemini';
import type { ParsedResume } from '@/types';

// ---------------------------------------------------------------------------
// Step 1 — text extraction (deterministic)
// ---------------------------------------------------------------------------

export type ResumeFileType = 'pdf' | 'docx' | 'unknown';

export type ExtractError =
  | 'unsupported-type'
  | 'image-only-pdf'
  | 'parse-failed'
  | 'too-large'
  | 'empty';

export interface ExtractSuccess {
  ok: true;
  text: string;
  fileType: 'pdf' | 'docx';
}

export interface ExtractFailure {
  ok: false;
  error: ExtractError;
  message: string;
  fileType?: ResumeFileType;
}

export type ExtractResult = ExtractSuccess | ExtractFailure;

const MAX_BYTES = 4 * 1024 * 1024;            // 4 MB per spec
const MIN_TEXT_CHARS = 200;                    // below this, treat as image-only

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

export async function extractResumeText(buffer: Buffer): Promise<ExtractResult> {
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

  const type = detectFileType(buffer);

  if (type === 'pdf') {
    try {
      // pdf-parse v2 exposes a PDFParse class — completely different from
      // v1's default-export-function shape. The v0.1 ship called the v1
      // signature against the v2 install, so every PDF upload threw and
      // surfaced as "Couldn't read that PDF." Bug found 2026-05-04 when
      // Beau's testing showed every PDF failing the same way.
      //
      // v2 usage: `new PDFParse({ data: buffer }).getText()` returns
      // { text, totalPages, pages }. Single class instantiation per
      // call is fine — the parser is stateless across instances.
      const { PDFParse } = (await import('pdf-parse')) as {
        PDFParse: new (opts: { data: Buffer }) => {
          getText: () => Promise<{ text?: string; totalPages?: number }>;
        };
      };
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = (result?.text ?? '').trim();
      if (text.length < MIN_TEXT_CHARS) {
        return {
          ok: false,
          fileType: 'pdf',
          error: 'image-only-pdf',
          message:
            'This PDF appears to be image-based. UpDraft can only read text-based resumes. Try uploading the DOCX version, or pick "Talk it through" instead.',
        };
      }
      return { ok: true, fileType: 'pdf', text };
    } catch (err) {
      console.error('updraft.extractResumeText: pdf-parse failed', err);
      return {
        ok: false,
        fileType: 'pdf',
        error: 'parse-failed',
        message: "Couldn't read that PDF. Try the DOCX version, or pick \"Talk it through\".",
      };
    }
  }

  if (type === 'docx') {
    try {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer });
      const text = (value ?? '').trim();
      if (text.length < MIN_TEXT_CHARS) {
        return {
          ok: false,
          fileType: 'docx',
          error: 'empty',
          message: 'That DOCX has no extractable text. Try a different file.',
        };
      }
      return { ok: true, fileType: 'docx', text };
    } catch (err) {
      console.error('updraft.extractResumeText: mammoth failed', err);
      return {
        ok: false,
        fileType: 'docx',
        error: 'parse-failed',
        message: "Couldn't read that DOCX. Try saving it again, or pick \"Talk it through\".",
      };
    }
  }

  return {
    ok: false,
    error: 'unsupported-type',
    message: 'Only PDF and DOCX files are supported.',
  };
}

// ---------------------------------------------------------------------------
// Step 2 — AI parse (SYS_RESUME_PARSER)
// ---------------------------------------------------------------------------

/**
 * Gemini-flavored JSON Schema for SYS_RESUME_PARSER's output.
 * Mirrors the schema documented in lib-system-prompts.md § SYS_RESUME_PARSER.
 *
 * Notes on Gemini's schema flavor:
 *   - Uses OpenAPI 3.0-style `nullable: true` instead of union types.
 *   - `required` is enforced; nullable just means the field can be null.
 */
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

export interface AiParseSuccess {
  ok: true;
  parsed: ParsedResume;
  tokensIn: number;
  tokensOut: number;
  retried: boolean;
}

export interface AiParseFailure {
  ok: false;
  error: string;
  tokensIn: number;
  tokensOut: number;
}

export type AiParseResult = AiParseSuccess | AiParseFailure;

export async function parseResumeFromText(rawText: string): Promise<AiParseResult> {
  const result = await callGemini<ParsedResume>({
    systemPrompt: 'SYS_RESUME_PARSER',
    withAuditVoice: false,                             // silent extraction
    userPrompt: rawText,
    responseSchema: RESUME_PARSE_SCHEMA,
    temperature: 0,                                    // determinism for parsing
  });

  if (!result.ok || !result.json) {
    return {
      ok: false,
      error: result.ok ? 'no-json' : result.error,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  }
  return {
    ok: true,
    parsed: result.json,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    retried: result.retried,
  };
}
