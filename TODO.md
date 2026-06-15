# Portfolio TODO

> **Last updated:** 2026-06-15
> **Live:** beaudawson.com
> **Status:** All four surfaces shipped and live — portfolio, Blog (Terminal Notebook),
> Global Conflict Index (now indexed), UpDraft v1.0 (promoted to homepage MODULES card).
> AskBeau on `gemini-3.5-flash` (env-dialable). UpDraft v1.0 gate closed 2026-06-15
> (see `skills/updraft/V1-GATE.md`). Global Conflict hardened + indexed 2026-06-15
> (sparkline backed by real data, noindex flipped).

---

## Needs a decision (don't delete, don't merge blindly)

- **Stale remote branches** — `claude/add-blog-feature-nIKFK` (old Contentful blog,
  merged + later ripped out), `claude/add-landing-page-button-HSZLg`,
  `claude/global-conflict-cleanup`, `claude/great-taussig-77c15a`,
  `claude/review-portfolio-website-6MhiJ`, `dev`. Review and prune on GitHub when
  convenient — nothing here deletes branches without explicit say-so.

---

## Blog (Terminal Notebook) — v2 items

- **2 posts published** (2026-05-02/03): "And." (NOTE, intro) and "Why Your New Hire
  Onboarding Is a System, Not Just a 'Vibe'" (OPS — was backlog item #3). Remaining
  drafted backlog:
  1. "Operations Is the Most Underleveraged Function in Your Company" — OPS
  2. "The Million-Dollar Billing Error Nobody Was Looking For" — OPS (Expedia story)
  3. "The Case for Fractional Ops Leadership" — FRACTIONAL
  4. "What Happens When Your AI Actually Works" — AI (Console + clients)
  5. "31 Promotions: How I Think About Growing People" — LEADERSHIP
  6. "I Automated 90% of CRM Admin. Here's What's Left." — AUTOMATION
  7. "Why I Built a CRM From Scratch" — CRM (Console origin)
- Flip `robots: noindex` → `index: true` in `src/app/blog/layout.tsx` once the index +
  article pages are SEO-tuned — posts exist now, so SEO tuning is the only blocker.
- Edit modals for table / chart / embed block data (v1 renders sample content).
- OG-image generation per post.
- Audio/video direct upload (URL-only today; deferred for cost/storage reasons).

## Global Conflict Index

- ✅ Sparkline backed by real per-conflict daily data (`conflict_daily_stats` table).
- ✅ `robots: noindex` flipped to `index: true` (2026-06-15).
- Update the daily Routine prompt to: (1) populate `displaced_7d`, `summary`,
  `resolution_outlook` per hotspot, and (2) insert a row into `conflict_daily_stats`
  per conflict per run. UI handles empty-state gracefully until populated.
- Phase 2: cross-prompt audit. Phase 3: ACLED/UCDP/SIPRI reconciliation. Phase 4: map UI
  layers (territory / belligerents / sponsors). (Parked — see CLAUDE.md.)

## UpDraft — v1.0 SHIPPED

v1.0 gate closed 2026-06-15. See `skills/updraft/V1-GATE.md` for the full record and
`skills/updraft/BACKLOG.md` for the post-v1.0 backlog (template breadth, BYOK,
conversational Stage 03, lint Phase 2, context caching).

## Portfolio site (no urgency)

- Social proof section (testimonials).
- Downloadable resume PDF link in hero / contact. (UpDraft could literally generate it.)
- Custom OG image for homepage social sharing (1200×630).
- Structured data (JSON-LD) for SEO.
- Lighthouse audit + perf pass.
- Migrate Supabase JWT keys → opaque keys (`sb_publishable_*` / `sb_secret_*`) — only if
  already rotating for another reason.

## Ops / hygiene

- `gemini-2.5-flash` retires 2026-10-16; `gemini-3.5-flash` (current default) will get a
  retirement date eventually. When it does: set `GEMINI_MODEL` in Vercel (AskBeau, no
  deploy) and bump the default in `src/lib/updraft/gemini.ts` (UpDraft, one line).
- If AskBeau ever returns `"source":"fallback"` on the live site, the model call is
  failing — check Vercel logs (error body is now logged) and `GEMINI_MODEL`.
