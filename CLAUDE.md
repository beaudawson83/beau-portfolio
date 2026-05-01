# CLAUDE.md — AI Coding Assistant Context

Context for AI coding assistants working on this codebase.

---

## GitHub hygiene — Level 1 priority

GitHub state is yours to maintain. Treat it as **Level 1 attention** — same priority as not breaking the build. The repo must be in pristine order at all times when you are making changes, regardless of size or type of change.

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
│   └── api/
│       ├── ask-beau/route.ts          # Gemini chatbot, rate-limited
│       ├── contact/route.ts           # Resend email, rate-limited, HTML-escaped
│       ├── global-conflict/route.ts   # Public payload, ISR 15m
│       ├── global-conflict/news/route.ts  # Per-conflict timeline
│       ├── conflict/status/route.ts   # Diagnostic, CRON_SECRET-gated
│       └── pi-challenge/{issue,validate}/route.ts
├── components/
│   ├── Header.tsx, Hero.tsx, AskBeau.tsx
│   ├── TelemetryGrid.tsx, CaseStudies.tsx, BadLabsShowcase.tsx
│   ├── SystemKernel.tsx, Timeline.tsx, Footer.tsx
│   ├── GlitchText.tsx, TerminalAnimation.tsx (used by Pi egg)
│   ├── GoogleAnalytics.tsx, AnalyticsProvider.tsx
│   ├── GlobalConflict/                # Map, stats, journal UI
│   ├── PiEasterEgg/                   # Hidden interactive feature
│   └── ui/                            # EnergyButton, Button, Skeleton
├── lib/
│   ├── data.ts                        # All portfolio content (single source of truth)
│   ├── analytics.ts                   # GA4 event helpers
│   ├── supabase.ts                    # Shared Supabase client + env resolution
│   ├── chat-log.ts                    # AI-chat conversation logging
│   ├── rate-limit.ts                  # Per-IP rate-limit RPC wrapper
│   ├── conflict-data.ts               # Conflict types + read entry point
│   ├── conflict-store.ts              # Conflict Supabase read layer (read-only)
│   ├── cron-auth.ts                   # Bearer-token verifier (CRON_SECRET)
│   └── pi-challenge/                  # HMAC token + challenges
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
| `/api/ask-beau`             | POST   | AI chatbot (Gemini 2.0)  | Rate: 20/hr per IP             |
| `/api/contact`              | POST   | Contact form (Resend)    | Rate: 5/hr per IP, HTML-escaped|
| `/api/global-conflict`      | GET    | Conflict payload         | ISR 15m                        |
| `/api/global-conflict/news` | GET    | Per-conflict timeline    | Cursor pagination              |
| `/api/conflict/status`      | GET    | Diagnostic heartbeat     | `Bearer $CRON_SECRET`          |
| `/api/pi-challenge/issue`   | POST   | Issue HMAC challenge     | —                              |
| `/api/pi-challenge/validate`| POST   | Validate response        | —                              |

---

## Environment Variables

| Variable                          | Required | Purpose                                |
|-----------------------------------|----------|----------------------------------------|
| `GEMINI_API_KEY`                  | Yes      | AskBeau chatbot                        |
| `RESEND_API_KEY`                  | Yes      | Contact form email                     |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | Yes      | GA4 (no fallback — required for tracking) |
| `SUPABASE_URL`                    | Yes      | All Supabase reads/writes              |
| `SUPABASE_ANON_KEY`               | Yes      | Anon Supabase client                   |
| `SUPABASE_SERVICE_ROLE_KEY`       | Yes      | Server-only Supabase ops               |
| `CHAT_IP_SALT`                    | Yes      | IP hashing for chat logs + rate limits |
| `CRON_SECRET`                     | Yes      | Gates `/api/conflict/status`           |
| `PI_CHALLENGE_SECRET`             | Yes      | Pi easter egg HMAC tokens              |

Supabase env-name resolution in [`src/lib/supabase.ts`](src/lib/supabase.ts) follows priority:
`BEAU_SUPABASE_*` → Marketplace native (`SUPABASE_URL` / `*_SECRET_KEY` / `*_PUBLISHABLE_KEY`) → legacy (`NEXT_PUBLIC_SUPABASE_URL` / `*_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`).
Use `BEAU_*` if the Vercel Marketplace integration ever gets reattached and starts overwriting unprefixed names — those are app-owned and the Marketplace can't touch them.

Vercel marks all env vars as Sensitive on creation, so values are never visible after save. Use `/api/conflict/status` (with `CRON_SECRET`) to verify Supabase env state at runtime without exposing secrets.

---

## Ask Beau AI Chatbot

`/api/ask-beau` uses Gemini 2.0 Flash with a detailed system prompt containing professional + personal facts, conversation handling rules, and deterministic fallbacks. The system prompt is the single source of truth for chatbot personality — edit in [`src/app/api/ask-beau/route.ts`](src/app/api/ask-beau/route.ts).

Conversations are logged to Supabase (`chat_conversations`) via [`src/lib/chat-log.ts`](src/lib/chat-log.ts). To view them, use the Supabase dashboard's table editor (no in-app admin UI).

---

## Global Conflict Index — LIVE but hidden

Live at `/global-conflict`, accessible only via the Pi easter egg dashboard (`> ACCESS_GLOBAL_CONFLICT [LIVE]`). `robots: noindex`.

A sober data-journalism module: real TopoJSON world map (countries tinted red by intensity), animated stat row, hotspot markers, wire feed. Click any hotspot → news section becomes that conflict's full journal timeline (paginated, all-time history).

### Data flow

- **Daily 7am Central** — a Claude Code Routine (claude.ai/code/routines) runs Claude Opus 4.7 with `web_search` + `bash` tools, researches every active conflict per the actor taxonomy, collects last-24h headlines, and writes **directly** to Supabase via PostgREST using the project's service-role key. The Routine bypasses the app entirely — there is no `/api/conflict/ingest` endpoint anymore.
- **At request time** — `/global-conflict` server-renders by reading Supabase via `getConflictData()` → latest snapshot, active hotspots, last-24h news, all actors. Empty state if Supabase is dry.

The Routine prompt enforces a multi-pass identification protocol with the full taxonomy: territory / principal / direct / basing / sponsor / supplier / proxy / mediator. Combat-tier roles (territory / principal / direct / basing) accept any plausible https URL; support-tier roles (sponsor / supplier / proxy) require a host on the reputable allowlist (Reuters / AP / BBC / Crisis Group / UN / state.gov / etc.).

### Supabase project

Single user-managed project: **`ygvhoocbvraiplzmgufa`** (https://ygvhoocbvraiplzmgufa.supabase.co). **Do not** use the Vercel Marketplace Supabase integration — it provisions a separate ghost project and silently auto-syncs env vars to it. The Marketplace integration was disconnected 2026-05-01.

### Tables (in `ygvhoocbvraiplzmgufa`)

```
conflict_hotspots    territory + intensity + casualties + iso codes
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

- **No blog.** A previous Contentful + NextAuth blog ("System Logs") was stripped 2026-05-01. The next blog will be custom-built; nothing in the repo references the old infrastructure.
- **No newsletter capture.**
- **No post-view analytics.** Site-wide GA4 covers page views; AskBeau conversations are logged to Supabase.
- **No email-out from the site.** Resend is used only for the inbound contact form (visitor → Beau's inbox).
- **No `/api/conflict/ingest` endpoint.** The Routine writes direct-to-Supabase via PostgREST.
- **No `/admin/*` UI.** View chat logs via the Supabase dashboard.
