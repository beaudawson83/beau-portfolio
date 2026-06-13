# UpDraft — Master Build Plan

**Status:** v0.1.5 + first wave of v0.5 polish shipped (auth · 4 stages · DOCX + PDF · account · purge cron · Pi-egg reveal · cover letter · casing rules · centralized retry · Stage 04 picker · summary auto-gen · phased Stage 03 UX). v0.1.5 happy path real-traffic verified 2026-05-06 with husband as second test account.
**Last updated:** 2026-06-12 — calibration re-validated on `gemini-3.5-flash` (49-pair sweep; all four match-analyzer fixes hold; PR #6 merged) and the full 4-stage flow verified live on 3.5. That live run found two prod outages: Brevo email (IP-restriction, fixed in-session) and **Drive PDF down (`403 storageQuotaExceeded`)** → PDF is being **rebuilt on Sandbox + LibreOffice** (reverses the §4 Drive pivot). See `DECISIONS.md` 2026-06-12, `CALIBRATION.md` 2026-06-12, and `V1-GATE.md`. *(Prior: 2026-06-10, Gemini default migrated to 3.5 after Google retired 2.0-flash.)*

The skill spec itself lives in `SKILL.md` and `references/`. This file is the durable design + integration record for the host program build-out on beaudawson.com. `DECISIONS.md` is the append-only decision log (alternatives considered, rationale, what would invalidate each call).

---

## 1. What UpDraft is

A resume + cover-letter generation skill operated by an AI character named **Audit**, hosted as a feature of beaudawson.com. Runs as a chained 4-stage flow (intake → target → interview → generate) producing three deliverables in any combination:

1. **Master Overview Document (MOD)** — comprehensive personal source-of-truth. Exports as DOCX + PDF + Markdown.
2. **JD-Specific Resume** — tailored to one specific job posting. Exports as DOCX + PDF.
3. **Cover Letter** — 4-paragraph CL targeting one specific job. Exports as DOCX + PDF.

Architecture is "skill-as-orchestrator": the host program (this Next.js app) owns UI, state, file generation, and the regex anti-pattern lint pass. The model owns parsing, voice, bullet rewriting, scoring, and CL drafting. Backend is the source of truth — conversation history is intentionally not preserved across stages; only structured stage outputs persist.

---

## 2. Locked decisions (as of 2026-05-03)

| # | Decision | One-line rationale |
|---|---|---|
| 1 | Entry phasing: unlinked URL (v0.1) → Pi-egg reveal (v0.5) → MODULES card (v1.0) | Smallest blast radius first |
| 2 | AI provider: Gemini (`gemini-3.5-flash` default — was `gemini-2.0-flash` until Google retired it 2026-06-01; see DECISIONS.md 2026-06-10) | Matches existing AskBeau infra |
| 3 | PDF generation: **moving to Vercel Sandbox + LibreOffice** (decided 2026-06-12, DECISIONS.md). Was Google Drive API since 2026-05-04, but Drive is dead in prod (`403 storageQuotaExceeded` — service accounts have no My Drive quota). DOCX-only until the Sandbox build lands. | Removes the Google-account dependency that caused the outage; `renderPdf()` isolates the swap |
| 3a | PDF reading: Gemini's native PDF input on `generateContent`. Replaces pdf-parse. | Handles image-based PDFs (OCR), removes lib API churn risk, single round-trip |
| 4 | Storage: Supabase only (single source of truth across the site) | Reuses existing patterns + RLS |
| 5 | Auth: magic-link from day one (Brevo). Originally planned on Resend; pivoted 2026-05-04 because Resend's free-tier sandbox sender only delivers to the account owner — broke for any other user. | No anonymous PII; no v1.5 migration |
| 6 | Retention: 30-day auto-purge + user-controlled "Delete my data" + per-session keep flag | Strongest privacy posture |
| 7 | Cost guardrails: env-var caps + `UPDRAFT_OWNER_SECRET` bypass for owner | Dial from Vercel dashboard, no redeploy |
| 8 | BYOK fallback: deferred to v1.0 | Built carefully or not at all |
| 9 | Phased rollout: v0.1 → v0.5 → v1.0 → v1.5 → v2.0+ | Vertical slice first; layer scope dimensions |

See `DECISIONS.md` for alternatives considered and invalidation conditions.

---

## 3. System architecture

### 3.1 High-level pipeline

```
Login (magic link) → Create session → Stage 01 (Intake)
                                          ↓
                                      Stage 02 (Target)
                                          ↓
                                      Stage 03 (Interview)
                                          ↓
                                      Stage 04 (Generate)
                                          ↓
                                  DOCX builder ──→ Google Drive API
                                          │       (DOCX → Google Doc → PDF export)
                                          └─→ PDF writer ←──┘
                                                 ↓
                                       Supabase Storage (signed URLs)
```

### 3.2 Routes (under `src/app/`)

| Path | Type | Purpose |
|---|---|---|
| `/updraft` | server | Auth-gated dashboard: session list + active MOD |
| `/updraft/login` | client | Magic-link request + privacy callout |
| `/updraft/auth/callback` | server | Magic-link verification + cookie set |
| `/updraft/[sessionId]` | client | 4-stage runner |
| `/updraft/[sessionId]/done` | client | Export downloads |
| `/updraft/account` | client | Active MOD pointer · session keep-flags · delete-my-data · data-export |

### 3.3 API endpoints (under `src/app/api/updraft/`)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/updraft/auth/issue` | POST | Issue magic-link email | rate-limited per IP |
| `/api/updraft/auth/verify` | POST | Verify token + set session cookie | one-shot HMAC token |
| `/api/updraft/auth/logout` | POST | Clear cookie | session cookie |
| `/api/updraft/sessions` | POST | Create session | session cookie |
| `/api/updraft/sessions` | GET | List user's sessions | session cookie |
| `/api/updraft/sessions/[id]` | GET | Read session state | cookie + ownership |
| `/api/updraft/sessions/[id]/stage/[n]` | PATCH | Update stage output | cookie + ownership |
| `/api/updraft/sessions/[id]/keep` | PATCH | Toggle 30-day-purge exemption | cookie + ownership |
| `/api/updraft/sessions/[id]` | DELETE | Delete session (cascade) | cookie + ownership |
| `/api/updraft/parse-resume` | POST | PDF/DOCX → structured JSON | cookie |
| `/api/updraft/ai/[stage]` | POST | Gemini wrapper, Audit voice | cookie + cap check |
| `/api/updraft/lint` | POST | Anti-pattern Phase 1 + Phase 2 | cookie |
| `/api/updraft/sessions/[id]/exports` | POST | Generate DOCX + PDF | cookie + cap check |
| `/api/updraft/sessions/[id]/exports/[file]` | GET | Signed download URL | cookie + ownership |
| `/api/updraft/me` | GET | Current user + active MOD | cookie |
| `/api/updraft/me/data-export` | GET | Self-serve archive (GDPR/CCPA) | cookie |
| `/api/updraft/me/delete` | POST | Account delete (full cascade) | cookie + email confirm |
| `/api/updraft/status` | GET | Diagnostic: today's quota burn | `Bearer $CRON_SECRET` |
| `/api/updraft/cron/purge` | POST | 30-day purge job | `Bearer $CRON_SECRET` |

### 3.4 Library layout (under `src/lib/updraft/`)

| File | Responsibility |
|---|---|
| `auth.ts` | Magic-link issue/verify · session cookie HMAC · owner-secret bypass · server cookie helper |
| `store.ts` | Supabase CRUD: users, magic tokens, sessions, events, exports + cascade-delete + purge query |
| `storage.ts` | Supabase Storage helpers — upload, signed URL, delete-by-path, delete-session-prefix |
| `quotas.ts` | Daily caps · per-IP buckets · owner bypass · global kill switch · status snapshot |
| `gemini.ts` | Gemini wrapper. Structured output via `responseSchema`; supports inline file parts (PDF input). Loads SYS_* prompts + Audit voice from skill-files. |
| `skill-files.ts` | Reads + caches `lib-audit-voice.md` + `lib-system-prompts.md` (parses out individual SYS_* sections) + `lib-confidence-rubric.md` |
| `resume-parser.ts` | Resume → structured JSON. PDF: Gemini direct (handles image PDFs via OCR). DOCX: mammoth → text → Gemini. |
| `tier.ts` | Pure deterministic tier classifier (years/role-level/reports → tier 1-4) + auto-classify-from-parsed-resume |
| `match-analyzer.ts` | SYS_MATCH_ANALYZER call + target-metadata extraction in the same Gemini round-trip (Stage 02) |
| `summary-generator.ts` | SYS_SUMMARY_GENERATOR call. Auto-runs on Stage 03 → 04 transition; user reviews/edits/regenerates the result at the top of Stage 04 before clicking Generate. |
| `cover-letter-generator.ts` | SYS_COVER_LETTER_DRAFTER call (Stage 04). One Gemini hop returns greeting + paragraphs[4] + signoff + structured metadata (`hook_type`, `p3_branch`, `close_type`, `word_count`) used downstream for v0.5 tuning. |
| `lint.ts` | Phase 1 regex anti-pattern detection (8 categories). Phase 2 AI rewrite deferred. |
| `docx-builder.ts` | DOCX builder using `docx` npm — Classic template / Regular density. `renderModDocx` + `renderResumeDocx` + `renderCoverLetterDocx`. |
| `pdf.ts` | Google Drive API DOCX→PDF behind a provider-agnostic `renderPdf()` interface (swappable to Sandbox/LibreOffice in v1.0). Exposes `renderPdfWithRetry()` (3 attempts, transient-only). JWT auth via google-auth-library, access-token cached in module scope. |
| `retry.ts` | Centralized retry policy at the two transient-prone external boundaries (Drive API + Gemini API). `withRetry` (throw-based) + `withRetryResult` ({ ok: bool } shape) + `PDF_RETRY` / `GEMINI_RETRY` policies + `isTransientDriveError` / `isTransientGeminiError` classifiers. Retries log `*_retry_recovered` / `*_retry_exhausted` events for the diagnostic endpoint. |
| `filename.ts` | Spec-compliant export filename builder (`Lastname_Type_Role_Company_MonYYYY.ext`) |
| `data-export.ts` | GDPR/CCPA archive builder — user + sessions + events + exports w/ signed URLs |

Purge logic lives in the `/api/updraft/cron/purge` route directly rather than a `purge.ts` lib (small enough to inline cleanly).
| `quotas.ts` | Daily caps · per-IP buckets · owner bypass · kill switch |
| `purge.ts` | 30-day purge logic (called by cron) |
| `data-export.ts` | GDPR/CCPA archive builder |

### 3.5 Components (under `src/components/Updraft/`)

Actual layout as shipped:

- `LoginForm.tsx` · `PrivacyCallout.tsx` (login page Beau-edited verbiage)
- `Dashboard.tsx` (session list)
- `Stage01/Stage01Runner.tsx` (path picker · upload · identity · tier confirmation)
- `Stage02/Stage02Runner.tsx` (deliverables picker · target form · match-analyze · briefing)
- `Stage03/Stage03Runner.tsx` (phased UX with `StepProgress` + `StepBlock` wrappers around Roles, EarlierCareer, Education, Skills, Tier2 sections)
- `Stage04/Stage04Runner.tsx` (Review-and-generate page: `SummaryPanel` at top → `GenerateView` deliverable+format checkbox grid → `DoneView` after generation w/ Regenerate ↻ button + lint warnings panel; internal `FormatCheck` checkbox primitive)
- `Account/AccountPanel.tsx` (sessions list · keep flag · data export · delete-my-data)

`Login.tsx`, `Stages/{Intake,Target,Interview,Generate}.tsx`, `AuditTurn.tsx`, `PromptForm.tsx`, `ConfirmGrid.tsx`, `Templates/`, `ExportPanel.tsx`, `QuotaBanner.tsx`, `BYOKModal.tsx` from the original sketch never landed — the actual flow consolidated into per-stage Runner components instead.

### 3.6 Supabase schema (additive, all in existing project `ygvhoocbvraiplzmgufa`)

```sql
-- Identity
updraft_users (
  id uuid pk,
  email text unique,
  email_hash text indexed,
  created_at timestamptz,
  active_mod_session_id uuid nullable,
  deleted_at timestamptz nullable
)

-- Magic-link tokens (short-lived, single-use)
updraft_magic_tokens (
  token_hash text pk,
  email text,
  issued_at timestamptz,
  expires_at timestamptz,            -- 15 min default
  consumed_at timestamptz nullable
)

-- Sessions
updraft_sessions (
  id uuid pk,
  user_id uuid fk → updraft_users(id),
  status text,                        -- in_progress | completed | abandoned
  tier int nullable,
  path text nullable,                 -- upload | talk
  stage_outputs jsonb,
  started_at timestamptz,
  completed_at timestamptz nullable,
  last_activity_at timestamptz,       -- drives the 30-day purge
  keep_indefinitely bool default false
)

-- Append-only event log
updraft_events (
  id bigserial pk,
  session_id uuid fk,
  ts timestamptz,
  stage text,
  event_type text,
  data jsonb
)

-- Export file index
updraft_exports (
  id uuid pk,
  session_id uuid fk,
  kind text,                          -- mod_docx | mod_pdf | mod_md | resume_docx | resume_pdf | cl_docx | cl_pdf
  filename text,
  storage_path text,
  mime text,
  bytes int,
  generated_at timestamptz
)

-- Daily quota tracking (drives the kill switch)
updraft_quota_daily (
  date date pk,
  sessions_started int default 0,
  tokens_in bigint default 0,
  tokens_out bigint default 0,
  sandbox_invocations int default 0,
  pdfs_generated int default 0
)
```

Storage bucket: `updraft-exports`, signed-URL reads only, write-once. Reuses existing `rate_limits` table for per-IP buckets.

RLS: anon all-blocked. Every read/write goes through the service-role API. Application-level ownership checks enforce `session.user_id = current_user_id`.

Migration script: `scripts/setup-supabase-updraft.sql` (idempotent, follows the pattern of `setup-supabase-blog.sql` and `setup-supabase-conflict.sql`).

---

## 4. PDF subsystem — Google Drive API (being replaced)

> **⚠️ 2026-06-12 — reverting to Sandbox + LibreOffice.** The Drive path below is **down in production**: `403 storageQuotaExceeded` (service accounts have no My Drive storage quota; Google tightened enforcement since the 2026-05-06 verification when it worked). Decision reversed — PDF moves back to Vercel Sandbox + LibreOffice. The section below documents the Drive mechanism as built (and as it'll be torn out); see `DECISIONS.md` 2026-06-12 for the reversal and the build plan, tracked in `V1-GATE.md` §2. Until then prod is DOCX-only with a banner.

Originally locked as Vercel Sandbox + custom LibreOffice image; pivoted 2026-05-04 to Google Drive API after weighing the work-vs-value tradeoff. See [`DECISIONS.md`](DECISIONS.md) entry of 2026-05-04 for the full alternatives-considered, and the 2026-06-12 entry for why it's being undone.

### 4.1 Setup (one-time, on Beau's side)

Dedicated GCP project (`Updraft`, project id `updraft0526`) — separate from Beau's existing `BADLabs Syrum` / `Beau Portfolio` projects for scope isolation. Drive API enabled on it. Service account `updraft-pdf-converter` with NO project-level roles — scope is `drive.file` (per-file access; service account can only see/manipulate files it created itself). Service-account JSON key generated, base64-encoded, stored in Vercel as `UPDRAFT_GOOGLE_SA_JSON_B64`.

### 4.2 Conversion flow

Three Drive API calls per DOCX → PDF:

1. **Upload as Google Doc** — multipart upload to `/upload/drive/v3/files?uploadType=multipart` with metadata `mimeType: application/vnd.google-apps.document`, which tells Drive to convert the DOCX into Google Docs format on import.
2. **Export as PDF** — `GET /drive/v3/files/{id}/export?mimeType=application/pdf`. Returns the rendered PDF bytes. Google Docs is the intermediate format, so the text layer is preserved end-to-end (same engine you'd use to File→Download as PDF in the Google Docs UI).
3. **Delete the temp Doc** — best-effort `DELETE /drive/v3/files/{id}`. Wrapped in `finally` so a delete failure doesn't fail an otherwise-successful conversion. Drive auto-trashes orphans after 30 days as a safety net.

### 4.3 Driver interface

`lib/updraft/pdf.ts` exports:

```ts
async function renderPdf(args: { docxBytes: Buffer | Uint8Array; filename?: string }): Promise<RenderPdfResult>;
function isPdfRendererConfigured(): boolean;
```

Auth: JWT minted from the service-account JSON via `google-auth-library`, exchanged for a 1-hour OAuth access token. Token cached in module scope across function invocations (Fluid Compute reuses instances; this is the right pattern). Provider-agnostic signature — when v1.0 swaps to Sandbox + LibreOffice, only this file's body changes.

### 4.4 Failure handling

- **`UPDRAFT_GOOGLE_SA_JSON_B64` not set / Drive unreachable / export error:** fall back to DOCX-only with the spec § 4.5 banner — *"PDF unavailable. Your DOCX is ATS-safe and parses identically."* The Stage 04 UI surfaces a "PDF unavailable for X" amber banner so users understand what's missing.
- **PDF failure is non-blocking:** the DOCX still renders, uploads, and ships. PDF is best-effort.

### 4.5 Cost + scale

Free within Google Drive's quotas: 1000 queries / 100 sec ≈ 333 conversions per 100-sec window (each conversion uses 3 queries). Well past anything realistic at testing scale. Latency ~5-10 seconds per conversion (Drive's import + export round-trip). Token-account-side, the conversion itself doesn't consume Gemini tokens — that's only on Stage 01 PDF reading.

### 4.6 Why not Sandbox + LibreOffice (the original plan)

Trade-offs documented in DECISIONS.md (2026-05-04). Short version: Sandbox is the right answer for "fully self-hosted at v1.0 scale" but ~6-10 hours of setup (Docker spec, font installation, validation harness, image registry pin, driver code) for a product still being validated. Drive API ships in 2-3 hours, leverages Beau's existing Google ecosystem, and the same `renderPdf()` interface lets us swap to Sandbox later without route changes.

---

## 5. Cost guardrails

### 5.1 Three-layer kill switch (cheapest layer wins, evaluated in order)

1. **Per-session token cap.** Hard ceiling on input + output tokens per session. Defaults: 200K in, 50K out. Exceeded mid-session → pause + offer BYOK (v1.0+) or "come back tomorrow."
2. **Per-IP daily cap.** N sessions/day per hashed IP via existing `rate_limits` table. Default 2.
3. **Global daily kill switch.** `updraft_quota_daily` row tracks total tokens + PDFs generated. When over: `/updraft` lands on a "closed for the day" page. Resets at midnight Central. (The schema has a `sandbox_invocations` column from the original Sandbox plan — currently unused; will repurpose if/when v1.0 swaps to Sandbox.)

### 5.2 Defaults (env-var configurable)

```
UPDRAFT_DAILY_SESSION_CAP=50
UPDRAFT_DAILY_TOKEN_CAP_IN=500000
UPDRAFT_DAILY_TOKEN_CAP_OUT=100000
UPDRAFT_DAILY_PDF_CAP=30
UPDRAFT_PER_IP_DAILY=2
UPDRAFT_SESSION_TOKEN_CAP_IN=200000
UPDRAFT_SESSION_TOKEN_CAP_OUT=50000
```

### 5.3 Owner bypass

`UPDRAFT_OWNER_SECRET` env var. Mirrors `BLOG_EDITOR_SECRET` pattern. Send as `Authorization: Bearer …`, cached in `localStorage`. Owner sessions skip all caps and tag events `owner: true` so analytics stays clean. Caps and owner bypass are validated in [`lib/updraft/quotas.ts`](src/lib/updraft/quotas.ts).

### 5.4 Diagnostic endpoint

`/api/updraft/status` (CRON_SECRET-gated): single curl returns today's burn — sessions, tokens, PDFs — plus an env-presence map (true/false per env var, never values). First stop when something looks off.

### 5.5 BYOK (v1.0)

Bring-your-own Gemini key. Held in `sessionStorage` only, sent per-request as `X-Updraft-User-Key` header, server forwards to Gemini and discards. No persistence, no logging, redacted in error paths. Event log records `{byok: true}`, never the key itself.

---

## 6. Gemini strategy

- **Default model:** `gemini-3.5-flash` (matches AskBeau). Was `gemini-2.0-flash` until Google retired it 2026-06-01 — every UpDraft AI call failed for 9 days until the 2026-06-10 migration (see DECISIONS.md). Next retirement is a one-line change in `src/lib/updraft/gemini.ts`.
- **Premium model:** `gemini-2.5-pro` reserved for cover-letter draft only if quality demands after testing (CL shipped in the v0.5 wave; still on the default model). Note: `gemini-2.5-*` retire 2026-10-16 — pick from the 3.x pro tier if this option is ever exercised.
- **Structured output:** every `[AI]` step uses `response_mime_type: application/json` + `response_schema` matching the spec's per-stage JSON contract. Schema-enforced output reduces parse-retry churn.
- **Multimodal input:** PDF resume uploads go to Gemini directly via `inline_data` parts on `generateContent` (mime: `application/pdf`). Removes the deterministic text-extraction step entirely. Handles image-based PDFs via Gemini's internal OCR.
- **Voice:** every user-facing AI call gets `lib-audit-voice.md` as system addendum + active `SYS_*` prompt. Silent extraction calls (parse, score, lint rewrite) skip the voice file per spec.
- **Lib loading:** `skill-files.ts` reads + caches `lib-audit-voice.md`, `lib-system-prompts.md` (parsed into individual SYS_* sections by header), and `lib-confidence-rubric.md` from `skills/updraft/references/`. Cache lives for the lifetime of the function instance — Fluid Compute reuse means the cache hit is the common case after cold start.
- **Context caching (Gemini's explicit cache API):** not yet wired. The original PLAN called for it as the biggest cost lever; v0.1.5 ships without it because token volume so far is well under the cost-justification threshold. Add it when traffic warrants. Tracked in CALIBRATION.md.
- **Retry policy:** on malformed JSON, retry once with stricter schema reminder. Second fail surfaces error UI per spec's failure modes.

---

## 7. Auth + privacy posture

### 7.1 Magic-link flow

1. User enters email at `/updraft/login`.
2. Server issues HMAC token (15-min single-use) → emails magic link via Brevo (originally Resend; pivoted 2026-05-04 — see DECISIONS.md).
3. User clicks link → `/updraft/auth/callback?token=…` → token verified, session cookie set (HttpOnly, Secure, SameSite=Lax, 30-day TTL).
4. Cookie carries `user_id`. Sessions and exports are scoped to that `user_id`.

### 7.2 Privacy statement on login page

The login page reserves a clearly-labeled `<PrivacyCallout>` component **below** the email-input + magic-link button. Beau's call: above would put privacy ahead of action; below treats the privacy story as the hero of the page once the user has the entry point in hand.

Display requirements:
- Body copy weight — not fine print, not a collapsible expander.
- Full readable size, headings as headings, bullets as bullets.
- Not skippable (no scroll-jump, no dismissal).

Canonical copy lives at [`skills/updraft/PRIVACY-COPY.md`](PRIVACY-COPY.md) (Beau-edited master). The `<PrivacyCallout>` component reads from `src/lib/data.ts` (`updraftPrivacyCopy` export), which mirrors the master file. When the master changes, `data.ts` updates — the component is purely structural.

Copy structure: heading + lede + "How we protect your data" with five sub-points (passwordless access · purpose-limited use · 30-day automatic deletion · user control via dashboard · ethical AI / no training, no sale) + "Why this matters" framing + a single-line acknowledgement-on-login footer. See `PRIVACY-COPY.md` for the full text.

### 7.3 Retention model

| Resource | 30-day purge | Manual delete |
|---|---|---|
| `updraft_sessions` row | ✅ (unless `keep_indefinitely=true`) | ✅ |
| `updraft_events` rows | ✅ (cascade) | ✅ |
| `updraft_exports` rows + Storage files | ✅ (cascade) | ✅ |
| `updraft_users` row | ❌ (kept until manual delete) | ✅ |
| `updraft_magic_tokens` | already TTL'd | ✅ |

Purge driver: `last_activity_at` column. Cron runs daily via `/api/updraft/cron/purge` (CRON_SECRET-gated). Account row only deletes on manual request — an inactive user can return after 90 days, log in, find old sessions purged, start fresh.

### 7.4 Self-serve data export

`/api/updraft/me/data-export` returns a JSON archive of all sessions + signed URLs for all export files. Offered as a download before manual delete in the UI flow.

---

## 8. Phased roadmap

| Version | Scope | Entry surface |
|---|---|---|
| **v0.1.5** "Vertical slice — SHIPPED 2026-05-06" | Magic-link auth (Brevo) · Path A only · Tier 2 only · MOD + Resume (no CL) · 1 template × 1 density (Classic) · **DOCX + PDF export** (Drive API) · **Gemini-direct PDF reading** · Lint Phase 1 (regex) · per-IP + global kill switch · 30-day purge cron · keep flags · delete-my-data · data-export | Unlinked URL — share manually |
| **v0.5** "Make it good" | Path B (talk-it-through) · all 4 tiers (1/3/4 deepening branches) · Cover Letter (`SYS_COVER_LETTER_DRAFTER`) · Lint Phase 2 (AI rewrite via `SYS_ANTIPATTERN_REVIEWER`) · AI bullet rewriter (`SYS_BULLET_REWRITER`) · conversational Stage 03 (Phase A-D + STAR stories + skill surfacing card) · daily caps tuned to real traffic · **`SYS_MATCH_ANALYZER` prompt tuning** (see [`CALIBRATION.md`](CALIBRATION.md)) · Gemini explicit context caching | Pi-egg reveal |
| **v1.0** "Complete" | All 4 templates × 3 densities (12) · ATS quarterly parsing tests · BYOK with safety harness · session resumption flow · active-MOD pointer + session history UI · re-tailoring flow (existing MOD + new JD → new resume, skip Stages 1–3) · **Vercel Sandbox + LibreOffice PDF rebuild** (now a hard blocker, not "if scale demands" — Drive died in prod 2026-06-12) | Promote to MODULES card as `LIVE` |
| **v1.5+** | Portfolio-site generator (Tier 4) · multi-language (Spanish first) · recruiter-perspective scoring | MODULES card |

---

## 9. Environment variables (additive)

| Variable | Required at | Purpose |
|---|---|---|
| `UPDRAFT_OWNER_SECRET` | v0.1 | Owner bypass for caps |
| `UPDRAFT_MAGIC_LINK_SECRET` | v0.1 | HMAC for magic-link tokens |
| `UPDRAFT_SESSION_COOKIE_SECRET` | v0.1 | Session cookie signing |
| `UPDRAFT_DAILY_SESSION_CAP` | v0.1 | Default 50 |
| `UPDRAFT_DAILY_TOKEN_CAP_IN` | v0.1 | Default 500000 |
| `UPDRAFT_DAILY_TOKEN_CAP_OUT` | v0.1 | Default 100000 |
| `UPDRAFT_PER_IP_DAILY` | v0.1 | Default 2 |
| `UPDRAFT_SESSION_TOKEN_CAP_IN` | v0.1 | Default 200000 |
| `UPDRAFT_SESSION_TOKEN_CAP_OUT` | v0.1 | Default 50000 |
| `UPDRAFT_DAILY_PDF_CAP` | v0.1.5 | Default 30 — global daily cap on PDF conversions |
| `UPDRAFT_GOOGLE_SA_JSON_B64` | v0.1.5 | Base64-encoded Google service-account JSON for Drive API DOCX→PDF. When unset, Stage 04 still ships DOCX with a "PDF unavailable" banner (graceful degradation). |
| `UPDRAFT_SANDBOX_IMAGE_TAG` | v1.0 (if needed) | Pinned LibreOffice image tag — only used if v1.0 swaps from Drive API to Sandbox |

Reused from existing site config: `GEMINI_API_KEY`, `BREVO_API_KEY`, `MAIL_FROM_ADDRESS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `CHAT_IP_SALT`.

---

## 10. Repo layout (current, post-migration)

This folder lives in the repo at:

```
beau-portfolio/
└── skills/
    └── updraft/
        ├── README.md          (engineering handoff — load second)
        ├── SKILL.md           (orchestrator — load first)
        ├── PLAN.md            (this file — durable design + integration record)
        ├── DECISIONS.md       (append-only decision log)
        ├── CALIBRATION.md     (prompt tuning + parked-features list, fed into v0.5)
        ├── PRIVACY-COPY.md    (Beau-edited login privacy verbiage)
        └── references/
            ├── stage-01-intake.md
            ├── stage-02-target.md
            ├── stage-03-interview.md
            ├── stage-04-generate.md
            └── lib-*.md (8 files)
```

Implementation files (`src/app/updraft/*`, `src/lib/updraft/*`, `src/components/Updraft/*`, `scripts/setup-supabase-updraft*.sql`) ship in the Next.js tree as normal. The skill bundle stays self-contained at `skills/updraft/` so it can be versioned, audited, or extracted independently.

---

## 11. State of play

**v0.1.5 + first wave of v0.5 polish — SHIPPED.** v0.1.5 happy path verified end-to-end on 2026-05-06 (magic-link sign-in → MOD/Resume DOCX + PDF → privacy controls). The v0.5 wave landed across two sessions on 2026-05-06 → 2026-05-07:

- **Pi-egg reveal** — Operator Dashboard now exposes `OPEN_UPDRAFT [BETA]` alongside `OPEN_BLOG_EDITOR [ADMIN]`, so anyone who solves the Pi challenge gets a path to UpDraft. Tracked via `trackCTAClick('updraft_open', 'pi_dashboard')`.
- **Cover Letter generation** — Stage 02 picker accepts `cover_letter`; Stage 04 drafts a 4-paragraph CL via `SYS_COVER_LETTER_DRAFTER` (one Gemini hop), renders DOCX through the same Classic primitives, converts to PDF via Drive API. Failure to draft is non-blocking. Structured metadata (`hook_type`, `p3_branch`, `close_type`, `word_count`) persists to `stage_04.cover_letter_meta`.
- **Casing normalization** — `SYS_RESUME_PARSER` rules 8-11 normalize identity / company / title / location / institution / degree to natural casing while preserving acronyms + brand names. Skills + bullets explicitly excluded. Watch list in `CALIBRATION.md`.
- **Spaces preservation** — interview-objections textarea no longer trims/filters on every keystroke; consumers (cover-letter-generator, docx-builder, generate-summary seed) filter empties at consumption time.
- **Centralized retry + 24h failure visibility** — `lib/updraft/retry.ts` wraps Drive + Gemini calls with exponential backoff + jitter (3 attempts). Retries log `*_retry_recovered` / `*_retry_exhausted` events. `/api/updraft/status` aggregates `failures` over the last 24h so a single curl tells you the failure profile.
- **Stage 04 deliverable + format picker** — backend accepts optional `selection: UpdraftExportKind[]` body param; default behavior unchanged when absent. Frontend picker has DOCX + PDF checkboxes per available deliverable, All / None shortcuts, and a Regenerate ↻ button on DoneView that switches to a "defaults all unchecked" picker for partial regeneration.
- **Summary review at the top of Stage 04** — Stage 03 advance auto-drafts the executive summary in the background and lands the user on a Review-and-generate page; the summary is editable with autosave (800ms debounce, full-MOD PATCH) and a Regenerate ↻ button. Empty / failed-draft state is graceful — user can write or regenerate. Generate button refuses to fire on an empty summary.
- **Phased Stage 03 UX** — "Build your story" page split into 3 (or 2 in lightweight mode) explicit step blocks: Job history → Background → About you, each with a "STEP N OF 3" badge + step title + intro paragraph. Non-interactive progress strip at the top shows the full shape of the page.

The remaining v0.5 slice (pick by appetite — independent of each other):

1. **`SYS_MATCH_ANALYZER` prompt tuning** — ✅ **DONE.** Calibration harness + 49-pair corpus built, four scoring fixes landed (PR #6), and re-validated on `gemini-3.5-flash` 2026-06-12 (all fixes hold; see `CALIBRATION.md`). Open follow-up: seed one literal same-role pair to observe the DIRECT band fire in-corpus. The casing watch list still lives in `CALIBRATION.md` for future misses.
2. **Conversational Stage 03** — biggest remaining build. The spec calls for a Phase A-D conversation; current Stage 03 is form-editing with phased UX over the top. Parked deliverables in `CALIBRATION.md` § 'Stage 03 deferred features' (AI bullet rewriter, Phase C/D prompts, STAR extraction, tier branches) fold into this slice when picked up.

**Parked design changes:**
- **Target-JD seniority can downshift Audit voice** — for the case of someone senior in industry A pivoting to industry B at a junior level. Tier system computes seniority-only by design; today the user override is the escape valve, but a smarter version would let target-JD seniority pull voice down a notch independently. Real design change, deserves its own session.
