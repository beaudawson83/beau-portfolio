# Beau Dawson Portfolio

Professional portfolio for an Operations Director, Systems Builder, and AI Architect.
Clean dark theme, substance-first design, no theatrical effects.

**Live:** [beaudawson.com](https://beaudawson.com)
**Author:** Beau Dawson — Founder, BAD Labs

> Full engineering context (conventions, every API route, env-var details, module
> deep-dives) lives in [CLAUDE.md](./CLAUDE.md) — that file is the source of truth
> for anyone (human or AI) working on this codebase. This README is the orientation pass.

---

## Tech Stack

| Layer       | Tool                                            |
|-------------|-------------------------------------------------|
| Framework   | Next.js 16 (App Router) + React 19              |
| Language    | TypeScript 5                                    |
| Styling     | Tailwind CSS 4                                  |
| Animation   | Framer Motion 12                                |
| Icons       | Lucide React                                    |
| Database    | Supabase (Postgres + Storage)                   |
| Email       | Brevo (contact form + UpDraft magic links)      |
| AI          | Google Gemini 3.5 Flash (Ask Beau + UpDraft); override via `GEMINI_MODEL` |
| PDF export  | Google Drive API (UpDraft DOCX → PDF)           |
| Analytics   | Google Analytics 4                              |
| Hosting     | Vercel (auto-deploy on push to main)            |

---

## What's in here

Four user-facing surfaces share this codebase:

1. **The portfolio** (`/`) — hero, metrics, case studies, BAD Labs showcase, owned-systems
   MODULES panel, tools grid, career timeline, contact form. Plus the hidden Pi easter egg
   (click π in the footer corner).
2. **Blog — "Terminal Notebook"** (`/blog`) — live, surfaced via the homepage MODULES
   section. 17-block-type reader + Notion-style editor at `/blog/edit` (gated by
   `BLOG_EDITOR_SECRET`). Supabase-backed, ISR 15m.
3. **Global Conflict Index** (`/global-conflict`) — live, surfaced via MODULES. World map +
   journal of armed conflicts, refreshed daily by a Claude Code Routine that writes
   directly to Supabase.
4. **UpDraft** (`/updraft`) — v0.1.5, live at an unlinked URL. Resume + cover-letter
   generation tool: magic-link auth, 4-stage flow, DOCX/PDF exports, 30-day auto-purge.
   Spec + decision log in [`skills/updraft/`](./skills/updraft/).

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

## Project Structure (abridged)

```
src/
├── app/
│   ├── page.tsx                # Main page composition
│   ├── layout.tsx              # Fonts, metadata, GA bootstrap
│   ├── globals.css             # Theme tokens, animations
│   ├── blog/                   # Terminal Notebook: index, [slug], edit/ (editor)
│   ├── global-conflict/        # Conflict data-journalism page
│   ├── updraft/                # UpDraft: login, dashboard, [sessionId], account
│   └── api/
│       ├── ask-beau/           # Gemini-backed chatbot (rate-limited)
│       ├── contact/            # Contact form → Brevo → inbox
│       ├── blog/               # posts CRUD + media signing (Bearer-gated writes)
│       ├── global-conflict/    # Public payload + per-conflict news timeline
│       ├── conflict/status/    # Diagnostic heartbeat (CRON_SECRET-gated)
│       ├── updraft/            # Auth, sessions, stages, exports, account, cron
│       └── pi-challenge/       # Easter-egg challenge issue + validate
├── components/
│   ├── Header / Hero / AskBeau / TelemetryGrid / CaseStudies
│   ├── BadLabsShowcase / SystemKernel / Timeline / Footer
│   ├── Modules/                # Owned-systems control panel (homepage MODULES)
│   ├── Blog/                   # Reader (blocks, TOC) + Builder (block editor)
│   ├── GlobalConflict/         # Map + stats + journal UI
│   ├── Updraft/                # Login, dashboard, Stage 01–04 runners, account
│   ├── PiEasterEgg/            # Hidden interactive feature
│   └── ui/                     # Reusable button + skeleton
├── lib/
│   ├── data.ts                 # All portfolio content (single source of truth)
│   ├── supabase.ts             # Shared client factory + env resolution
│   ├── email.ts                # Brevo transactional email
│   ├── blog-*.ts               # Blog data/store/auth/utils/media
│   ├── conflict-*.ts           # Conflict types + Supabase read layer
│   ├── updraft/                # 17 files: auth, store, gemini, parser, docx, pdf, …
│   └── analytics / chat-log / rate-limit / cron-auth / module-telemetry
├── hooks/useTrackSection.ts
├── types/index.ts              # Portfolio interfaces
└── proxy.ts                    # Next 16 middleware: security headers + CSP
```

Full annotated tree: [CLAUDE.md → File Structure](./CLAUDE.md#file-structure).

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
The blog ships its own scoped palette (`.tn-shell`, dark-purple + optional light theme);
UpDraft uses a warm-black variant — neither leaks into the main site.

---

## Page Flow (`src/app/page.tsx`)

1. **Header** — name, "Operations + AI", availability status
2. **Hero** — name, trifecta positioning, proof line, CTAs, headshot, AskBeau
3. **TelemetryGrid** — 8 metrics, animated count-up
4. **CaseStudies** — Expedia, Union, BAD Labs (problem → built → results)
5. **BadLabsShowcase** — Console CRM, custom AI tooling, fractional leadership
6. **Modules** — owned-systems control panel: Conflict + Notes cards w/ live telemetry
7. **SystemKernel** — 4-column tools grid
8. **Timeline** — Collapsible full career history
9. **Footer** — Contact form + social links
10. **PiEasterEgg** — hidden, click π in footer corner

---

## API Routes

The complete table (≈30 routes incl. all blog + UpDraft endpoints, auth, and rate
limits) lives in [CLAUDE.md → API Routes](./CLAUDE.md#api-routes). Highlights:

| Route                          | Method | Purpose                           | Notes                          |
|--------------------------------|--------|-----------------------------------|--------------------------------|
| `/api/ask-beau`                | POST   | AI chatbot (Beau questions only)  | Rate-limited (20/hr per IP)    |
| `/api/contact`                 | POST   | Contact form → email              | Rate-limited (5/hr per IP)     |
| `/api/blog/posts[…]`           | CRUD   | Blog posts + media signing        | Writes need `BLOG_EDITOR_SECRET` |
| `/api/global-conflict[…]`      | GET    | Conflict payload + news timeline  | ISR 15m / cursor pagination    |
| `/api/conflict/status`         | GET    | Diagnostic heartbeat              | `Bearer $CRON_SECRET`          |
| `/api/updraft/[…]`             | *      | Auth, sessions, stages, exports   | Session cookie + quotas        |
| `/api/pi-challenge/[…]`        | POST   | Easter-egg challenge + validate   | —                              |

---

## Environment Variables

See [.env.example](./.env.example) for the complete list with generation commands, and
[CLAUDE.md → Environment Variables](./CLAUDE.md#environment-variables) for full notes.

| Variable                          | Required | Used by                         |
|-----------------------------------|----------|---------------------------------|
| `GEMINI_API_KEY`                  | Yes      | Ask Beau chatbot + UpDraft      |
| `GEMINI_MODEL`                    | No       | Ask Beau model override (default `gemini-3.5-flash`) |
| `BREVO_API_KEY`                   | Yes      | All transactional email         |
| `MAIL_FROM_ADDRESS`               | Yes      | From-address (Brevo-verified domain) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | Yes      | Google Analytics 4              |
| `SUPABASE_URL`                    | Yes      | All Supabase reads/writes       |
| `SUPABASE_ANON_KEY`               | Yes      | Supabase client                 |
| `SUPABASE_SERVICE_ROLE_KEY`       | Yes      | Server-only Supabase ops        |
| `BLOG_EDITOR_SECRET`              | Yes      | Blog editor UI + write API      |
| `PI_CHALLENGE_SECRET`             | Yes      | Pi easter egg HMAC tokens       |
| `CHAT_IP_SALT`                    | Yes      | Hashing IPs for chat + rate-limit |
| `CRON_SECRET`                     | Yes      | Diagnostic + cron endpoints     |
| `UPDRAFT_*`                       | Mixed    | UpDraft auth secrets, quotas, Drive SA — see `.env.example` |

The Supabase env names support three families: `BEAU_SUPABASE_*` → `SUPABASE_*` → legacy
`NEXT_PUBLIC_SUPABASE_*`. See [`src/lib/supabase.ts`](./src/lib/supabase.ts) for resolution
order. Use `BEAU_*` if the Vercel Marketplace ever gets reattached and starts overwriting
the unprefixed names.

---

## Deployment

Connected to GitHub for automatic deploys on push to `main`. Preview URLs on every PR.
All env vars set in Vercel project settings. A Vercel Cron hits
`/api/updraft/cron/purge` daily at 09:00 UTC (30-day inactivity purge).

```bash
npx vercel             # Preview
npx vercel --prod      # Production
```

---

## License

Private project. All rights reserved.
