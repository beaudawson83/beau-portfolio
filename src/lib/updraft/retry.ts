// UpDraft retry helper.
//
// Centralized exponential-backoff-with-jitter retry policy for the
// transient-prone external boundary:
//   - Gemini API (every AI call)
//
// (PDF generation used to be here too, back when it was a Google Drive API
// call. PDF is now generated natively in-process via pdf-builder.tsx — no
// network, no retry needed — so the Drive policy + classifier were removed
// 2026-06-13. See DECISIONS.md.)
//
// Why centralized: per-call ad-hoc retries drift apart. One file means one
// failure model: "what counts as transient", "how many tries", "how long
// to wait". Anything not transient (400 bad-request, 403 auth, 404) bails
// immediately so we don't waste time on errors that retrying can't fix.
//
// Two shapes:
//   - withRetry<T>(fn, policy, shouldRetry)            — for throw-based fns
//   - withRetryResult<R>(fn, policy, isTransient)      — for { ok: bool } fns
//
// Both return the eventual result + how many attempts it took. Callers log
// `attempts` in the events table so we can spot retry-storm patterns.

import 'server-only';

export interface RetryPolicy {
  /** Total attempts including the first try. 1 = no retry. */
  maxAttempts: number;
  /** Base delay before retry #2; doubles each subsequent retry up to maxDelayMs. */
  baseDelayMs: number;
  /** Cap on the doubling growth so very long backoffs don't blow request timeouts. */
  maxDelayMs: number;
  /** Uniform random jitter added to each delay (0..jitterMs). Smooths out
   *  thundering-herd retries when a downstream is rate-limited. */
  jitterMs: number;
}

export const GEMINI_RETRY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs:  400,
  maxDelayMs:   2000,
  jitterMs:     200,
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function delayForAttempt(attempt: number, policy: RetryPolicy): number {
  // attempt counts from 1 (first try). Delay applies BEFORE retry — i.e.
  // before attempt 2, attempt 3, etc. Exponential: base, base*2, base*4...
  const exponent = Math.max(0, attempt - 1);
  const exp = policy.baseDelayMs * Math.pow(2, exponent);
  const capped = Math.min(exp, policy.maxDelayMs);
  const jitter = Math.floor(Math.random() * policy.jitterMs);
  return capped + jitter;
}

export interface RetryOutcome<T> {
  result: T;
  attempts: number;
}

/**
 * Throw-based retry. The callable should throw on transient failures and
 * return on success. Use `shouldRetry` to filter out terminal errors so
 * we don't burn attempts on errors that can't be fixed by retrying.
 *
 * Default: retry on every throw. Pass a tighter predicate when caller
 * knows the error model.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy,
  shouldRetry: (err: unknown, attempt: number) => boolean = () => true,
): Promise<RetryOutcome<T>> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (err) {
      lastErr = err;
      if (attempt >= policy.maxAttempts) break;
      if (!shouldRetry(err, attempt)) break;
      await sleep(delayForAttempt(attempt, policy));
    }
  }
  throw lastErr;
}

/**
 * Result-pattern retry. Wraps any function that returns `{ ok: boolean }`
 * (the established UpDraft convention) and retries when `isTransient`
 * returns true. Returns the final result + attempts.
 *
 * Unlike `withRetry`, this never throws — callers get the same shape they
 * would have gotten without retry, plus an attempt count for telemetry.
 */
export async function withRetryResult<R extends { ok: boolean }>(
  fn: () => Promise<R>,
  policy: RetryPolicy,
  isTransient: (result: R) => boolean,
): Promise<RetryOutcome<R>> {
  let last: R | null = null;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    last = await fn();
    if (last.ok) return { result: last, attempts: attempt };
    if (attempt >= policy.maxAttempts) break;
    if (!isTransient(last)) break;
    await sleep(delayForAttempt(attempt, policy));
  }
  // Defensive: loop body always assigns `last`, but TS can't prove that
  // when policy.maxAttempts is somehow 0. Mirror the same behavior.
  if (!last) {
    return {
      result: { ok: false, error: 'retry: maxAttempts must be >= 1' } as unknown as R,
      attempts: 0,
    };
  }
  return { result: last, attempts: policy.maxAttempts };
}

// ---------------------------------------------------------------------------
// Transient-error classifiers
// ---------------------------------------------------------------------------

/**
 * Gemini transient classifier. Retry on:
 *   - 5xx server errors
 *   - 429 rate limit
 *   - "non-JSON envelope" (transport-level garble)
 *   - "empty-response" (sometimes a partial generation glitch)
 *   - Network throws
 *
 * Don't retry on:
 *   - 400 (malformed request)
 *   - 403 (auth)
 *   - "blocked" (policy)
 *   - "malformed-json" (gemini.ts already does its own one-shot retry on this)
 */
export function isTransientGeminiError(error: string | undefined): boolean {
  if (!error) return false;
  const e = error.toLowerCase();
  if (e.includes('blocked')) return false;
  if (e.includes('malformed-json')) return false;
  if (e.startsWith('gemini 4')) return false;            // 4xx
  if (e.startsWith('gemini 5')) return true;             // 5xx
  if (e.includes(' 429')) return true;
  if (e.includes('non-json envelope')) return true;
  if (e.includes('empty-response')) return true;
  if (e.includes('network')) return true;
  return false;
}
