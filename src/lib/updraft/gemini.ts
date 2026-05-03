// UpDraft Gemini wrapper.
//
// Single entry point for every model call UpDraft makes. Handles:
//   - SYS_* prompt loading (via skill-files)
//   - optional Audit voice prepend (PLAN.md §6: voice is loaded on every
//     user-facing AI turn; silent extraction calls skip it)
//   - structured output via response_schema (every [AI] step in the spec
//     produces JSON — schema-enforced reduces parse-retry churn)
//   - token counting from usageMetadata for the quota counters
//   - one retry on malformed JSON with a stricter "JSON only" reminder
//
// Matches the existing /api/ask-beau pattern (raw fetch to the v1beta
// generateContent endpoint, no SDK).

import 'server-only';
import { loadAuditVoice, loadSystemPrompt, type SysPromptName } from './skill-files';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type UpdraftModel = 'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface CallGeminiArgs {
  /** SYS_* identifier from lib-system-prompts.md, or a raw system instruction string. */
  systemPrompt: SysPromptName | { raw: string };
  /**
   * Whether to prepend the Audit voice spec to the system instruction.
   * Default false — voice is for user-facing AI turns; silent extraction
   * calls (parse, score, lint rewrite) should pass false.
   */
  withAuditVoice?: boolean;
  /** User-side input. Plain text or pre-stringified JSON. */
  userPrompt: string;
  /**
   * Gemini-flavored JSON Schema for structured output. When set, the
   * response is parsed as JSON and returned in `.json`. When undefined,
   * the response is returned as plain text in `.text`.
   */
  responseSchema?: object;
  /** Defaults to gemini-2.0-flash. */
  model?: UpdraftModel;
  /** Optional generation config overrides. */
  temperature?: number;
}

export interface GeminiSuccess<T> {
  ok: true;
  json: T;
  text: string;
  tokensIn: number;
  tokensOut: number;
  finishReason: string | undefined;
  retried: boolean;
}

export interface GeminiTextSuccess {
  ok: true;
  json?: undefined;
  text: string;
  tokensIn: number;
  tokensOut: number;
  finishReason: string | undefined;
  retried: false;
}

export interface GeminiFailure {
  ok: false;
  text?: string;
  tokensIn: number;
  tokensOut: number;
  error: string;
  finishReason?: string;
}

export type GeminiResult<T = unknown> =
  | GeminiSuccess<T>
  | GeminiTextSuccess
  | GeminiFailure;

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[]; role?: string };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsage;
  promptFeedback?: { blockReason?: string };
}

async function buildSystemInstruction(
  systemPrompt: CallGeminiArgs['systemPrompt'],
  withAuditVoice: boolean,
): Promise<string> {
  let body: string;
  if (typeof systemPrompt === 'object' && 'raw' in systemPrompt) {
    body = systemPrompt.raw;
  } else {
    body = await loadSystemPrompt(systemPrompt);
  }
  if (!withAuditVoice) return body;
  const voice = await loadAuditVoice();
  return `${voice}\n\n---\n\n${body}`;
}

async function postOnce(
  url: string,
  body: unknown,
): Promise<{ status: number; data: GeminiResponse | null; rawText: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let data: GeminiResponse | null = null;
  try {
    data = JSON.parse(rawText) as GeminiResponse;
  } catch {
    /* leave data null; caller handles */
  }
  return { status: res.status, data, rawText };
}

/**
 * Make one Gemini call. When `responseSchema` is set, the result is parsed
 * as JSON and one retry is attempted on parse failure.
 */
export async function callGemini<T = unknown>(
  args: CallGeminiArgs,
): Promise<GeminiResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: 'GEMINI_API_KEY not configured',
    };
  }

  const model = args.model ?? 'gemini-2.0-flash';
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const systemText = await buildSystemInstruction(
    args.systemPrompt,
    Boolean(args.withAuditVoice),
  );

  const requestBody: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: args.userPrompt }],
        role: 'user',
      },
    ],
    systemInstruction: { parts: [{ text: systemText }] },
  };

  const generationConfig: Record<string, unknown> = {};
  if (args.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = args.responseSchema;
  }
  if (typeof args.temperature === 'number') {
    generationConfig.temperature = args.temperature;
  }
  if (Object.keys(generationConfig).length > 0) {
    requestBody.generationConfig = generationConfig;
  }

  // First attempt
  const first = await postOnce(url, requestBody);
  const firstResult = parseGeminiResponse<T>(first, Boolean(args.responseSchema), false);
  if (firstResult.ok) return firstResult;
  if (!args.responseSchema) return firstResult; // no schema, no retry
  if (firstResult.error !== 'malformed-json') return firstResult;

  // Retry once with a stricter JSON-only reminder appended to the system
  // instruction. Per spec failure-modes: "On malformed JSON, retry once
  // with explicit JSON schema reminder; if still failing, surface error."
  const stricterBody = {
    ...requestBody,
    systemInstruction: {
      parts: [
        {
          text: `${systemText}\n\nIMPORTANT: Return ONLY a JSON object matching the supplied schema. No prose, no explanation, no markdown fences.`,
        },
      ],
    },
  };
  const second = await postOnce(url, stricterBody);
  return parseGeminiResponse<T>(second, true, true);
}

function parseGeminiResponse<T>(
  result: { status: number; data: GeminiResponse | null; rawText: string },
  withSchema: boolean,
  isRetry: boolean,
): GeminiResult<T> {
  const { status, data, rawText } = result;

  if (status < 200 || status >= 300) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: `Gemini ${status}: ${rawText.slice(0, 500)}`,
    };
  }

  if (!data) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: 'Gemini returned non-JSON envelope',
    };
  }

  if (data.promptFeedback?.blockReason) {
    return {
      ok: false,
      tokensIn: 0,
      tokensOut: 0,
      error: `Gemini blocked: ${data.promptFeedback.blockReason}`,
    };
  }

  const tokensIn = data.usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = data.usageMetadata?.candidatesTokenCount ?? 0;
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  if (!text) {
    return {
      ok: false,
      tokensIn,
      tokensOut,
      finishReason,
      error: 'empty-response',
    };
  }

  if (!withSchema) {
    return {
      ok: true,
      text,
      tokensIn,
      tokensOut,
      finishReason,
      retried: false,
    };
  }

  try {
    const json = JSON.parse(text) as T;
    return {
      ok: true,
      json,
      text,
      tokensIn,
      tokensOut,
      finishReason,
      retried: isRetry,
    };
  } catch {
    return {
      ok: false,
      text,
      tokensIn,
      tokensOut,
      finishReason,
      error: 'malformed-json',
    };
  }
}
