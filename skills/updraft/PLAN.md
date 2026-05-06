# UpDraft — Master Build Plan

**Status:** v0.1.5 shipped end-to-end (auth · 4 stages · DOCX + PDF · account · purge cron). Real-traffic verified 2026-05-06 with husband as second test account.
**Last updated:** 2026-05-06.

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
| 2 | AI provider: Gemini (`gemini-2.0-flash` default) | Matches existing AskBeau infra |
| 3 | PDF generation: Google Drive API (DOCX → Google Doc → PDF export). Sandbox + LibreOffice deferred to v1.0 if self-hosted scale demands it. | Free within Google's quotas, text-layer preserving, leverages existing Workspace |
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
| `summary-generator.ts` | SYS_SUMMARY_GENERATOR call (Stage 03 closing phase) |
| `lint.ts` | Phase 1 regex anti-pattern detection (8 categories). Phase 2 AI rewrite deferred to v0.5. |
| `docx-builder.ts` | DOCX builder using `docx` npm — Classic template / Regular density. `renderModDocx` + `renderResumeDocx`. |
| `pdf.ts` | Google Drive API DOCX→PDF behind a provider-agnostic `renderPdf()` interface (swappable to Sandbox/LibreOffice in v1.0). JWT auth via google-auth-library, access-token cached in module scope. |
| `filename.ts` | Spec-compliant export filename builder (`Lastname_Type_Role_Company_MonYYYY.ext`) |
| `data-export.ts` | GDPR/CCPA archive builder — user + sessions + events + exports w/ signed URLs |

Purge logic lives in the `/api/updraft/cron/purge` route directly rather than a `purge.ts` lib (small enough to inline cleanly).
| `quotas.ts` | Daily caps · per-IP buckets · owner bypass · kill switch |
| `purge.ts` | 30-day purge logic (called by cron) |
| `data-export.ts` | GDPR/CCPA archive builder |

### 3.5 Components (under `src/components/Updraft/`)

`Login.tsx` · `PrivacyCallout.tsx` (slot for Beau's verbiage) · `Stages/{Intake,Target,Interview,Generate}.tsx` · `AuditTurn.tsx` · `PromptForm.tsx` · `ConfirmGrid.tsx` · `Templates/` · `ExportPanel.tsx` · `QuotaBanner.tsx` · `BYOKModal.tsx` (v1.0) · `Account/{Sessions,DeleteMyData,DataExport}.tsx`.

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

## 4. PDF subsystem — Google Drive API

Originally locked as Vercel Sandbox + custom LibreOffice image; pivoted 2026-05-04 to Google Drive API after weighing the work-vs-value tradeoff. The Sandbox path is preserved as the v1.0 evolution if scale demands fully-owned infrastructure. See [`DECISIONS.md`](DECISIONS.md) entry of 2026-05-04 for the full alternatives-considered.

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

- **Default model:** `gemini-2.0-flash` (matches AskBeau).
- **Premium model:** `gemini-2.5-pro` reserved for cover-letter draft only if quality demands after testing (CL ships v0.5).
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
| **v1.0** "Complete" | All 4 templates × 3 densities (12) · ATS quarterly parsing tests · BYOK with safety harness · session resumption flow · active-MOD pointer + session history UI · re-tailoring flow (existing MOD + new JD → new resume, skip Stages 1–3) · **Vercel Sandbox + LibreOffice migration** if scale demands self-hosted PDF | Promote to MODULES card as `LIVE` |
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

**v0.1.5 has shipped.** Live on `beaudawson.com/updraft` (unlinked URL, share manually). Verified end-to-end with two test accounts (Beau + Ian) on 2026-05-06 — full happy path from magic-link sign-in through downloading both DOCX and PDF deliverables, plus exercising the privacy controls (keep flag, data export, delete-my-account cascade).

The next slice is whichever you pick from §8's v0.5 roadmap. The biggest wins for early-test traffic are probably:

1. **`SYS_MATCH_ANALYZER` prompt tuning** — see `CALIBRATION.md`. Beau is collecting a calibration corpus.
2. **Cover letter generation** — `SYS_COVER_LETTER_DRAFTER` already specced; lifts deliverables from MOD+Resume to MOD+Resume+CL.
3. **Pi-egg reveal** — quick ship, gets `/updraft` discoverable to Pi-challenge solvers.
4. **Conversational Stage 03** — bigger build, but it's where Audit's voice actually shows up properly. Currently Stage 03 is "edit a form"; the spec calls for a Phase A-D conversation.

All four are independent — pick by appetite, not order.
