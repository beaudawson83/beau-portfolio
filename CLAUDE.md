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

## Blog (System Logs)

Infrastructure is built but no content published yet. See TODO.md for planned posts.

- **CMS:** Contentful (posts, tags, rich text)
- **Database:** Supabase (view counts, likes)
- **Rendering:** ISR with 60s revalidation
- **Tags:** AI_STRATEGY, OPS_EFFICIENCY, FRACTIONAL_INSIGHTS, AUTOMATION, CRM_ARCHITECTURE, LEADERSHIP
- **Admin:** NextAuth-protected create page at `/system-logs/create`
- **OG Images:** Auto-generated per post at `/system-logs/[slug]/opengraph-image`

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
