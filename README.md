# Beau Dawson Portfolio

Professional portfolio for an Operations Director, Systems Builder, and AI Architect.
Clean dark theme, substance-first design, no theatrical effects.

**Live:** [beaudawson.com](https://beaudawson.com)
**Author:** Beau Dawson — Founder, BAD Labs

---

## Tech Stack

| Layer       | Tool                                  |
|-------------|---------------------------------------|
| Framework   | Next.js 16 (App Router) + React 19    |
| Language    | TypeScript 5                          |
| Styling     | Tailwind CSS 4                        |
| Animation   | Framer Motion 12                      |
| Icons       | Lucide React                          |
| Database    | Supabase (Postgres)                   |
| Email       | Resend (contact form)                 |
| AI          | Google Gemini 2.0 Flash (Ask Beau)    |
| Analytics   | Google Analytics 4                    |
| Hosting     | Vercel (auto-deploy on push to main)  |

---

## Quick Start

```bash
npm install
cp .env.example .env.local      # fill in keys
npm run dev                     # http://localhost:3000
```

| Script             | What it does                            |
|--------------------|-----------------------------------------|
| `npm run dev`      | Local dev server                        |
| `npm run build`    | Production build (also runs typecheck)  |
| `npm run start`    | Serve production build                  |
| `npm run lint`     | ESLint                                  |
| `npm run typecheck`| `tsc --noEmit`                          |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                # Main page composition
│   ├── layout.tsx              # Fonts, metadata, GA bootstrap
│   ├── globals.css             # Theme tokens, animations
│   ├── global-conflict/        # Hidden /global-conflict page (Pi-egg-only)
│   └── api/
│       ├── ask-beau/           # Gemini-backed chatbot
│       ├── contact/            # Contact form → Resend → inbox
│       ├── global-conflict/    # Public payload + per-conflict news timeline
│       ├── conflict/status/    # Diagnostic heartbeat (CRON_SECRET-gated)
│       └── pi-challenge/       # Easter-egg challenge issue + validate
├── components/
│   ├── Header.tsx              # Fixed nav bar
│   ├── Hero.tsx                # Headline + headshot + AskBeau widget
│   ├── AskBeau.tsx             # AI chatbot
│   ├── TelemetryGrid.tsx       # Animated metrics grid
│   ├── CaseStudies.tsx         # Expandable case-study cards
│   ├── BadLabsShowcase.tsx     # Current venture
│   ├── SystemKernel.tsx        # Tools & platforms grid
│   ├── Timeline.tsx            # Career history (CSS-only collapse)
│   ├── Footer.tsx              # Contact form + social links
│   ├── GlobalConflict/         # Map + stats + journal UI
│   ├── PiEasterEgg/            # Hidden interactive feature
│   └── ui/                     # Reusable button + skeleton
├── lib/
│   ├── data.ts                 # All portfolio content (single source of truth)
│   ├── analytics.ts            # GA4 helpers + event taxonomy
│   ├── supabase.ts             # Shared Supabase client factory + env resolution
│   ├── chat-log.ts             # AI-chat conversation logging (server-only)
│   ├── rate-limit.ts           # Per-IP rate-limit RPC wrapper
│   ├── conflict-data.ts        # Conflict types + read entry point
│   ├── conflict-store.ts       # Conflict Supabase read layer
│   ├── cron-auth.ts            # Bearer-token verifier (CRON_SECRET)
│   └── pi-challenge/           # HMAC token + Star Trek + sort-code challenges
├── hooks/
│   └── useTrackSection.ts      # IntersectionObserver wrapper
├── types/
│   └── index.ts                # Portfolio interfaces
└── proxy.ts                    # Next 16 middleware: security headers + CSP
```

---

## Design Tokens

| Token                | Hex       | Usage                          |
|----------------------|-----------|--------------------------------|
| Background           | `#111111` | Page background                |
| Surface              | `#1A1A1A` | Cards, surfaces                |
| Deep / inputs        | `#0D0D0D` | Form inputs, deep panels       |
| Border               | `#2A2A2A` | Default border                 |
| Border (hover)       | `#7C3AED/30` | Accent on hover             |
| Text primary         | white     | Headings, body text            |
| Text secondary       | `#94A3B8` | Labels, supporting copy        |
| Accent               | `#7C3AED` | CTAs, highlights, links        |
| Success              | `#10B981` | Status pulse                   |

Fonts: **Inter** (body) + **JetBrains Mono** (terminal/monospace), loaded via `next/font`.

---

## Page Flow (`src/app/page.tsx`)

1. **Header** — name, "Operations + AI", availability status
2. **Hero** — name, trifecta positioning, proof line, CTAs, headshot, AskBeau
3. **TelemetryGrid** — 8 metrics, animated count-up
4. **CaseStudies** — Expedia, Union, BAD Labs (problem → built → results)
5. **BadLabsShowcase** — Console CRM, custom AI tooling, fractional leadership
6. **SystemKernel** — 4-column tools grid
7. **Timeline** — Collapsible full career history
8. **Footer** — Contact form + social links
9. **PiEasterEgg** — hidden, click π in footer corner

---

## API Routes

| Route                          | Method | Purpose                           | Notes                          |
|--------------------------------|--------|-----------------------------------|--------------------------------|
| `/api/ask-beau`                | POST   | AI chatbot                        | Rate-limited (20/hr per IP)    |
| `/api/contact`                 | POST   | Contact form → email              | Rate-limited (5/hr per IP)     |
| `/api/global-conflict`         | GET    | Conflict payload (hotspots, stats)| ISR 15m                        |
| `/api/global-conflict/news`    | GET    | Per-conflict news timeline        | Cursor pagination              |
| `/api/conflict/status`         | GET    | Diagnostic heartbeat              | `Authorization: Bearer $CRON_SECRET` |
| `/api/pi-challenge/issue`      | POST   | Issue HMAC challenge token        | Easter egg                     |
| `/api/pi-challenge/validate`   | POST   | Validate challenge response       | Easter egg                     |

---

## Environment Variables

See [.env.example](./.env.example) for the complete list with generation commands.

| Variable                          | Required | Used by                         |
|-----------------------------------|----------|---------------------------------|
| `GEMINI_API_KEY`                  | Yes      | Ask Beau chatbot                |
| `RESEND_API_KEY`                  | Yes      | Contact form                    |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | Yes      | Google Analytics 4              |
| `SUPABASE_URL`                    | Yes      | All Supabase reads/writes       |
| `SUPABASE_ANON_KEY`               | Yes      | Supabase client                 |
| `SUPABASE_SERVICE_ROLE_KEY`       | Yes      | Server-only Supabase ops        |
| `PI_CHALLENGE_SECRET`             | Yes      | Pi easter egg HMAC tokens       |
| `CHAT_IP_SALT`                    | Yes      | Hashing IPs for chat + rate-limit |
| `CRON_SECRET`                     | Yes      | Gates `/api/conflict/status`    |

The Supabase env names support three families: `BEAU_SUPABASE_*` → `SUPABASE_*` → legacy `NEXT_PUBLIC_SUPABASE_*`. See [`src/lib/supabase.ts`](./src/lib/supabase.ts) for resolution order. Use `BEAU_*` if the Vercel Marketplace ever gets reattached and starts overwriting the unprefixed names.

---

## Hidden Features

The Pi easter egg lives in the footer corner. Click π to enter. The dashboard exposes:

- `> ACCESS_GLOBAL_CONFLICT [LIVE]` — sober data-journalism module: live world map of armed conflicts, journal-style news feed per conflict, daily refresh from a Claude Code Routine. `robots: noindex`.

---

## Deployment

Connected to GitHub for automatic deploys on push to `main`. Preview URLs on every PR. All env vars set in Vercel project settings.

```bash
npx vercel             # Preview
npx vercel --prod      # Production
```

---

## License

Private project. All rights reserved.
