# Beau Dawson Portfolio

Professional portfolio showcasing 10+ years of operations leadership and AI architecture expertise. Built with a "System Architecture" theme featuring a mission-critical dashboard aesthetic with industrial minimalism.

**Live Site:** Deployed on Vercel
**Author:** Beau Dawson (BAD Labs)

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework (App Router) |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 12.24.10 | Animations |
| Lucide React | 0.562.0 | Icons |
| Resend | - | Contact form email delivery |
| Google Gemini | 2.0 Flash | AI chatbot ("Ask Beau" feature) |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx        # Root layout, fonts, metadata
│   ├── page.tsx          # Main page composing all sections
│   ├── globals.css       # CSS variables, theme, animations
│   └── api/
│       ├── contact/route.ts    # Contact form email handler (Resend)
│       └── ask-beau/route.ts   # AI chatbot endpoint (Gemini)
├── components/
│   ├── Header.tsx        # Fixed terminal-style header bar
│   ├── Hero.tsx          # Split hero (headline + headshot + Ask Beau)
│   ├── TelemetryGrid.tsx # Key metrics with count-up animation
│   ├── ChaosToClarity/   # Interactive particle animation
│   │   ├── index.tsx     # Main component
│   │   ├── useParticleSystem.ts  # Canvas animation hook
│   │   ├── constants.ts  # Particle configuration
│   │   └── types.ts      # TypeScript interfaces
│   ├── ArchitectureShowcase.tsx  # Code editor mockup
│   ├── ChangeLog.tsx     # Git-style experience timeline
│   ├── SystemKernel.tsx  # Skills grid (3 columns)
│   ├── SystemMonitor.tsx # Performance chart visualization
│   ├── HookSection.tsx   # Featured quote section
│   ├── Footer.tsx        # Contact form + social links
│   ├── AskBeau.tsx       # AI chatbot component
│   ├── TerminalAnimation.tsx  # Terminal typing effect
│   ├── AnalyticsProvider.tsx  # GA4 integration wrapper
│   ├── GoogleAnalytics.tsx    # Analytics script injection
│   ├── PiEasterEgg/      # Hidden Easter egg feature (14 files)
│   └── ui/
│       └── Button.tsx    # Reusable button component
├── hooks/
│   └── useTrackSection.ts  # Section visibility tracking hook
├── lib/
│   ├── data.ts           # All content data (single source of truth)
│   └── analytics.ts      # GA4 tracking utilities (35+ events)
└── types/
    └── index.ts          # TypeScript interfaces
```

---

## Design System

### Color Palette

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--bg-carbon` | Matte Carbon | `#111111` | Page background |
| `--surface-gunmetal` | Deep Gunmetal | `#1F1F1F` | Cards, surfaces, borders |
| `--text-primary` | White | `#FFFFFF` | Primary text, headings |
| `--text-secondary` | Cold Steel | `#94A3B8` | Secondary text, labels |
| `--accent-violet` | Royal Violet | `#7C3AED` | CTAs, highlights, metrics |

### Typography

- **Headings/Terminal:** JetBrains Mono (monospace)
- **Body Text:** Inter (sans-serif)
- Loaded via `next/font` for optimal performance

### Custom Effects

- `status-pulse` - Violet glow animation for status indicator
- `scanlines` - CRT-style overlay for images
- `cursor-blink` - Terminal cursor animation
- `text-gradient` - Violet gradient text effect

---

## Content Management

All portfolio content is centralized in `src/lib/data.ts`:

| Export | Type | Description |
|--------|------|-------------|
| `metrics` | `Metric[]` | Key achievement statistics (Telemetry Grid) |
| `experiences` | `Experience[]` | Work history with impacts and tech |
| `skills` | `Skill[]` | Skills organized by category |
| `socialLinks` | `SocialLink[]` | Contact links (LinkedIn, phone, email) |
| `badLabsCode` | `string` | Code block for Architecture Showcase |
| `heroContent` | `object` | Headline, subheader, CTA text |
| `hookQuote` | `string` | Featured philosophy quote |

### Updating Content

1. Edit `src/lib/data.ts`
2. Follow existing TypeScript interfaces in `src/types/index.ts`
3. Changes reflect immediately in development mode

---

## Component Architecture

All components use:
- `'use client'` directive (client-side rendering)
- Framer Motion for scroll-triggered animations
- `useInView` hook for viewport detection
- Staggered animation delays for visual polish

### Animation Pattern

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
>
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for "Ask Beau" AI chatbot. Get free key at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `RESEND_API_KEY` | Yes | Resend API key for contact form emails. Get key at [resend.com](https://resend.com/api-keys) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | Google Analytics 4 Measurement ID. Get from [analytics.google.com](https://analytics.google.com) (Admin > Data Streams > Web). Falls back to hardcoded ID if not set. |

---

## Deployment

### Vercel (Automatic)

Connected to GitHub for automatic deployments:
- Push to `main` triggers production deploy
- Pull requests generate preview deployments
- **Required:** Set `GEMINI_API_KEY` and `RESEND_API_KEY` in Vercel project settings

### Manual Deployment

```bash
npx vercel           # Deploy to preview
npx vercel --prod    # Deploy to production
```

---

## Analytics

Comprehensive Google Analytics 4 integration tracking:

- Section visibility and scroll depth
- Contact form interactions
- CTA and social link clicks
- Easter egg discovery
- Chatbot usage
- Device and session data

See `src/lib/analytics.ts` for all tracked events.

---

## Browser Support

- Chrome, Firefox, Safari, Edge (latest versions)
- Responsive: mobile-first with `sm`, `md`, `lg`, `2xl` breakpoints

---

## Hidden Features

**Easter Egg:** Click the π symbol in the footer to discover a hidden interactive feature with multiple phases including a hacking simulation and login challenges.

---

## License

Private project. All rights reserved.
