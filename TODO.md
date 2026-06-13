# Portfolio TODO

> **Last updated:** 2026-06-12
> **Live:** beaudawson.com
> **Status:** All four surfaces shipped — portfolio, Blog (Terminal Notebook), Global
> Conflict Index, UpDraft v0.1.5 (unlinked). AskBeau recovered from the 2026-06-01
> `gemini-2.0-flash` retirement (now `gemini-3.5-flash`, env-dialable) and hard-scoped
> to Beau-only answers. **2026-06-12:** match-analyzer calibration merged (PR #6) +
> re-validated on 3.5; full 4-stage flow verified live. That run found two prod
> outages — Brevo email (IP-restriction, fixed) and **Drive PDF down (`403
> storageQuotaExceeded`)** → PDF being rebuilt on Sandbox + LibreOffice. See
> `skills/updraft/V1-GATE.md` + `DECISIONS.md` 2026-06-12.

---

## Needs a decision (don't delete, don't merge blindly)

- ✅ **`claude/review-updraft-launch-qMznh` branch — RESOLVED 2026-06-12.** Rebased onto
  main, re-validated on `gemini-3.5-flash`, merged via PR #6, branch deleted. The four
  scoring fixes hold on 3.5 (see `CALIBRATION.md` 2026-06-12). *(Kept here briefly as a
  closure note; safe to delete on the next TODO pass.)*
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

- ✅ Calibration merged (PR #6) + re-validated on 3.5; full 4-stage flow verified live.
- 🔴 **NEXT / blocker — PDF rebuild on Sandbox + LibreOffice.** Drive PDF is dead in prod
  (`403 storageQuotaExceeded` — service accounts have no My Drive quota). Decided to
  revert to Sandbox + LibreOffice; ~6–10h dedicated build behind the `renderPdf()`
  interface. Lead item of `V1-GATE.md` §2. (Until done: DOCX-only with banner.)
- Follow-up: add active alerting on `/api/updraft/status` failure counters (nothing was
  watching them — both outages today were found by hand).
- Remaining v0.5 parked items (see `skills/updraft/CALIBRATION.md`): per-bullet
  "✨ Rewrite with Audit" flow, Tier 3/4 deepening blocks, MOD Markdown export.
- Other v1.0 gate items (see `skills/updraft/V1-GATE.md` §2): re-tailoring flow,
  session-history UI, MODULES card promotion, BYOK fallback, template breadth.

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
