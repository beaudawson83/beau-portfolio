# UpDraft — Session Handoff (2026-06-13)

A rolling handoff to pass forward between sessions. **Next up: a testing
session (verify what shipped today), then a build session (re-tailoring
Phase 2).** Read this first, then the durable docs it points to.

---

## Orientation (for a fresh session)

- **Repo / working copy:** `~/Desktop/beau-portfolio` (the only authoritative
  local clone). Launch sessions from here.
- **What UpDraft is:** auth-gated résumé + cover-letter generator at the
  unlinked `/updraft` URL, operated by an AI character "Audit". 4-stage flow
  (intake → target → interview → generate). Not yet promoted to the homepage.
- **Workflow:** every change gets a commit; closing step is
  `git push origin HEAD:main` (Vercel auto-deploys). Keep the tree pristine.
- **Model:** Gemini `gemini-3.5-flash` (override via `GEMINI_MODEL`).
- **Durable docs:** [`V1-GATE.md`](V1-GATE.md) (road to public launch),
  [`RETAILOR-SCOPE.md`](RETAILOR-SCOPE.md) (re-tailoring design + phases),
  [`PLAN.md`](PLAN.md) (full inventory), [`DECISIONS.md`](DECISIONS.md),
  [`CALIBRATION.md`](CALIBRATION.md). All reconciled current as of 2026-06-13.

---

## What shipped this session (all on `main`, deployed)

| Commit | Summary |
|--------|---------|
| `049de5d` | **Failure-alert cron** `/api/updraft/cron/alert` (daily 08:00 UTC) — emails operator a 24h failure digest when failures ≥ `UPDRAFT_ALERT_MIN_FAILURES` (default 1); silent on a clean window. Closed the §1.4 alerting gap + reconciled the stale §1 checkboxes. |
| `ed67202` | **Active-MOD pointer** — dashboard lists sessions w/ target-role labels + status; user designates any finished session's MOD as the active master profile. Wired the missing setter + `PATCH /api/updraft/me/active-mod` + UI onto the pre-existing `active_mod_session_id` column (FK, ON DELETE SET NULL). |
| `00b15f3` | Re-tailoring **scope doc** + locked decisions. |
| `257968e` | **Re-tailoring Phase 1** — `POST /api/updraft/sessions/retailor` + `createRetailoredSession()` + "Tailor to a new role" dashboard button + Stage 02 banner. Seed-and-skip: a new session pre-seeded with the source MOD's stage_01 + stage_03 skips intake + interview, landing on Stage 02. |
| `6587167` | Docs freshness sweep (reconciled all code-facing docs; fixed pre-existing Drive/Sandbox drift). |

**v1.0-gate state:** §1 trust track fully closed. §2: active-MOD ✅ ·
re-tailoring Phase 1 ✅ (pending live check) · Phase 2 not built.

---

## SESSION N+1 — TESTING (do this next, fresh session)

Goal: verify the three things shipped today actually work in prod. Nothing
here needs code changes — it's pure verification.

**Constraints worth knowing:**
- **No local E2E** — `.env.local` has only `GEMINI_API_KEY` (no Supabase/Brevo),
  so the app can't run auth/sessions locally. Test against **prod**
  (beaudawson.com) or have Claude drive a connected browser.
- **A Chrome browser is connected**, so Claude *can* drive the test — but it
  needs to read the magic-link email from Gmail to log in, and it creates a
  real prod re-tailor session (+ one Gemini call if you generate). Either let
  Claude drive it (say so) or run the steps yourself.
- **Prereq:** at least one **COMPLETE** session must already exist (the
  2026-06-12 spot-check left one). If none, run a full session first.
- **IMPORTANT expectation-setter:** Phase 1 tailoring is **headline-only**.
  The re-tailored résumé will carry the new role title + filename but the
  **bullets are NOT reworded yet** — that's Phase 2. Do **not** log "bullets
  didn't change" as a bug. The thing to verify is the *flow + skip*, not bullet
  rewriting.

### ① Active-MOD pointer
1. Log in at `/updraft/login` (magic link).
2. Dashboard → find a `COMPLETE` session → click **Set as active MOD** →
   `ACTIVE MOD` badge appears.
3. **Reload** → badge persists *(proves the Supabase write)*.
4. Click **Unset** → clears → reload → stays cleared.

### ② Re-tailoring Phase 1 — the skip is the key assertion
5. With an active MOD set, click **Tailor to a new role**.
6. Confirm you land on **Stage 02** with the "Tailoring your master profile"
   banner and résumé + cover-letter **pre-checked**.
7. Paste any real job description → continue → match analysis → briefing →
   acknowledge.
8. **Confirm it jumps straight to Stage 04. Stage 03 (interview) must NEVER
   appear.** That's seed-and-skip working — the single most important check.
9. *(Optional — burns one cover-letter Gemini call)* Generate → docs download,
   headlined for the new role.

### ③ Failure-alert cron (no UI)
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://beaudawson.com/api/updraft/cron/alert
```
Expect `{"alerted":false,...}` on a clean window (no email sent). Proves
route + auth + Supabase read. Email path shares the working `lib/email.ts`.

**If anything fails:** capture the screen + the `/updraft/[id]` URL + the
browser console, and note which step. The likely failure points are (a) the
Supabase write in active-mod (check `setActiveModSession` in
`src/lib/updraft/store.ts`) and (b) the skip — if Stage 03 appears, the seeded
`stage_03.ready_for_generation` didn't take (check `createRetailoredSession`).

### Diagnostic anytime
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://beaudawson.com/api/updraft/status
```
Returns today's quota burn + env presence + 24h failure counts. No secrets.

---

## SESSION N+2 — Re-tailoring Phase 2 (JD bullet reframing)

The payoff that makes re-tailoring real — and it upgrades the **normal** flow's
tailored résumé too. Full plan: [`RETAILOR-SCOPE.md`](RETAILOR-SCOPE.md) Phase 2.

**Locked decisions (don't re-litigate):**
- Use the **already-spec'd** `SYS_BULLET_REFRAMER` (4 truth-preserving
  strategies; see `references/lib-bullet-engineer.md` + `references/lib-system-prompts.md`).
  It's spec'd but unimplemented — this is wiring, not prompt design.
- **One Gemini call per role** (not per-bullet, not whole-résumé) — the
  cost/quality balance point.
- Phase 2 only; Phase 1 already shipped.

**Build outline:**
1. `src/lib/updraft/bullet-reframer.ts` — derive `target_jd_signal`
   (terminology / outcome_type / abstraction_preference / scale_signal) from
   the existing `match_analysis`; reframe each role's bullets in one call;
   enforce the 4-part truth check (return original on failure); produce a
   `tailoredMod` used **only** for the résumé render. Canonical MOD doc stays
   untailored.
2. Wire into `generate-files` before `renderResumeDocx({ mod: tailoredMod, target })`,
   gated by `canMakeAiCall`. **Non-blocking** — reframe failure falls back to
   untailored bullets + ships the résumé + banner. Add a `bullet_reframe_failed`
   event (the alert cron already watches failure events).
3. Run existing `lintMod` over reframed bullets as the safety net.
4. Persist the per-bullet reframe log (strategy_used + truth_check) into stage_04.
5. Cost note: adds N (= role count) model calls to a generate that today makes
   0–1 (CL only) — reflect in cost-guardrail docs.

**After Phase 2, remaining §2 for promotion:** MOD Markdown export (quick) ·
BYOK · template breadth (1×1 → 4×3). Then §3 promotion (homepage MODULES card,
indexing posture, public-traffic caps).

---

## Gotchas a fresh session must know

- **Tier lives in TWO places:** `stage_outputs.stage_01.tier` (the
  `/updraft/[id]` dispatcher reads this) **and** the `sessions.tier` column
  (Stage 04 cover-letter draft reads this). Any session seeding/copying must
  set both, or CL generation fails `tier-missing`. `createRetailoredSession`
  already handles this.
- **Stage dispatch is derived from `stage_outputs` presence**, not a counter
  (see `src/app/updraft/[sessionId]/page.tsx`). This is *why* seed-and-skip
  works — pre-seeding stage_01 + stage_03 makes the dispatcher skip them.
- **PDF is native** (`pdf-builder.tsx`, `@react-pdf/renderer`) — no Drive, no
  Sandbox, no env var, $0. Don't reintroduce conversion. (`UPDRAFT_DAILY_PDF_CAP`
  is now vestigial; a background task is queued to remove it.)
- **Email** goes through Brevo via `lib/email.ts` (single send surface).
- **Supabase project:** single user-managed `ygvhoocbvraiplzmgufa`. Never
  attach the Vercel Marketplace Supabase integration (ghost-project trap).
- **Repo IS linked to Vercel** (`bad-labs-llc/beau-portfolio`); CLI v54 works.
  First move if `vercel` misbehaves: `vercel link --yes`.
- **External-boundary failures (email, Supabase writes) are invisible to
  typecheck/build** — they only surface on a live run. Desk-checking ≠
  verification. This is exactly why Session N+1 is a live test.
- **Local verification of doc render output IS possible** (useful for Phase 2):
  the `docx-builder`/`pdf-builder` modules are `server-only`. To run one under a
  standalone `tsx` harness, briefly truncate `node_modules/server-only/index.js`
  (uncommitted) and restore it after — do **not** use `--conditions=react-server`
  (it breaks `@react-pdf/renderer`'s React). Lets you eyeball a tailored résumé
  render without deploying.
