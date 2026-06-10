# CLAUDE.md — AI Coding Assistant Context

Context for AI coding assistants working on this codebase.

---

## GitHub hygiene — Level 1 priority

GitHub state is yours to maintain. Treat it as **Level 1 attention** — same priority as not breaking the build. The repo must be in pristine order at all times when you are making changes, regardless of size or type of change.

### Canonical local working copy

The single source of truth on this machine is **`~/Desktop/beau-portfolio`**. There is no other authoritative local clone — if you find one elsewhere, surface it; do not silently work in it. Future Claude Code sessions should be launched from `~/Desktop/beau-portfolio` so the working copy, `git push` target, and your project memory all align.

### At session start

- Run `git status` and `git log --oneline -10` before any work begins.
- Confirm branch, working tree state, and how recent commits relate to today's task.
- Surface anything unexpected (uncommitted changes, divergent branch, stale lockfile, untracked files) **before** proceeding. Never silently work around an unclean state.

### At session end

- Working tree must be clean — `git status` returns nothing uncommitted unless the user has explicitly parked it.
- All work lives in commits with accurate, descriptive messages.
- Re-run `git status` before declaring a task complete.
- If push was authorized for this task, push; otherwise leave commits local and tell the user they need to push.

### Every change is logged

- **Any code change — any size, any type — gets a commit.** No exceptions, no batch dumps.
- Group commits by logical unit: one feature, one fix, one doc update per commit. Don't mix refactors with feature work in a single commit.
- Commit messages follow the existing repo style (`git log` to check). Lead with the *why*, not just the *what*.
- Never skip hooks (`--no-verify`) or skip signing without explicit user permission.
- Never `git push --force` to `main` or amend a published commit without explicit user permission.

### What pristine looks like

- `git status` returns clean.
- `git log` reads as a coherent story of what changed and why.
- No "WIP" / "fixup" / "stash this for later" commits in `main`-bound history.
- Branch names match the work (`claude/<slug>` for assistant branches; descriptive for human branches).
- The remote reflects local state (or the user has been told what's left to push).

### When something on GitHub looks off

Stop and ask. Do not delete branches, force-push, or `reset --hard` to "fix" surprising state. Investigate first — it may be the user's in-progress work or a teammate's branch.

---

## Project Overview

**Beau Dawson Portfolio** — site for an Operations Director, Systems Builder, and AI Architect. Clean dark theme, substance-first, no theatrical effects.

**Stack:** Next.js 16.2 + React 19 + TypeScript 5 + Tailwind CSS 4 + Framer Motion 12
**Hosting:** Vercel (auto-deploy on push to `main`)
**Live:** beaudawson.com
**Repo:** github.com/beaudawson83/beau-portfolio

---

## Page Flow (`src/app/page.tsx`)

```
Header          Fixed nav: name, "Operations + AI", availability
Hero            Name, trifecta positioning, proof line, CTAs, headshot, AskBeau
TelemetryGrid   8 metrics, 4x2 grid, animated count-up
CaseStudies     Expedia, Union, BAD Labs — problem → built → results
BadLabsShowcase Current venture: Console CRM, AI tooling, fractional leadership
Modules         Owned-systems control panel: Conflict + Notes cards w/ live telemetry
SystemKernel    4-column tools/platforms grid
Timeline        Collapsible full career history (CSS-only)
Footer          Contact form + social links
PiEasterEgg     Hidden — click π in footer corner
```

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                       # Main composition
│   ├── layout.tsx                     # Fonts, metadata, GA bootstrap
│   ├── globals.css                    # Theme tokens
│   ├── global-conflict/page.tsx       # Hidden /global-conflict page
│   ├── blog/
│   │   ├── layout.tsx                 # tn-shell wrapper, theme cookie, Source Serif font
│   │   ├── blog.css                   # Terminal Notebook tokens (scoped to .tn-shell)
│   │   ├── page.tsx                   # /blog index (server, ISR 15m)
│   │   ├── [slug]/page.tsx            # /blog/[slug] article (server, ISR 15m)
│   │   └── edit/                      # Editor (client, BLOG_EDITOR_SECRET-gated)
│   │       ├── page.tsx               # Drafts list
│   │       ├── new/page.tsx           # Create + redirect
│   │       └── [slug]/page.tsx        # The editor
│   ├── updraft/                       # UpDraft v0.1.5 — auth-gated, unlinked
│   │   ├── login/page.tsx             # Magic-link request + privacy callout
│   │   ├── auth/callback/route.ts     # (also under api/)
│   │   ├── account/page.tsx           # Sessions · keep flags · data export · delete
│   │   ├── page.tsx                   # Auth-gated dashboard (session list)
│   │   └── [sessionId]/page.tsx       # Stage runner (dispatches Stage 01/02/03/04)
│   └── api/
│       ├── ask-beau/route.ts          # Gemini chatbot, rate-limited
│       ├── contact/route.ts           # Transactional email (Brevo), rate-limited, HTML-escaped
│       ├── global-conflict/route.ts   # Public payload, ISR 15m
│       ├── global-conflict/news/route.ts  # Per-conflict timeline
│       ├── conflict/status/route.ts   # Diagnostic, CRON_SECRET-gated
│       ├── blog/admin/auth/route.ts   # BLOG_EDITOR_SECRET probe
│       ├── blog/posts/route.ts        # GET (list) + POST (create) — Bearer-gated
│       ├── blog/posts/[slug]/route.ts # GET + PATCH + DELETE — Bearer-gated
│       ├── blog/media/sign/route.ts   # Signed upload URL → blog-media bucket
│       ├── pi-challenge/{issue,validate}/route.ts
│       └── updraft/                   # All UpDraft endpoints — see API Routes table
│           ├── auth/{issue,callback,logout}/route.ts
│           ├── me/{route,delete,data-export}/route.ts
│           ├── status/route.ts
│           ├── cron/purge/route.ts
│           └── sessions/{route,[id]/{route,keep,parse-upload,match-analyze,generate-summary,generate-files,exports/[exportId],stage/[n]}}/route.ts
├── components/
│   ├── Header.tsx, Hero.tsx, AskBeau.tsx
│   ├── TelemetryGrid.tsx, CaseStudies.tsx, BadLabsShowcase.tsx
│   ├── Modules/                       # Owned-systems control panel
│   ├── SystemKernel.tsx, Timeline.tsx, Footer.tsx
│   ├── GlitchText.tsx, TerminalAnimation.tsx (used by Pi egg)
│   ├── GoogleAnalytics.tsx, AnalyticsProvider.tsx
│   ├── GlobalConflict/                # Map, stats, journal UI
│   ├── PiEasterEgg/                   # Hidden interactive feature
│   ├── Blog/                          # Terminal Notebook reader + builder
│   │   ├── Topbar.tsx, ThemeToggle.tsx
│   │   ├── blocks/Blocks.tsx          # All 17 read-mode blocks + TOC + ReadingProgress
│   │   ├── Reader/{IndexView,ArticleView}.tsx
│   │   └── Builder/                   # Editor + slash menu + cmd+K + sidebar + modals
│   ├── Updraft/                       # UpDraft UI
│   │   ├── LoginForm.tsx, PrivacyCallout.tsx, Dashboard.tsx
│   │   ├── Stage01/Stage01Runner.tsx  # Path picker + upload + identity + tier
│   │   ├── Stage02/Stage02Runner.tsx  # Deliverable picker + target + match briefing
│   │   ├── Stage03/Stage03Runner.tsx  # Editable MOD + tier-2 deepening + summary
│   │   ├── Stage04/Stage04Runner.tsx  # Generate + DOCX/PDF download cards + lint
│   │   └── Account/AccountPanel.tsx   # Sessions / data export / delete-my-data
│   └── ui/                            # EnergyButton, Button, Skeleton
├── lib/
│   ├── data.ts                        # All portfolio content (single source of truth)
│   ├── analytics.ts                   # GA4 event helpers
│   ├── supabase.ts                    # Shared Supabase client + env resolution
│   ├── email.ts                       # Brevo transactional email (contact form + UpDraft auth)
│   ├── chat-log.ts                    # AI-chat conversation logging
│   ├── rate-limit.ts                  # Per-IP rate-limit RPC wrapper
│   ├── conflict-data.ts               # Conflict types + read entry point
│   ├── conflict-store.ts              # Conflict Supabase read layer (read-only)
│   ├── cron-auth.ts                   # Bearer-token verifier (CRON_SECRET)
│   ├── blog-data.ts                   # Blog read entrypoints (published only / any-status)
│   ├── blog-store.ts                  # Blog Supabase CRUD (reads + writes)
│   ├── blog-auth.ts                   # Bearer-token verifier (BLOG_EDITOR_SECRET)
│   ├── blog-utils.ts                  # Block helpers (word count, headings, slugify)
│   ├── blog-media.ts                  # Signed-upload-URL helper for blog-media bucket
│   ├── module-telemetry.ts            # Reads Conflict + Blog stats for the homepage MODULES section
│   ├── pi-challenge/                  # HMAC token + challenges
│   └── updraft/                       # 17 files — auth, store, storage, gemini, parser,
│                                       # tier, match-analyzer, summary-generator,
│                                       # cover-letter-generator, lint, docx-builder,
│                                       # pdf (Drive API), retry (transient backoff
│                                       # for Drive + Gemini), filename, quotas,
│                                       # data-export, skill-files. See skills/updraft/PLAN.md §3.4
├── hooks/useTrackSection.ts
├── types/index.ts                     # All portfolio types
└── proxy.ts                           # Security headers + CSP (Next 16 middleware)
```

---

## Conventions

1. **Content lives in `src/lib/data.ts`** — never hardcode in components.
2. **Types in `src/types/index.ts`** — single file, no submodule sprawl.
3. **Minimal animation** — fade-in on scroll via Framer Motion. No particles / glitch / 3D / scroll hijacking.
4. **Framer Motion for animation, not CSS** — exception: Timeline (server component, CSS-only).
5. **Tailwind for styling** — inline classes, no CSS modules.
6. **Dark theme only** — `#111111` page, `#1A1A1A` surface, `#2A2A2A` border, `#7C3AED` accent, white / `#94A3B8` text.

---

## API Routes

| Route                       | Method | Purpose                  | Auth / Rate                    |
|-----------------------------|--------|--------------------------|--------------------------------|
| `/api/ask-beau`             | POST   | AI chatbot (Gemini 3.5)  | Rate: 20/hr per IP             |
| `/api/contact`              | POST   | Contact form (Brevo)     | Rate: 5/hr per IP, HTML-escaped|
| `/api/global-conflict`      | GET    | Conflict payload         | ISR 15m                        |
| `/api/global-conflict/news` | GET    | Per-conflict timeline    | Cursor pagination              |
| `/api/conflict/status`      | GET    | Diagnostic heartbeat     | `Bearer $CRON_SECRET`          |
| `/api/blog/admin/auth`      | POST   | Editor-secret probe      | `Bearer $BLOG_EDITOR_SECRET`   |
| `/api/blog/posts`           | GET    | List posts (admin sees drafts) | Optional `Bearer $BLOG_EDITOR_SECRET` |
| `/api/blog/posts`           | POST   | Create draft             | `Bearer $BLOG_EDITOR_SECRET`   |
| `/api/blog/posts/[slug]`    | GET    | Read post (admin any status) | Optional Bearer            |
| `/api/blog/posts/[slug]`    | PATCH  | Update post + status     | `Bearer $BLOG_EDITOR_SECRET`   |
| `/api/blog/posts/[slug]`    | DELETE | Delete post              | `Bearer $BLOG_EDITOR_SECRET`   |
| `/api/blog/media/sign`      | POST   | One-shot signed upload URL for blog-media bucket | `Bearer $BLOG_EDITOR_SECRET` |
| `/api/blog/categories`      | GET    | Distinct categories (admin sees drafts) | Optional Bearer            |
| `/api/pi-challenge/issue`   | POST   | Issue HMAC challenge     | —                              |
| `/api/pi-challenge/validate`| POST   | Validate response        | —                              |
| **UpDraft v0.1.5 (auth + sessions + stages + account + cron):** | | | |
| `/api/updraft/auth/issue`   | POST   | Issue magic-link email   | Rate: 10/hr per IP             |
| `/api/updraft/auth/callback`| GET    | Verify magic-link, set session cookie | one-shot HMAC token |
| `/api/updraft/auth/logout`  | POST   | Clear session cookie     | session cookie                 |
| `/api/updraft/me`           | GET    | Current user info        | session cookie                 |
| `/api/updraft/me/data-export` | GET  | JSON archive (GDPR portability) | session cookie         |
| `/api/updraft/me/delete`    | POST   | Cascade-delete account + storage | session cookie + email confirm |
| `/api/updraft/sessions`     | POST   | Create new session       | session cookie + quota         |
| `/api/updraft/sessions/[id]`| GET/DELETE | Read or delete session | cookie + ownership          |
| `/api/updraft/sessions/[id]/parse-upload` | POST | Stage 01 — multipart upload, parse via Gemini, persist | cookie + ownership + AI quota |
| `/api/updraft/sessions/[id]/match-analyze` | POST | Stage 02 — `SYS_MATCH_ANALYZER` + target metadata | cookie + ownership + AI quota |
| `/api/updraft/sessions/[id]/generate-summary` | POST | Stage 03 — `SYS_SUMMARY_GENERATOR` | cookie + ownership + AI quota |
| `/api/updraft/sessions/[id]/generate-files` | POST | Stage 04 — render selected DOCX/PDF kinds (optional `selection: UpdraftExportKind[]` body scopes the round; default = all from stage_02 deliverables), draft CL via `SYS_COVER_LETTER_DRAFTER` if any CL kind selected, lint MOD, persist exports. PDFs auto-retry on transient Drive errors (3 attempts, exponential backoff). | cookie + ownership + AI quota |
| `/api/updraft/sessions/[id]/exports/[exportId]` | GET | 302-redirect to 10-min signed Storage URL | cookie + ownership |
| `/api/updraft/sessions/[id]/stage/[n]` | PATCH | Merge-patch stage_outputs.{stage_NN} | cookie + ownership |
| `/api/updraft/sessions/[id]/keep` | PATCH | Toggle keep-indefinitely flag | cookie + ownership |
| `/api/updraft/status`       | GET    | Diagnostic — today's quota burn + env presence map + 24h failure counts (`pdf_failed`, `pdf_retry_recovered`, `pdf_retry_exhausted`, `cover_letter_failed`, `summary_failed`, `export_failed`) aggregated from `updraft_events` | `Bearer $CRON_SECRET` |
| `/api/updraft/cron/purge`   | GET/POST | 30-day inactivity purge | `Bearer $CRON_SECRET` (Vercel Cron supplies) |

---

## Environment Variables

| Variable                          | Required | Purpose                                |
|-----------------------------------|----------|----------------------------------------|
| `GEMINI_API_KEY`                  | Yes      | AskBeau chatbot + UpDraft              |
| `GEMINI_MODEL`                    | No       | AskBeau model override. Defaults to `gemini-3.5-flash`. Bump here when Google retires the default — no deploy needed. |
| `BREVO_API_KEY`                   | Yes      | Transactional email (contact form + UpDraft magic links). Replaced `RESEND_API_KEY` on 2026-05-04 — Resend's free tier sandboxed `onboarding@resend.dev` to the account-owner inbox only, which broke magic-link sends to anyone but Beau. Brevo's free tier supports domain verification at 300 sends/day. |
| `MAIL_FROM_ADDRESS`               | Yes      | From-address for transactional email. Format: `"UpDraft <noreply@mail.beaudawson.com>"` or just the email. Domain must be verified on Brevo (one-time DNS work — SPF + DKIM TXT records). |
| `UPDRAFT_GOOGLE_SA_JSON_B64`      | No       | Base64-encoded service-account JSON for the dedicated `Updraft` (id `updraft0526`) GCP project. Drive API converts DOCX→PDF for Stage 04 exports via Google Docs as the intermediate format (text-layer preserving). When unset, Stage 04 still ships the DOCX and surfaces a "PDF unavailable" banner per spec § 4.5 graceful degradation. Service account scope: `drive.file` (per-file access only). See `skills/updraft/DECISIONS.md` 2026-05-04 entry for setup. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | Yes      | GA4 (no fallback — required for tracking) |
| `SUPABASE_URL`                    | Yes      | All Supabase reads/writes              |
| `SUPABASE_ANON_KEY`               | Yes      | Anon Supabase client                   |
| `SUPABASE_SERVICE_ROLE_KEY`       | Yes      | Server-only Supabase ops               |
| `CHAT_IP_SALT`                    | Yes      | IP hashing for chat logs + rate limits |
| `CRON_SECRET`                     | Yes      | Gates `/api/conflict/status`           |
| `PI_CHALLENGE_SECRET`             | Yes      | Pi easter egg HMAC tokens              |
| `BLOG_EDITOR_SECRET`              | Yes      | Gates all `/api/blog/posts*` writes + the editor UI |

Supabase env-name resolution in [`src/lib/supabase.ts`](src/lib/supabase.ts) follows priority:
`BEAU_SUPABASE_*` → Marketplace native (`SUPABASE_URL` / `*_SECRET_KEY` / `*_PUBLISHABLE_KEY`) → legacy (`NEXT_PUBLIC_SUPABASE_URL` / `*_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`).
Use `BEAU_*` if the Vercel Marketplace integration ever gets reattached and starts overwriting unprefixed names — those are app-owned and the Marketplace can't touch them.

Vercel marks all env vars as Sensitive on creation, so values are never visible after save. Use `/api/conflict/status` (with `CRON_SECRET`) to verify Supabase env state at runtime without exposing secrets.

---

## Ask Beau AI Chatbot

`/api/ask-beau` uses Gemini 3.5 Flash (default — override with `GEMINI_MODEL`) with a detailed system prompt containing professional + personal facts, conversation handling rules, and deterministic fallbacks. Gemini 2.0 Flash was retired by Google on 2026-06-01 — when a model dies, every call fails and the route serves keyword-routed fallbacks; bump `GEMINI_MODEL` in Vercel to recover without a deploy. The system prompt is the single source of truth for chatbot personality — edit in [`src/app/api/ask-beau/route.ts`](src/app/api/ask-beau/route.ts). Two intentional behaviors (2026-06-10, per Beau): answer the *literal* question first (no deflecting personal questions into resume material), and a **hard scope lock** — the bot never answers non-Beau questions (math, trivia, code, current events), not even approximately; it spins the topic back to Beau and points at the contact form.

Conversations are logged to Supabase (`chat_conversations`) via [`src/lib/chat-log.ts`](src/lib/chat-log.ts). To view them, use the Supabase dashboard's table editor (no in-app admin UI).

---

## Blog (Terminal Notebook) — LIVE

Live at `/blog` and `/blog/[slug]`, surfaced publicly via the homepage `MODULES` section. `robots: noindex` is still set in [`src/app/blog/layout.tsx`](src/app/blog/layout.tsx) — flip that to `index: true` once the index/article pages are tuned for SEO.

The Terminal Notebook design (handed off from Claude Design) uses its own dark-purple palette (`#0e0c14` background, `#a855f7` accent) scoped under `.tn-shell` so it doesn't leak into the rest of the site. Light theme is supported via a topbar toggle and persisted in a `tn-theme` cookie (read in [`src/app/blog/layout.tsx`](src/app/blog/layout.tsx) for SSR-safe initial render).

### Read path

- **`/blog`** — directory-listing index with category filter (OPS / AI / CRAFT / NOTE) and title search. Server component, ISR 15m via [`getPublishedPosts()`](src/lib/blog-data.ts). Empty state when no posts are published.
- **`/blog/[slug]`** — full article: cover band, title, dek, tag chips, 3-column layout (TOC w/ scrollspy | content | meta + share sidebar), reading-progress bar, prev/next footer derived from publish order. 404 for unpublished or future-dated.

### Write path (builder)

- **`/blog/edit`** — drafts/posts grid + "+ new draft" button.
- **`/blog/edit/new`** — POSTs a fresh draft with a placeholder slug, redirects to `/blog/edit/[slug]`.
- **`/blog/edit/[slug]`** — Notion-style block editor: slash menu (`/`), floating text-format toolbar on selection, drag-reorder handles, autosave (800ms debounce), ⌘K command palette, right sidebar (slug / status / category / tags / cover / SEO + SERP preview / stats), publish modal (publish / schedule / draft).

The editor is gated client-side by `<AuthGate>`: prompts for `BLOG_EDITOR_SECRET` once per browser, stores in `localStorage`, sends as `Authorization: Bearer …` on every API call. A bad/missing secret clears the cache and re-prompts. Server-side, every write endpoint also re-verifies via [`isBlogEditorAuthorized()`](src/lib/blog-auth.ts) — there is no path to write without the env-var match.

### Block model

A post body is a `BlogBlock[]` stored as a single jsonb column. 17 block types: text (h1/h2/h3/p, ul/ol, pullquote, callout, divider), media (image, gallery, video, audio), rich (code, table, chart, wordart, embed/tweet, button, twocol). Inline editing is supported for text/heading/list/pullquote/callout/code/image-caption/wordart-text. Other rich blocks render with sample content; v2 will add edit modals for table/chart/embed data.

### Categories

User-defined free-form text. The four legacy seeds (`OPS`, `AI`, `CRAFT`, `NOTE`) live in `CATEGORY_SUGGESTIONS` so the editor dropdown isn't empty on a fresh install, but any non-empty string is accepted at the API + storage boundary. [`normalizeCategory()`](src/lib/blog-utils.ts) handles the cleanup (trim, uppercase, ≤32 chars, strip control chars) before the value hits Supabase.

Word count + read time are computed server-side on every PATCH via [`computeWordCount()`](src/lib/blog-utils.ts) so the displayed values stay authoritative.

### Image handling

- **Cover**: 4 preset gradient covers (`cover-mesh`, `cover-grid`, `cover-stripe`, `none`) plus a `cover-photo` mode that accepts either a pasted URL or a direct upload to Supabase Storage. Recommended dimensions surfaced in the editor: 1600 × 400 (4:1 banner).
- **Content images**: paste-URL or upload via the image block. Falls back to a striped placeholder when no URL is set.
- **Upload pipeline**: `POST /api/blog/media/sign` returns a one-shot signed upload URL; the file flows browser → Supabase Storage (bucket `blog-media`, public read), bypassing Vercel's 4.5 MB function-body limit. Server validates content-type allowlist (image/jpeg, png, webp, gif) and 10 MB size cap. Set up via [`scripts/setup-supabase-blog-storage.sql`](scripts/setup-supabase-blog-storage.sql).
- **Audio / video**: URL-only for now (paste a YouTube/Vimeo URL for video). Direct upload of media is a deferred v2 feature given the cost/storage profile.

### Tables

```
blog_posts — single table; body is a jsonb BlogBlock[]; status is draft/scheduled/published
```

Schema: [`scripts/setup-supabase-blog.sql`](scripts/setup-supabase-blog.sql) (idempotent). RLS enforces `status='published' AND publish_at <= now()` for the anon role; service-role (used by all server reads/writes) bypasses RLS, with application-level filters reproducing the same constraint for the public read path.

---

## Global Conflict Index — LIVE

Live at `/global-conflict`, surfaced publicly via the homepage `MODULES` section. `robots: noindex` for now — flip when the experience is hardened.

A sober data-journalism module: real TopoJSON world map (countries tinted red by intensity), animated stat row, hotspot markers, wire feed. Click any hotspot → news section becomes that conflict's full journal timeline (paginated, all-time history).

### Data flow

- **Daily 7am Central** — a Claude Code Routine (claude.ai/code/routines) runs Claude Opus 4.7 with `web_search` + `bash` tools, researches every active conflict per the actor taxonomy, collects last-24h headlines, and writes **directly** to Supabase via PostgREST using the project's service-role key. The Routine bypasses the app entirely — there is no `/api/conflict/ingest` endpoint anymore.
- **At request time** — `/global-conflict` server-renders by reading Supabase via `getConflictData()` → latest snapshot, active hotspots, last-24h news, all actors. Empty state if Supabase is dry.

The Routine prompt enforces a multi-pass identification protocol with the full taxonomy: territory / principal / direct / basing / sponsor / supplier / proxy / mediator. Combat-tier roles (territory / principal / direct / basing) accept any plausible https URL; support-tier roles (sponsor / supplier / proxy) require a host on the reputable allowlist (Reuters / AP / BBC / Crisis Group / UN / state.gov / etc.).

**Per-conflict narrative fields** (`displaced_7d`, `summary`, `resolution_outlook`) were added to `conflict_hotspots` in the May 2026 UI pass. The Routine should populate them for each active hotspot:

- `displaced_7d` (integer): people newly displaced from this specific conflict in the last 7 days. Defaults to 0 — UI shows `—` until populated.
- `summary` (text, nullable): 1–2 sentence narrative summary written by the agent. Example: *"Complicated dispute between several factions relating to land, religion, and water resources."*
- `resolution_outlook` (text, nullable): short note on resolution prospects. Example: *"There is no expected resolution documented at this time."*

Until the Routine prompt is updated to populate them, the detail panel renders empty-state placeholders ("Not yet documented." / "There is no expected resolution documented at this time.").

### Supabase project

Single user-managed project: **`ygvhoocbvraiplzmgufa`** (https://ygvhoocbvraiplzmgufa.supabase.co). **Do not** use the Vercel Marketplace Supabase integration — it provisions a separate ghost project and silently auto-syncs env vars to it. The Marketplace integration was disconnected 2026-05-01.

### Tables (in `ygvhoocbvraiplzmgufa`)

```
conflict_hotspots    territory + intensity + casualties + iso codes + displaced_7d + summary + resolution_outlook
conflict_news        URL-deduped journal (append-only)
conflict_snapshots   time series of global stats
conflict_actors      (conflict_id, country_iso, role, confidence, sources jsonb)
chat_conversations   AskBeau session logs
rate_limits          per-IP-hash bucket store
```

Conflict schema: [`scripts/setup-supabase-conflict.sql`](scripts/setup-supabase-conflict.sql) (idempotent). RLS: anon read, service-role write.

### Diagnostic endpoint — first stop when something looks off

```
curl -H "Authorization: Bearer $CRON_SECRET" https://beaudawson.com/api/conflict/status
```

Returns:
- which env-name family resolved at runtime (`BEAU_*` / `marketplace-native` / `legacy`)
- key formats detected (`legacy-jwt` / `new-opaque`)
- per-table row counts
- latest snapshot timestamp + total
- latest news ingest
- active hotspot count

No secrets in the response. Single curl tells you the entire pipeline state.

### Routine env (separate from Vercel)

Each Claude Code Routine has its own Environment. The Routine and Vercel must point at the **same project**:
- `SUPABASE_URL` → `https://ygvhoocbvraiplzmgufa.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` → service-role JWT

The Routine prompt's first command decodes the JWT to print the project ref — use that to verify parity.

### One-time setup (or recovery)

1. Create / use a Supabase project (skip the Vercel Marketplace).
2. Run [`scripts/setup-supabase-conflict.sql`](scripts/setup-supabase-conflict.sql) in the SQL editor.
3. Set Vercel env vars above.
4. Create a Routine at claude.ai/code/routines: schedule daily 7am Central, add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to its Environment, paste the prompt.
5. Run the Routine manually once to seed Supabase.
6. Verify via `/api/conflict/status` — `sourceOfUrl` resolves cleanly, row counts > 0, `latestSnapshot.capturedAt` is recent.

### Files

- [`src/lib/conflict-data.ts`](src/lib/conflict-data.ts) — types + `getConflictData()` + `EMPTY_PAYLOAD`
- [`src/lib/conflict-store.ts`](src/lib/conflict-store.ts) — Supabase read layer (read-only; writes happen out-of-process via the Routine)
- [`src/lib/supabase.ts`](src/lib/supabase.ts) — shared Supabase client factory + env resolution
- [`src/lib/cron-auth.ts`](src/lib/cron-auth.ts) — bearer-token verifier (`timingSafeEqual`)
- [`src/app/global-conflict/page.tsx`](src/app/global-conflict/page.tsx) — server component, ISR 15m, empty-state on dry DB
- [`src/app/api/global-conflict/route.ts`](src/app/api/global-conflict/route.ts) — public payload
- [`src/app/api/global-conflict/news/route.ts`](src/app/api/global-conflict/news/route.ts) — per-conflict timeline w/ cursor
- [`src/app/api/conflict/status/route.ts`](src/app/api/conflict/status/route.ts) — diagnostic heartbeat
- [`src/components/GlobalConflict/`](src/components/GlobalConflict/) — UI: map, stats, timeline, detail panel
- [`public/countries-110m.json`](public/countries-110m.json) — world-atlas TopoJSON (105 KB)
- [`scripts/setup-supabase-conflict.sql`](scripts/setup-supabase-conflict.sql) — idempotent migration

### Validation

Validation is **shape-only** at the database boundary (RLS + constraints + the `(conflict_id, country_iso, role)` unique index). The Routine's prompt does the journalistic discipline. The methodology footer is honest about this — it's "agentic, LLM-assisted" journalism, not a primary-source dataset.

### Future phases (parked)

Phase 2: cross-prompt audit. Phase 3: ACLED/UCDP/SIPRI reconciliation. Phase 4: map UI layers (territory / belligerents / sponsors).

---

## UpDraft — v0.1.5 LIVE (unlinked URL)

A resume + cover-letter generation tool operated by an AI character named **Audit**. 4-stage flow (intake → target → interview → generate) producing three deliverables in any combination: Master Overview Document (MOD), JD-tailored Resume, Cover Letter. Outputs DOCX + PDF (Markdown for MOD ships v0.5+). ATS-safe single-column templates.

**Status:** v0.1.5 + first wave of v0.5 polish — SHIPPED. v0.1.5 verified end-to-end on 2026-05-06 with two test accounts. v0.5 wave landed 2026-05-06 → 2026-05-07: Pi-egg reveal in the Operator Dashboard, Cover Letter generation via `SYS_COVER_LETTER_DRAFTER`, casing rules in the resume parser, spaces-bug fix in the interview-objections textarea, **centralized retry + 24h failure visibility** at the Drive + Gemini boundaries, **per-deliverable + per-format picker** in Stage 04 (with Regenerate ↻), **summary review at the top of Stage 04** (auto-drafts on Stage 03 advance, autosave + regenerate before Generate), and a **phased Stage 03 UX** with a step-strip + 3 grouped blocks. Lives at unlinked `/updraft` URL. MODULES card promotion still gated to v1.0.

**Architecture is "skill-as-orchestrator":** the host program (this Next.js app) owns UI, state, file generation, and the regex anti-pattern lint pass. The AI model (Gemini 3.5 Flash) owns parsing, voice, bullet rewriting, scoring, and CL drafting. Backend is the source of truth — conversation history is intentionally not preserved across stages; only structured stage outputs persist.

**Auth + privacy:** magic-link login (Brevo delivery — originally Resend, pivoted 2026-05-04 because Resend's free tier sandboxes the from-address). Authenticated identity for accountability + 30-day automated session purge by `last_activity_at` for liability cap + user-controlled "Delete my data" + per-session keep flag + self-serve JSON data export. Login page reserves a `<PrivacyCallout>` slot **below** the email input rendering the verbiage at [`skills/updraft/PRIVACY-COPY.md`](skills/updraft/PRIVACY-COPY.md).

**PDF subsystem:** Stage 01 reads PDFs via Gemini's native `inline_data` input on `generateContent` (handles image-based PDFs via OCR — replaces the original pdf-parse plan after the v1/v2 API mismatch bit us 2026-05-04). Stage 04 writes PDFs via Google Drive API (DOCX → Google Doc → PDF export → delete temp Doc) on a dedicated `Updraft` GCP project (id `updraft0526`) with a `drive.file`-scoped service account. PDF generation is non-blocking — failures fall back to DOCX-only with a banner. Sandbox + LibreOffice deferred to v1.0 if scale demands self-hosted.

**Cost guardrails:** all thresholds are env vars (`UPDRAFT_DAILY_*`, `UPDRAFT_PER_IP_*`, `UPDRAFT_SESSION_TOKEN_CAP_*`) dialable from the Vercel dashboard. Owner bypass via `UPDRAFT_OWNER_SECRET` Bearer header (mirrors `BLOG_EDITOR_SECRET`); owner sessions skip caps and tag events `owner: true`. BYOK fallback deferred to v1.0.

**Spec + plan + decisions** live in [`skills/updraft/`](skills/updraft/):
- [`SKILL.md`](skills/updraft/SKILL.md) — orchestrator (load first)
- [`README.md`](skills/updraft/README.md) — engineering handoff
- [`PLAN.md`](skills/updraft/PLAN.md) — durable design + integration record (locked decisions, full route/lib/component inventory, phased roadmap)
- [`DECISIONS.md`](skills/updraft/DECISIONS.md) — append-only decision log (alternatives, rationale, what would invalidate each call)
- [`CALIBRATION.md`](skills/updraft/CALIBRATION.md) — match-analyzer prompt-tuning notes + parked v0.5 features list (read before picking up v0.5 work)
- [`PRIVACY-COPY.md`](skills/updraft/PRIVACY-COPY.md) — Beau-edited canonical privacy verbiage for the login page
- [`references/`](skills/updraft/references/) — 12 spec files: 4 stage files + 8 lib files

**Migration scripts:**
- [`scripts/setup-supabase-updraft.sql`](scripts/setup-supabase-updraft.sql) — tables: `updraft_users`, `updraft_magic_tokens`, `updraft_sessions`, `updraft_events`, `updraft_exports`, `updraft_quota_daily`. RLS default-deny on all UpDraft tables; service-role only.
- [`scripts/setup-supabase-updraft-rpc.sql`](scripts/setup-supabase-updraft-rpc.sql) — atomic UPSERT-increment helper (`updraft_increment_quota`) + today-snapshot read (`updraft_today_quota`). Drives the kill-switch counters.
- [`scripts/setup-supabase-updraft-storage.sql`](scripts/setup-supabase-updraft-storage.sql) — private `updraft-exports` bucket (signed-URL reads only, 5 MB cap, docx/pdf/md MIME allowlist). Output-only — raw uploaded resumes are parsed in-memory and discarded, never persisted.

**Data flow (v0.1.5 + v0.5 polish):** browser → `/updraft/login` (magic link via Brevo) → `/updraft` dashboard → `/updraft/[sessionId]` runs the 4 stages (each stage's structured JSON persists to `updraft_sessions.stage_outputs` on completion). Stage 01 PDF reading is via Gemini direct (handles image PDFs via OCR, casing rules normalize all-caps banners); DOCX reading is via mammoth. **Stage 03** is a phased "Build your story" page (step-of-N strip + grouped blocks for Job history / Background / About you); on Continue it auto-drafts the executive summary in the background and advances. **Stage 04** lands on a Review-and-generate page — summary at the top (editable, autosave, regenerate ↻), then a per-deliverable + per-format checkbox grid (MOD / Resume / Cover Letter × DOCX / PDF). User picks any subset and clicks Generate; on first time defaults all-checked, on Regenerate ↻ defaults all-unchecked. Cover Letter draft (`SYS_COVER_LETTER_DRAFTER`) runs in the same call when any CL kind is selected. DOCX renders via `docx` npm package; PDF converts via Google Drive API. **Auto-retry** at the Drive + Gemini boundaries (3 attempts, exponential backoff + jitter, transient-only — `pdf_retry_recovered` / `pdf_retry_exhausted` log to events for visibility). Both files write to Supabase Storage and download via 10-min signed URLs. PDF generation is non-blocking — DOCX always ships, PDF surfaces a banner if Drive fails after retries. Daily 30-day inactivity purge runs at 09:00 UTC via Vercel Cron.

---

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build (typechecks via Next)
npm run start        # Serve production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

---

## What's intentionally NOT here

- **No newsletter capture.**
- **No post-view analytics.** Site-wide GA4 covers page views; AskBeau conversations are logged to Supabase. The blog inherits that — no per-post analytics yet.
- **No email-out from the site beyond the contact form + UpDraft auth.** Brevo handles both via [`src/lib/email.ts`](src/lib/email.ts). The contact form delivers to Beau's inbox; UpDraft sends magic-link sign-in emails to whoever's signing in. No marketing, broadcast, or product-update sends.
- **No `/api/conflict/ingest` endpoint.** The Routine writes direct-to-Supabase via PostgREST.
- **No `/admin/*` UI for chat logs.** View those via the Supabase dashboard. The blog editor at `/blog/edit/*` is the only authenticated admin surface.
- **No video/audio upload.** Both are URL-only (paste YouTube/Vimeo for video). Blog images do upload directly to Supabase Storage — see the Blog section.
