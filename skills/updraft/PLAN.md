# UpDraft — Master Build Plan

**Status:** design locked. v0.1 implementation pending.
**Last updated:** 2026-05-03.

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
| 3 | PDF generation: Vercel Sandbox running LibreOffice in a custom image | Preserves DOCX text layer for ATS parsing |
| 4 | Storage: Supabase only (single source of truth across the site) | Reuses existing patterns + RLS |
| 5 | Auth: magic-link from day one (Resend) | No anonymous PII; no v1.5 migration |
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
                                  DOCX builder ──→ Vercel Sandbox (LibreOffice)
                                          │                 │
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
| `orchestrator.ts` | Stage state machine; reads `[DET]/[AI]/[AI+DET]` flags; routes to host UI vs AI call |
| `store.ts` | Supabase CRUD: users, sessions, events, exports |
| `auth.ts` | Magic-link issue/verify · session cookie · owner-secret bypass |
| `gemini.ts` | Model wrapper with explicit context caching for lib files |
| `parser.ts` | Resume PDF/DOCX → structured JSON (`pdf-parse` + `mammoth`) |
| `lint.ts` | Phase 1 regex (8 categories) + Phase 2 AI rewrite |
| `bullet.ts` | Bullet engineering toolkit (calls `lib-bullet-engineer.md`) |
| `confidence.ts` | 4-dim match scoring (calls `lib-confidence-rubric.md`) |
| `cover-letter.ts` | 4-paragraph CL drafting (calls `lib-cover-letter.md`) |
| `templates/` | DOCX templates × densities (calls `lib-templates.md`) |
| `docx.ts` | DOCX builder using `docx` npm package |
| `pdf.ts` | Vercel Sandbox driver behind a provider-agnostic interface |
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

## 4. Vercel Sandbox — PDF subsystem

### 4.1 Custom image

Base: Debian-slim. Pre-installed:
- `libreoffice-core`, `libreoffice-writer`
- Liberation fonts, DejaVu fonts, **Carlito** (Calibri-metric-compatible), **Croscore** (Arial-metric-compatible), Linux Libertine (Times-metric-compatible)
- LibreOffice user profile pre-warmed (skip first-run setup at runtime)

Build-time validation step:
1. Convert a known fixture DOCX (`fixtures/ats-fixture.docx`).
2. Parse the resulting PDF with `pdf-parse`.
3. Assert text layer contains expected strings ("Professional Experience", fixture name).
4. Assert font fidelity (Carlito present in the PDF font dictionary).

Image is tagged `updraft-pdf:<git-sha>` and pinned via `UPDRAFT_SANDBOX_IMAGE_TAG`. Roll-back is a one-line tag swap.

### 4.2 Driver interface

`lib/updraft/pdf.ts` exports a single function:

```ts
async function renderPdf(docxBytes: Buffer, options?: PdfRenderOptions): Promise<Buffer>
```

Implementation calls Sandbox; signature is provider-agnostic. Swappable to Fly Machines, Railway, CloudConvert, or self-hosted in <1 day.

### 4.3 Failure handling

- **Sandbox down or quota-burned:** fall back to DOCX-only with a banner — *"PDF unavailable. Your DOCX is ATS-safe and parses identically."*
- **Single-flight lock per session** prevents double-billing on rapid clicks.
- **Cold start (5–15s):** pre-warm at Stage 04 entry, hide behind "rendering PDF" spinner.

### 4.4 Risks (acknowledged)

1. New product (GA Jan 2026); pricing/API may shift. Mitigation: provider-agnostic interface (§4.2).
2. Active CPU pricing scales linearly with concurrency. Mitigation: hard daily Sandbox-invocation cap.
3. No baked LibreOffice. Solved by custom image (§4.1).
4. Concurrency quota plan-dependent. Mitigation: single-flight lock per session.

---

## 5. Cost guardrails

### 5.1 Three-layer kill switch (cheapest layer wins, evaluated in order)

1. **Per-session token cap.** Hard ceiling on input + output tokens per session. Defaults: 200K in, 50K out. Exceeded mid-session → pause + offer BYOK (v1.0+) or "come back tomorrow."
2. **Per-IP daily cap.** N sessions/day per hashed IP via existing `rate_limits` table. Default 2.
3. **Global daily kill switch.** `updraft_quota_daily` row tracks total tokens, Sandbox invocations, PDFs. When over: `/updraft` lands on a "closed for the day" page. Resets at midnight Central.

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

`/api/updraft/status` (CRON_SECRET-gated): single curl returns today's burn — sessions, tokens, Sandbox invocations, PDFs — with no secrets in response. First stop when something looks off.

### 5.5 BYOK (v1.0)

Bring-your-own Gemini key. Held in `sessionStorage` only, sent per-request as `X-Updraft-User-Key` header, server forwards to Gemini and discards. No persistence, no logging, redacted in error paths. Event log records `{byok: true}`, never the key itself.

---

## 6. Gemini strategy

- **Default model:** `gemini-2.0-flash` (matches AskBeau).
- **Premium model:** `gemini-2.5-pro` reserved for cover-letter draft only if quality demands after testing.
- **Structured output:** every `[AI]` step uses `response_mime_type: application/json` + `response_schema` matching the spec's per-stage JSON contract. Schema-enforced output reduces parse-retry churn.
- **Context caching:** explicit Gemini cache for the lib files (`lib-audit-voice.md`, `lib-system-prompts.md`, `lib-bullet-engineer.md`, `lib-anti-patterns.md`, `lib-output-contract.md`) at TTL ~1 hour. Biggest cost lever — these are loaded across most calls.
- **Voice:** every user-facing AI call gets `lib-audit-voice.md` as system addendum + active `SYS_*` prompt. Silent extraction calls (parse, score, lint rewrite) skip the voice file per spec.
- **Retry policy:** on malformed JSON, retry once with stricter schema reminder. Second fail surfaces error UI per spec's failure modes.

---

## 7. Auth + privacy posture

### 7.1 Magic-link flow

1. User enters email at `/updraft/login`.
2. Server issues HMAC token (15-min single-use) → emails magic link via Resend.
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
| **v0.1** "Vertical slice" | Magic-link auth · Path A only · Tier 2 only · MOD + Resume (no CL) · 1 template × 1 density (Classic) · DOCX-only export · Lint Phase 1 (regex) · per-IP + global kill switch · 30-day purge cron · delete-my-data · data-export | Unlinked URL — share manually |
| **v0.5** "Make it good" | Path B added · all 4 tiers · Cover Letter · Lint Phase 2 (AI) · Vercel Sandbox PDF live with custom LibreOffice image · daily caps tuned to real traffic · keep-this-session flag · **`SYS_MATCH_ANALYZER` prompt tuning** (see [`CALIBRATION.md`](CALIBRATION.md)) | Pi-egg reveal |
| **v1.0** "Complete" | All 4 templates × 3 densities (12) · ATS quarterly parsing tests · BYOK with safety harness · session resumption flow · active-MOD pointer + session history UI | Promote to MODULES card as `LIVE` |
| **v1.5** "Reusable" | Re-tailoring flow (existing MOD + new JD → new resume, skip Stages 1–3) · refined account UX | MODULES card |
| **v2.0+** | Portfolio-site generator (Tier 4) · multi-language (Spanish first) · recruiter-perspective scoring | MODULES card |

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
| `UPDRAFT_DAILY_PDF_CAP` | v0.5 | Default 30 |
| `UPDRAFT_PER_IP_DAILY` | v0.1 | Default 2 |
| `UPDRAFT_SESSION_TOKEN_CAP_IN` | v0.1 | Default 200000 |
| `UPDRAFT_SESSION_TOKEN_CAP_OUT` | v0.1 | Default 50000 |
| `UPDRAFT_SANDBOX_IMAGE_TAG` | v0.5 | Pinned LibreOffice image tag |

Reused from existing site config: `GEMINI_API_KEY`, `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `CHAT_IP_SALT`.

---

## 10. Repo layout when migrated in

When v0.1 is ready to start coding, this folder moves into the repo at:

```
beau-portfolio/
└── skills/
    └── updraft/
        ├── README.md
        ├── SKILL.md
        ├── PLAN.md
        ├── DECISIONS.md
        └── references/
            ├── stage-01-intake.md
            ├── stage-02-target.md
            ├── stage-03-interview.md
            ├── stage-04-generate.md
            └── lib-*.md (8 files)
```

Implementation files (`src/app/updraft/*`, `src/lib/updraft/*`, `src/components/Updraft/*`, `scripts/setup-supabase-updraft.sql`) ship in the Next.js tree as normal. The skill bundle stays self-contained at `skills/updraft/` so it can be versioned, audited, or extracted independently.

---

## 11. Open questions

None at this stage. v0.1 implementation can begin once:

1. This folder migrates into the repo.
2. The Supabase migration runs.
3. The new env vars are set in Vercel.
4. Beau provides final verbiage for the privacy callout.
