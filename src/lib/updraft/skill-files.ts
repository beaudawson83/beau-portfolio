// UpDraft skill-file loader.
//
// The Audit voice spec and the SYS_* system prompts live as Markdown files
// at skills/updraft/references/ — that's the spec's source of truth, and we
// don't want a drift problem from inlining them into TS.
//
// At runtime we read those .md files from disk (server-only, Node runtime)
// and cache the parsed content for the lifetime of the function instance.
// Vercel Functions reuse instances under Fluid Compute so the cache hit is
// the common case after a cold start.
//
// IMPORTANT: skills/updraft/references/** must be in the function bundle.
// next.config.ts uses outputFileTracingIncludes to ensure that.

import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SPEC_ROOT = path.join(process.cwd(), 'skills', 'updraft', 'references');

let auditVoiceCache: string | null = null;
let systemPromptsCache: string | null = null;
const sysPromptCache = new Map<string, string>();

/** Loads lib-audit-voice.md for use as a system-prompt addendum. */
export async function loadAuditVoice(): Promise<string> {
  if (auditVoiceCache) return auditVoiceCache;
  auditVoiceCache = await readFile(path.join(SPEC_ROOT, 'lib-audit-voice.md'), 'utf8');
  return auditVoiceCache;
}

export type SysPromptName =
  | 'SYS_RESUME_PARSER'
  | 'SYS_MATCH_ANALYZER'
  | 'SYS_SUMMARY_GENERATOR'
  | 'SYS_BULLET_REWRITER'
  | 'SYS_BULLET_REFRAMER'
  | 'SYS_COVER_LETTER_DRAFTER'
  | 'SYS_ATS_OPTIMIZER'
  | 'SYS_ANTIPATTERN_REVIEWER'
  | 'SYS_FINAL_QA';

/**
 * Extracts the prompt body for a given SYS_* identifier from
 * lib-system-prompts.md. Each section starts with `## SYS_NAME` and the
 * prompt body is the next ```-fenced code block.
 */
export async function loadSystemPrompt(name: SysPromptName): Promise<string> {
  const cached = sysPromptCache.get(name);
  if (cached) return cached;

  if (!systemPromptsCache) {
    systemPromptsCache = await readFile(
      path.join(SPEC_ROOT, 'lib-system-prompts.md'),
      'utf8',
    );
  }

  const headerRe = new RegExp(`^## ${name}\\s*$`, 'm');
  const match = headerRe.exec(systemPromptsCache);
  if (!match) {
    throw new Error(`UpDraft system prompt not found: ${name}`);
  }
  const after = systemPromptsCache.slice(match.index + match[0].length);
  const fenceStart = after.indexOf('```');
  if (fenceStart === -1) {
    throw new Error(`No code fence after ## ${name}`);
  }
  const bodyStart = after.indexOf('\n', fenceStart) + 1;
  const fenceEnd = after.indexOf('```', bodyStart);
  if (fenceEnd === -1) {
    throw new Error(`Unclosed code fence for ## ${name}`);
  }

  const body = after.slice(bodyStart, fenceEnd).trim();
  sysPromptCache.set(name, body);
  return body;
}
