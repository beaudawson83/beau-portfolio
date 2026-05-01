# CLAUDE.md - AI Coding Assistant Context

This file provides context for AI coding assistants working on this codebase.

---

## Project Overview

**Beau Dawson Portfolio** — Professional portfolio site for an Operations Director, Systems Builder, and AI Architect. Clean dark theme, substance-first design, no theatrical effects.

**Stack:** Next.js 16.1 + React 19 + TypeScript 5 + Tailwind CSS 4 + Framer Motion 12
**Deployment:** Vercel (auto-deploy on push to `main`)
**Live URL:** beaudawson.com
**Repo:** github.com/beaudawson83/beau-portfolio

---

## Page Flow (src/app/page.tsx)

```
Header          — Fixed nav bar: name, "Operations + AI", location, availability status
Hero            — Name, trifecta positioning, proof line, CTAs, headshot, AskBeau chatbot
TelemetryGrid   — 8 metrics in 4x2 grid (animated count-up)
CaseStudies     — 3 expandable cards: Expedia, Union, BAD Labs (problem → built → results)
BadLabsShowcase — Current venture: Console CRM, custom AI tooling, fractional leadership
SystemKernel    — 4-column tools grid: AI & Automation, Platforms, Development, Operations
Timeline        — Collapsible full career history (pure CSS toggle, no JS)
Footer          — Contact form (name, objective, message), social links
PiEasterEgg     — Hidden interactive feature (click π in footer corner)
```

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Main page composition
│   ├── layout.tsx                  # Root layout (fonts, metadata, analytics)
│   ├── globals.css                 # Theme colors, animations, utilities
│   ├── api/
│   │   ├── ask-beau/route.ts       # AI chatbot (Gemini 2.0 Flash)
│   │   ├── contact/route.ts        # Contact form (Resend email)
│   │   ├── posts/route.ts          # Blog posts API
│   │   ├── newsletter/route.ts     # Newsletter signup
│   │   ├── analytics/route.ts      # Analytics endpoint
│   │   └── auth/[...nextauth]/     # NextAuth (blog admin)
│   └── system-logs/                # Blog section
│       ├── page.tsx                # Blog listing (Contentful + ISR)
│       ├── [slug]/page.tsx         # Individual post
│       └── create/page.tsx         # Admin post creation
├── components/
│   ├── Header.tsx                  # Fixed nav bar
│   ├── Hero.tsx                    # Hero section with AskBeau
│   ├── AskBeau.tsx                 # AI chatbot widget
│   ├── TelemetryGrid.tsx           # Metrics grid
│   ├── CaseStudies.tsx             # Expandable case study cards
│   ├── BadLabsShowcase.tsx         # BAD Labs current venture
│   ├── SystemKernel.tsx            # Tools & platforms grid
│   ├── Timeline.tsx                # Collapsible career timeline (server component, CSS-only)
│   ├── ChangeLog.tsx               # Legacy experience component (not in page.tsx, kept for reference)
│   ├── Footer.tsx                  # Contact form + social links
│   ├── GlitchText.tsx              # Text scramble animation (used by Easter egg)
│   ├── TerminalAnimation.tsx       # Terminal typing effect (used by Easter egg)
│   ├── GoogleAnalytics.tsx         # GA4 script loader
│   ├── AnalyticsProvider.tsx       # Analytics context
│   ├── ui/
│   │   ├── EnergyButton.tsx        # CTA button (primary/secondary variants)
│   │   ├── Button.tsx              # Base button
│   │   └── Skeleton.tsx            # Loading skeleton
│   ├── PiEasterEgg/                # Hidden Easter egg (20 files, self-contained)
│   └── SystemLogs/                 # Blog components (11 files)
├── lib/
│   ├── data.ts                     # ALL content: metrics, experiences, skills, case studies, hero copy, social links, BAD Labs
│   ├── analytics.ts                # GA4 event tracking utilities
│   ├── contentful.ts               # Contentful CMS client (blog)
│   ├── supabase.ts                 # Supabase client (blog views/likes)
│   └── auth.ts                     # NextAuth config (blog admin)
├── hooks/
│   └── useTrackSection.ts          # IntersectionObserver for section visibility tracking
└── types/
    ├── index.ts                    # Portfolio types (Metric, Experience, Skill, ContactObjective, etc.)
    └── blog.ts                     # Blog types (Post, Tag, etc.)
```

---

## Key Conventions

1. **Content lives in `src/lib/data.ts`** — never hardcode content in components
2. **Types in `src/types/index.ts`** — all portfolio interfaces defined centrally
3. **Minimal animation** — simple fade-in on scroll via Framer Motion, no particles/glitch/3D
4. **Framer Motion for animation, not CSS** — except Timeline which is pure CSS (server component)
5. **Tailwind for all styling** — inline classes, no CSS modules
6. **Dark theme only** — bg #111111, surface #1A1A1A, border #2A2A2A, accent #7C3AED, text white/#94A3B8

---

## Design Tokens

```
Background:   #111111 (page), #1A1A1A (cards/surfaces), #0D0D0D (deep/inputs)
Borders:      #2A2A2A (default), #7C3AED/30 (hover accent)
Text:         white (primary), #94A3B8 (secondary), #94A3B8/40-60 (muted)
Accent:       #7C3AED (violet — buttons, highlights, links)
Success:      #10B981
Font:         Inter (body, default), JetBrains Mono (monospace elements)
```

---

## API Routes

| Route | Method | Purpose | Service |
|-------|--------|---------|---------|
| `/api/ask-beau` | POST | AI chatbot | Gemini 2.0 Flash |
| `/api/contact` | POST | Contact form email | Resend |
| `/api/posts` | GET | Blog post listing | Contentful |
| `/api/newsletter` | POST | Newsletter signup | — |
| `/api/analytics` | POST | Custom analytics events | — |
| `/api/auth/[...nextauth]` | * | Blog admin auth | NextAuth |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | AI chatbot (Ask Beau) |
| `RESEND_API_KEY` | Yes | Contact form emails |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | Google Analytics 4 |
| `CONTENTFUL_SPACE_ID` | For blog | Contentful CMS |
| `CONTENTFUL_ACCESS_TOKEN` | For blog | Contentful CMS |
| `CONTENTFUL_MANAGEMENT_TOKEN` | For blog | Blog admin/create |
| `SUPABASE_URL` | Yes | Supabase project URL (chat / blog / conflict) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role JWT (server-side only) |
| `CRON_SECRET` | For dormant ingest | Auth for `/api/conflict/ingest` (Routine writes direct, doesn't use this) |
| `CHAT_IP_SALT` | Yes | Hashing salt for IP-based rate limiting + chat logs |
| `NEXTAUTH_SECRET` | For blog | Blog admin auth |
| `NEXTAUTH_URL` | For blog | Blog admin auth |
| `ADMIN_PASSWORD` | For blog | Single-password blog admin |

Supabase env-name resolution priority is `BEAU_SUPABASE_*` → Marketplace
native (`SUPABASE_URL` / `*_SECRET_KEY` / `*_PUBLISHABLE_KEY`) → legacy
(`NEXT_PUBLIC_SUPABASE_URL` / `*_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`).
See `src/lib/supabase.ts`. Use `BEAU_*` if the Vercel Marketplace
integration ever gets reattached and starts overwriting the unprefixed
names — those are app-owned and the Marketplace can't touch them.

---

## Ask Beau AI Chatbot

The chatbot at `/api/ask-beau` uses Gemini 2.0 Flash with a detailed system prompt containing:
- Professional career facts (20+ years, every company, key metrics)
- Personal details (pets with personalities, music taste, hobbies, travel, cooking, style)
- How he and Ian met (the Eviivo love story)
- Handling guides for: personal questions, flirty, obscene, off-topic, hostile
- Deterministic fallback responses when API is unavailable

The system prompt is the single source of truth for chatbot personality. Edit it in `src/app/api/ask-beau/route.ts`.

---

## Blog (System Logs) — LIVE but hidden

Shipped April 2026. Live behind the Pi easter egg only.
Full setup walkthrough: `BLOG_SETUP.md`.

- **Current state:** live in production, `robots: noindex`, no public link
  anywhere. Accessible only via Pi easter egg → Dashboard → `ACCESS_SYSTEM_LOGS`
  or `LOG_CREATOR [RESTRICTED]`.
- **CMS:** Contentful. Space ID `birct6t1cscc`. Content type `systemLog`.
- **Admin auth:** single password via NextAuth Credentials provider —
  `ADMIN_PASSWORD` env var. No OAuth, no Supabase whitelist.
- **Login page:** `/system-logs/login` (client-side form, POSTs to NextAuth)
- **Create page:** `/system-logs/create` (layout-gated on `session.user.isAdmin`)
- **Rendering:** ISR — listing 60s, individual posts 300s
- **Tags:** AI_STRATEGY, OPS_EFFICIENCY, FRACTIONAL_INSIGHTS, AUTOMATION,
  CRM_ARCHITECTURE, LEADERSHIP (enum-enforced in Contentful)
- **Statuses:** DRAFT | DEPLOYED | ARCHIVED (enum-enforced; only DEPLOYED
  shows on public listing)
- **Supabase (newsletter + view analytics):** opt-in, unconfigured. All
  Supabase calls no-op when env vars missing. Add later if desired.

### Infrastructure scripts

- `scripts/setup-contentful.mjs` — idempotent migration that creates the
  full `systemLog` content type via the Contentful Management API.
  Run with `npm run setup:contentful`. Reads `.env.local` if present.

### Env vars (Vercel production, all configured as of April 2026)

Core: `GEMINI_API_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`
Admin auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_PASSWORD`
Contentful: `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN`,
`CONTENTFUL_PREVIEW_TOKEN`, `CONTENTFUL_MANAGEMENT_TOKEN`
(Supabase vars intentionally unset)

### When it's time to make the blog public

Two tiny edits unhide it:

1. Remove the `robots: noindex` block in `src/app/system-logs/layout.tsx`
2. Add a "System Logs" link to `src/components/Header.tsx`

Optionally also add a "recent posts" preview card section to `src/app/page.tsx`.

### Want list / future enhancements for the blog (parked)

User wants to play with the blog while writing posts, then circle back on:

- **Photo spot / gallery inside post body** — currently body is rich text only.
  Options: (a) enable Contentful asset field on the content type,
  (b) use Contentful's built-in rich-text embedded asset, then extend
  `RichTextRenderer.tsx` to render images.
- **Possible edits to displayed content** on post pages (layout, typography,
  accent styling) — TBD based on how published posts look
- When we circle back: check the "Next-session picks-up-here" checklist
  below before doing anything destructive.

### Next-session pick-up-here checklist

When returning to blog work:

1. Confirm current branch and production parity: `git log main --oneline -5`
2. Check Vercel env vars haven't drifted (Contentful + NextAuth triplet)
3. Confirm the Pi dashboard → LOG_CREATOR → password → editor flow still works
4. Check what posts exist in `birct6t1cscc` via Contentful UI or
   `npm run setup:contentful` (re-runnable, shows status)
5. If adding photo/gallery support: coordinate with user whether to
   re-run setup-contentful.mjs to add new fields, or edit content model
   in the Contentful UI

---

## Global Conflict Index — LIVE but hidden

Live at `/global-conflict`, accessible only via the Pi easter egg dashboard
(`> ACCESS_GLOBAL_CONFLICT [LIVE]`). `robots: noindex` for now.

A sober data-journalism module: real TopoJSON world map (countries tinted
red by conflict intensity), animated stat row, hotspot markers, and a wire
feed. Click any hotspot → the news section becomes that conflict's full
journal timeline (paginated, all-time history).

### Data flow

- **Daily 7am Central** — a Claude Code Routine (claude.ai/code/routines)
  runs Claude Opus 4.7 with `web_search` + `bash` tools, researches every
  active conflict per the actor taxonomy, collects last-24h headlines,
  builds JSON, and writes **directly** to Supabase via PostgREST
  (`POST $SUPABASE_URL/rest/v1/conflict_*`) with the project's
  service-role key. The Routine **does not** call `/api/conflict/ingest` —
  that endpoint is dormant (kept for future use; Routine bypasses it).
- **At request time** — `/global-conflict` server-renders by reading
  Supabase via `getConflictData()` → latest snapshot, active hotspots,
  last-24h news, all actors. If Supabase is empty, the page renders an
  explicit empty state pointing at `/api/conflict/status`. **No
  request-time LLM call. No static fallback.**

The Routine prompt enforces a multi-pass identification protocol with the
full taxonomy: territory / principal / direct / basing / sponsor /
supplier / proxy / mediator. Combat-tier actors (territory / principal /
direct / basing) accept any plausible https URL; support-tier actors
(sponsor / supplier / proxy) require a host on the reputable allowlist
(Reuters / AP / BBC / Crisis Group / UN / state.gov / etc.).

### Supabase project

Single user-managed project: **`ygvhoocbvraiplzmgufa`** (https://ygvhoocbvraiplzmgufa.supabase.co).
**Do not** use the Vercel Marketplace Supabase integration — it provisions
a separate empty project (e.g. `eymhi…`) and silently auto-syncs env vars
to point at that ghost. The Marketplace integration was disconnected
2026-05-01. If it ever gets reattached, use `BEAU_SUPABASE_*` env names
(see env section below) — those are app-owned and the Marketplace can't
touch them.

### Tables (in `ygvhoocbvraiplzmgufa`)

  conflict_hotspots   territory + intensity + casualties + iso codes
  conflict_news       URL-deduped journal (append-only)
  conflict_snapshots  time series of global stats
  conflict_actors     (conflict_id, country_iso, role, confidence,
                       sources jsonb, notes, first_documented,
                       last_confirmed) — unique on (conflict, country, role)

Schema lives in `scripts/setup-supabase-conflict.sql` (idempotent;
re-runnable). RLS: anon read, service-role write.

### Diagnostic endpoint — your first stop when something looks off

`GET /api/conflict/status` returns:
- which env-name family resolved at runtime (`BEAU_*` / `marketplace-native` / `legacy`)
- key formats detected (`legacy-jwt` / `new-opaque`)
- per-table row counts
- latest snapshot timestamp + total
- latest news ingest
- active hotspot count

No secrets in the response. Single curl tells you the entire pipeline state.
This is the difference between "back-and-forth diagnosis" and "one query."

### Env vars

**Vercel (production):**
- `SUPABASE_URL` (or `BEAU_SUPABASE_URL`) → user's project URL
- `SUPABASE_ANON_KEY` (or `BEAU_*`) → anon JWT
- `SUPABASE_SERVICE_ROLE_KEY` (or `BEAU_*`) → service-role JWT
- `CRON_SECRET` → only needed if you ever revive `/api/conflict/ingest`

Vercel marks all env vars as Sensitive on creation now (post-2025-hack
hardening), so values are never visible after save. Use the diagnostic
endpoint above to verify what's loaded at runtime.

**Claude Code Routine (per-Routine Environment, separate from Vercel):**
- `SUPABASE_URL` → `https://ygvhoocbvraiplzmgufa.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` → service-role JWT

The Routine and Vercel must point at the **same project**. The Routine
prompt's first command decodes the JWT to print the project ref — use
that to verify parity.

### One-time setup (or recovery)

1. Create / use a Supabase project (skip the Vercel Marketplace).
2. Run `scripts/setup-supabase-conflict.sql` in the Supabase SQL editor.
3. Set the env vars above in Vercel.
4. Create a Routine at claude.ai/code/routines: schedule daily 7am Central,
   add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to its Environment,
   paste the prompt.
5. Run the Routine manually once to seed Supabase.
6. Verify via `/api/conflict/status` — `sourceOfUrl` resolves cleanly,
   row counts > 0, `latestSnapshot.capturedAt` is recent.

### Files

- `src/lib/conflict-data.ts` — types (incl. `ActorRole` taxonomy),
  `getConflictData()`, `EMPTY_PAYLOAD`
- `src/lib/conflict-store.ts` — Supabase read/write layer; delegates client
  setup to `src/lib/supabase.ts`
- `src/lib/conflict-validate.ts` — payload validators for the dormant
  ingest endpoint (drops unsourced actor rows; reputable-host allowlist)
- `src/lib/supabase.ts` — shared Supabase client factory + env resolution
- `src/lib/cron-auth.ts` — Bearer-token verifier
- `src/app/global-conflict/page.tsx` — server component, ISR 15m,
  empty-state render when DB is dry
- `src/app/api/global-conflict/route.ts` — public payload
- `src/app/api/global-conflict/news/route.ts` — per-conflict timeline w/ cursor
- `src/app/api/conflict/status/route.ts` — diagnostic heartbeat
- `src/app/api/conflict/ingest/route.ts` — dormant POST endpoint (Routine
  doesn't call it currently; safe to delete if you don't want the
  optionality)
- `src/components/GlobalConflict/` — UI: map, stats, timeline, detail panel
- `public/countries-110m.json` — world-atlas TopoJSON (105 KB)
- `scripts/setup-supabase-conflict.sql` — idempotent migration

### Validation (be honest about scope)

Validation in `conflict-validate.ts` is **shape-only**. It verifies top-level
types, required fields, and `^https?://` URL prefixes. It does NOT verify
URLs resolve, sanity-check casualty numbers against historical baselines,
or cross-reference Claude's claims against ACLED/UCDP datasets directly.
The methodology footer is honest about this — it's "agentic, LLM-assisted"
journalism, not a primary-source dataset.

Note: with the current Routine writing direct-to-Supabase, this validation
isn't actually in the path. If you wire the Routine to use
`/api/conflict/ingest` later, it kicks back in.

### Future phases (parked)

Phase 2: cross-prompt audit. Phase 3: ACLED/UCDP/SIPRI reconciliation.
Phase 4: map UI layers (territory / belligerents / sponsors).

---

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint
```

---

## What Was Removed (April 2026 Cleanup)

These components were stripped during a professionalism overhaul. Files deleted, deps uninstalled:
- PageLoader (3-second fake boot sequence)
- GlobalParticles (Three.js particle background)
- HeroBackground (Three.js 3D hero with custom shaders)
- SmoothScroll / Lenis (JS scroll hijacking)
- ChaosToClarity (WebGL particle animation)
- SystemMonitor (animated fake chart)
- HookSection (redundant philosophy quote)
- ArchitectureShowcase (fake code editor)
- MatrixRain (matrix rain effect)
- HolographicFrame (holographic photo frame)

Removed deps: three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, gsap, lenis, @types/three

GlitchText and TerminalAnimation are kept — they're used by the PiEasterEgg.
