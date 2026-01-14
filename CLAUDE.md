# CLAUDE.md - AI Coding Assistant Context

This file provides context for AI coding assistants (Claude, Cursor, Copilot, etc.) working on this codebase.

---

## Project Overview

**Beau Dawson Portfolio** - A professional portfolio website for an Operations Director and AI Architect. The site uses a "System Architecture" theme with mission-critical dashboard aesthetics, industrial minimalism, and terminal-inspired UI patterns.

**Stack:** Next.js 16.1.1 + React 19.2.3 + TypeScript 5.x + Tailwind CSS 4.x + Framer Motion 12.x
**Deployment:** Vercel (automatic via GitHub)
**Live URL:** Deployed on Vercel

---

## Architecture Decisions

### Why These Choices Were Made

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Modern React patterns, built-in optimization, Vercel integration |
| All client components | Heavy animation requirements via Framer Motion |
| Centralized data file | Single source of truth for content, easy updates |
| CSS variables for theming | Consistent design tokens, easy theme modifications |
| No external CMS | Simple portfolio, content rarely changes |

### Key Conventions

1. **Components are self-contained** - Each section is one component
2. **Data lives in `src/lib/data.ts`** - Never hardcode content in components
3. **Types in `src/types/index.ts`** - All interfaces defined centrally
4. **Animations use Framer Motion** - Not CSS animations (except utility classes)
5. **Tailwind for layout/spacing** - CSS variables for colors

---

## File Quick Reference

| File | Purpose | When to Modify |
|------|---------|----------------|
| `src/lib/data.ts` | All content (metrics, experiences, skills, etc.) | Content updates |
| `src/types/index.ts` | TypeScript interfaces | Adding new data structures |
| `src/app/globals.css` | Theme colors, animations, utility classes | Design system changes |
| `src/app/layout.tsx` | Fonts, metadata, SEO | SEO updates, adding scripts |
| `src/app/page.tsx` | Page composition | Adding/removing sections |
| `src/components/*.tsx` | Individual sections | UI/layout changes |
| `src/components/PiEasterEgg/*` | Hidden Easter egg feature | Easter egg behavior |
| `src/components/ChaosToClarity/*` | Particle animation system | Animation config |
| `src/lib/analytics.ts` | GA4 tracking utilities | Analytics events |
| `src/hooks/useTrackSection.ts` | Section visibility tracking | Tracking behavior |
| `src/app/api/contact/route.ts` | Contact form email handler | Email template, Resend config |
| `src/app/api/ask-beau/route.ts` | AI chatbot endpoint | Gemini config, system prompt, fallback responses |

---

## Code Patterns

### Component Structure

All components follow this pattern:

```tsx
'use client';

import { motion } from 'framer-motion';
import { dataImport } from '@/lib/data';

export default function ComponentName() {
  return (
    <section id="section-id" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Content */}
        </motion.div>
      </div>
    </section>
  );
}
```

### Animation Patterns

**Fade-in on scroll:**
```tsx
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
transition={{ duration: 0.6 }}
```

**Staggered children:**
```tsx
transition={{ duration: 0.6, delay: index * 0.1 }}
```

**Count-up animation (TelemetryGrid):**
- Uses `requestAnimationFrame` with easing
- Triggered by `useInView` from Framer Motion

### Styling Patterns

**Color usage:**
```tsx
// Backgrounds
className="bg-[#111111]"        // Carbon (page bg)
className="bg-[#1F1F1F]"        // Gunmetal (cards)

// Text
className="text-white"          // Primary
className="text-[#94A3B8]"      // Secondary/muted

// Accent
className="text-[#7C3AED]"      // Violet (highlights)
className="bg-[#7C3AED]"        // Violet (buttons)
```

**Font usage:**
```tsx
className="font-mono"           // JetBrains Mono (terminal elements)
className="font-sans"           // Inter (body text) - default
```

---

## Common Tasks

### Adding a New Metric

1. Edit `src/lib/data.ts`:
```ts
export const metrics: Metric[] = [
  // ... existing metrics
  {
    label: 'NEW_METRIC',
    value: '100%',
    context: 'Description',
    source: 'Company',
  },
];
```

### Adding a New Experience Entry

1. Edit `src/lib/data.ts`:
```ts
export const experiences: Experience[] = [
  {
    yearRange: '2024 - Present',
    company: 'COMPANY_NAME',
    role: 'Role Title',
    impacts: ['Impact statement 1', 'Impact statement 2'],
    tech: ['Technical achievement'],  // optional
    isLegacy: false,                  // true = collapsed by default
  },
  // ... existing experiences
];
```

### Adding a New Section

1. Create `src/components/NewSection.tsx` following the component pattern above
2. Import and add to `src/app/page.tsx`:
```tsx
import NewSection from '@/components/NewSection';

export default function Home() {
  return (
    <main>
      {/* ... existing sections */}
      <NewSection />
    </main>
  );
}
```

### Modifying the Color Scheme

Edit `src/app/globals.css`:
```css
:root {
  --bg-carbon: #111111;
  --surface-gunmetal: #1F1F1F;
  --accent-violet: #7C3AED;
  /* ... */
}
```

---

## TypeScript Interfaces

```ts
// src/types/index.ts

interface Metric {
  label: string;      // e.g., 'REV_RECOVERED'
  value: string;      // e.g., '$1,000,000+'
  context: string;    // e.g., 'Billing Logic'
  source: string;     // e.g., 'Expedia'
}

interface Experience {
  yearRange: string;  // e.g., '2022 - 2025'
  company: string;    // e.g., 'UNION'
  role: string;
  impacts: string[];
  tech?: string[];
  isLegacy?: boolean; // Collapsed in "Legacy_Data" section
}

interface Skill {
  category: string;   // e.g., 'AI & Automation'
  items: string[];
}

type ContactObjective =
  | 'full-time'      // Full-Time Director
  | 'fractional'     // Fractional Deployment
  | 'project'        // Project-Based Engagement
  | 'consulting'     // Consulting / Advisory
  | 'speaking'       // Speaking / Workshop
  | 'connecting';    // Just Connecting

// Maps objective values to display labels
const OBJECTIVE_LABELS: Record<ContactObjective, string> = {
  'full-time': 'Full-Time Director',
  'fractional': 'Fractional Deployment',
  'project': 'Project-Based Engagement',
  'consulting': 'Consulting / Advisory',
  'speaking': 'Speaking / Workshop',
  'connecting': 'Just Connecting',
};

interface ContactFormData {
  name: string;
  objective: ContactObjective;
  message: string;
}

interface SocialLink {
  label: string;
  url: string;
  type: 'linkedin' | 'phone' | 'email';
}
```

---

## Testing Changes

1. **Development:** `npm run dev` - Hot reload at localhost:3000
2. **Production build:** `npm run build` - Check for TypeScript/build errors
3. **Linting:** `npm run lint` - ESLint checks

### Visual Checklist

- [ ] Responsive: Test mobile (375px), tablet (768px), desktop (1280px), ultrawide (1920px+)
- [ ] Animations: Scroll through page, verify fade-ins trigger once
- [ ] Links: Test all navigation and external links
- [ ] Contact Form: Test form submission (sends via Resend API)
- [ ] Ask Beau: Test AI chatbot responses (uses Gemini API with fallback)

---

## Don'ts - Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| Hardcode content in components | Use `src/lib/data.ts` |
| Use CSS animations for complex motion | Use Framer Motion |
| Add inline colors | Use CSS variables or Tailwind classes |
| Create new TypeScript interfaces in components | Add to `src/types/index.ts` |
| Use `px` for spacing | Use Tailwind spacing utilities |
| Remove `'use client'` directive | Required for Framer Motion |
| Add server-side data fetching | This is a static portfolio |

---

## Build Commands

```bash
npm run dev      # Development server with hot reload
npm run build    # Production build (outputs to .next/)
npm run start    # Serve production build locally
npm run lint     # Run ESLint
```

---

## Deployment Notes

- **Platform:** Vercel
- **Trigger:** Automatic on push to `main`
- **Preview:** PRs generate preview deployments
- **Environment Variables Required:**
  - `GEMINI_API_KEY` - Google Gemini API key for "Ask Beau" chatbot
  - `RESEND_API_KEY` - Resend API key for contact form emails
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics 4 Measurement ID (optional, has fallback)

---

## Analytics Integration

The portfolio includes comprehensive GA4 tracking via `src/lib/analytics.ts`:

**Tracked Events:**
- Section visibility (Hero, TelemetryGrid, ChangeLog, etc.)
- Contact form interactions (start, submit, success, error)
- CTA button clicks with location context
- Social link clicks
- Easter egg discovery and phases
- Chatbot interactions (open, messages, limit reached)
- Device and session info
- Scroll depth and engagement milestones

**Custom Hook:** `useTrackSectionWithRef` - Tracks section visibility using IntersectionObserver

---

## API Routes

### Contact Form (`/api/contact`)

Handles contact form submissions via Resend email service.

**Request:**
```ts
POST /api/contact
{
  name: string;
  objective: ContactObjective;
  message: string;
}
```

**Response:** Sends terminal-themed HTML email to configured recipient.

### Ask Beau (`/api/ask-beau`)

AI chatbot powered by Google Gemini 2.0 Flash with intelligent fallback responses.

**Request:**
```ts
POST /api/ask-beau
{
  messages: Array<{ role: 'user' | 'model'; text: string }>;
}
```

**Features:**
- Multi-turn conversation support (maintains context)
- System prompt with Beau's background and expertise
- Deterministic fallback responses when API unavailable/rate-limited
- Response length capped at ~150 words for conciseness

---

## Easter Egg Feature (PiEasterEgg)

A hidden interactive feature triggered by clicking the π symbol in the footer.

**Location:** `src/components/PiEasterEgg/`

**Phases:**
1. **Idle** - π symbol visible but inactive
2. **Hacking** - Fake "hacking" animation with 8 different agency login screens
3. **Login** - Two-step challenge (code puzzle + Star Trek quote)
4. **Dashboard** - Success screen after completing challenges

**Files:**
- `index.tsx` - Main state machine
- `PiSymbol.tsx` - Clickable trigger
- `HackingSequence.tsx` - Multi-screen hacking animation
- `TerminalLogin.tsx` - Challenge screens
- `Dashboard.tsx` - Success state
- `screens/*.tsx` - Individual fake login screens (8 total)
- `codeChallenge.ts` - Programming puzzle logic
- `starTrekQuotes.ts` - Quote database for challenge

---

## Component Architecture

**Section Components:** All use consistent patterns:
- `'use client'` directive for Framer Motion compatibility
- `useInView` hook for scroll-triggered animations
- `useTrackSectionWithRef` for analytics integration
- Staggered animation delays (index * 0.1s)

**Page Composition Order:** (from `src/app/page.tsx`)
1. Header (fixed)
2. Hero (with AskBeau chatbot)
3. TelemetryGrid (metrics with count-up)
4. ChaosToClarity (particle animation)
5. ArchitectureShowcase (code display)
6. ChangeLog (experience timeline)
7. SystemKernel (skills grid)
8. SystemMonitor (chart visualization)
9. HookSection (philosophy quote)
10. Footer (contact form)
11. PiEasterEgg (hidden overlay)
