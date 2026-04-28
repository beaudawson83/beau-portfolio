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
| `NEXT_PUBLIC_SUPABASE_URL` | For blog | Blog views/likes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For blog | Blog views/likes |
| `NEXTAUTH_SECRET` | For blog | Blog admin auth |
| `ADMIN_EMAIL` | For blog | Authorized blog admin |

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

1. **Persistent journal in Supabase** (preferred, when configured):
   - Read at request time by `getConflictData()` in `src/lib/conflict-data.ts`
   - Tables: `conflict_hotspots`, `conflict_news` (URL-deduped journal),
     `conflict_snapshots` (time series of global stats)
   - Schema lives in `scripts/setup-supabase-conflict.sql` (idempotent;
     run once in the Supabase SQL editor). RLS: anon read, service-role write.

2. **Two cron jobs** (`vercel.json`) keep the journal fresh:
   - `/api/cron/conflict-snapshot` every 30 min — global Gemini scan,
     writes a snapshot row + upserts hotspots (marks resolved ones inactive),
     stashes the global headlines.
   - `/api/cron/conflict-journal` at :15 hourly — for each active hotspot,
     runs a deep per-conflict Gemini scan and appends new URLs to
     `conflict_news`. Designed to grow indefinitely.
   - Both protected by `Authorization: Bearer ${CRON_SECRET}`.

3. **Live fallback** (no Supabase): one-shot Gemini global scan per request,
   no persistence. Page-level ISR caches the result for 15 min.

4. **Static fallback**: `FALLBACK_CONFLICT_DATA` ships hand-curated April
   2026 data so the page never goes blank.

5. **Public API**: `GET /api/global-conflict` (full payload) and
   `GET /api/global-conflict/news?conflict=<id>&limit=25&before=<iso>`
   (paginated per-conflict timeline; returns `nextBefore` cursor).

### Env vars (Vercel production)

Required for live data:
- `GEMINI_API_KEY` (already configured for ask-beau)

Required for the persistent journal:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (cron writes — bypasses RLS)
- `CRON_SECRET` (generate any high-entropy string; Vercel Cron adds the
  matching `Authorization: Bearer …` automatically)

### One-time setup

1. Run `scripts/setup-supabase-conflict.sql` in the Supabase SQL editor.
2. Set the four env vars above in Vercel.
3. Redeploy. Vercel Cron will pick up `vercel.json` and start invoking the jobs.
4. Invoke `/api/cron/conflict-snapshot` manually once to seed (with the
   `Authorization: Bearer $CRON_SECRET` header) so the page has data
   before the first scheduled run.

### Validation (be honest about scope)

Validation is **shape-only**. The ingest helpers verify top-level types,
required fields, and that URLs match `^https?://`. They do not:
- Verify URLs resolve / aren't 404
- Sanity-check casualty numbers against historical baselines
- Cross-reference Gemini's claims against ACLED/UCDP datasets directly

The methodology footer is honest about this — it's "agentic, LLM-assisted"
journalism, not a primary-source dataset.

### Files

- `src/lib/conflict-data.ts` — types, fallback dataset, `getConflictData()`
- `src/lib/conflict-store.ts` — Supabase read/write layer (no-ops when unconfigured)
- `src/lib/conflict-ingest.ts` — `globalScan()` and `perConflictScan(h)` Gemini helpers
- `src/lib/cron-auth.ts` — Bearer-token verifier shared by cron routes
- `src/app/global-conflict/page.tsx` — server component, ISR 15m
- `src/app/api/global-conflict/route.ts` — public payload
- `src/app/api/global-conflict/news/route.ts` — per-conflict timeline w/ cursor
- `src/app/api/cron/conflict-snapshot/route.ts` — global scan cron
- `src/app/api/cron/conflict-journal/route.ts` — per-conflict scan cron
- `src/components/GlobalConflict/` — UI: map, stats, timeline, detail panel
- `public/countries-110m.json` — world-atlas TopoJSON (105 KB)
- `vercel.json` — cron schedule
- `scripts/setup-supabase-conflict.sql` — idempotent migration

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
