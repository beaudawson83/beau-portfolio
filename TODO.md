# Portfolio TODO

> **Last updated:** 2026-06-10
> **Live:** beaudawson.com
> **Status:** All four surfaces shipped — portfolio, Blog (Terminal Notebook), Global
> Conflict Index, UpDraft v0.1.5 (unlinked). AskBeau recovered from the 2026-06-01
> `gemini-2.0-flash` retirement (now `gemini-3.5-flash`, env-dialable) and hard-scoped
> to Beau-only answers. Docs refreshed 2026-06-10.

---

## Needs a decision (don't delete, don't merge blindly)

- **`claude/review-updraft-launch-qMznh` branch** — 8 unmerged commits from the May
  calibration pass: anonymized 7×7 resume/JD corpus, `npm run calibrate:match` CLI
  harness, three `SYS_MATCH_ANALYZER` prompt fixes (null-band contract, transferable-
  evidence credit, DIRECT-band unlock), and a tier-classifier years_floor fix. This is
  the "v0.5 match-analyzer tuning" that CALIBRATION.md parks — the work exists, it just
  never merged. Decide: rebase onto current main and merge, or mine the prompt fixes
  manually. Note the prompts may interact with the since-shipped v0.5 polish wave, and
  the tuning was validated against `gemini-2.0-flash` — re-run the calibration sweep on
  `gemini-3.5-flash` before trusting the numbers.
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

- Update the daily Routine prompt to populate the per-conflict narrative fields added in
  the May UI pass: `displaced_7d`, `summary`, `resolution_outlook` (UI currently renders
  empty-state placeholders).
- Flip `robots: noindex` when the experience is hardened.
- Phase 2: cross-prompt audit. Phase 3: ACLED/UCDP/SIPRI reconciliation. Phase 4: map UI
  layers (territory / belligerents / sponsors). (Parked — see CLAUDE.md.)

## UpDraft — road to v1.0

- Merge-or-mine the calibration branch (see "Needs a decision" above), then re-run the
  49-pair sweep against `gemini-3.5-flash`.
- Remaining v0.5 parked items (see `skills/updraft/CALIBRATION.md`): per-bullet
  "✨ Rewrite with Audit" flow, Tier 3/4 deepening blocks, MOD Markdown export.
- v1.0 gate items (see `skills/updraft/PLAN.md`): MODULES card promotion on the
  homepage, BYOK fallback, sandbox/LibreOffice PDF path if scale demands self-hosted.

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
