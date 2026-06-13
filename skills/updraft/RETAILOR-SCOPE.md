# UpDraft — Re-tailoring Flow Scope

**Goal:** existing MOD + new JD → new tailored resume, skipping the intake
(Stage 01) and interview (Stage 03) stages. The headline feature on the
v1.0 gate's §2 feature track (see `V1-GATE.md`).

Created 2026-06-13. Status: **scoped, Phase 1 in progress.**

---

## The core insight

Stage dispatch in [`src/app/updraft/[sessionId]/page.tsx`](../../src/app/updraft/[sessionId]/page.tsx)
is **derived from `stage_outputs` presence**, not a stage counter:

```
!stage_01.tier                 → Stage 01 (intake/parse)
!stage_02.acknowledged         → Stage 02 (JD/target + match)
!stage_03.ready_for_generation → Stage 03 (interview/MOD build)
else                           → Stage 04 (generate)
```

So re-tailoring is **not new flow**. A re-tailored session is a *new* session
**pre-seeded** with the source MOD's `stage_01` + `stage_03`, with `stage_02`
left empty. The dispatcher then:
1. skips Stage 01 (seeded `stage_01.tier` is present),
2. lands on Stage 02 (empty → enter the new JD/target),
3. on Stage 02 "Continue", jumps **straight to Stage 04** (seeded
   `stage_03.ready_for_generation` is already true → Stage 03 is skipped).

Verified safe: Stage 02's "Continue" only sets `stage_02.acknowledged`; it
never touches `stage_03` or calls `generate-summary` (that's Stage 03's job,
which we skip). The seeded MOD is not clobbered.

Stage02Runner + Stage04Runner are **reused unchanged.**

---

## Locked decisions (2026-06-13)

1. **Tailoring depth — include bullet rewriting.** Today's resume tailoring is
   shallow: `renderResumeDocx({ mod, target })` uses `target.role_title` only
   as the ATS headline; bullets render as-is. v1 re-tailoring will reframe the
   bullets against the JD (Phase 2). *What would invalidate:* if reframing
   proves low-value or too costly in practice, fall back to headline-only.

2. **Entry point — active-MOD button.** One primary "Tailor to a new role"
   action on the dashboard, enabled when an active MOD is set. Leans on the
   active-MOD pointer (shipped 2026-06-13). Per-row re-tailor deferred.

3. **Reframe batching — one Gemini call per role.** The `SYS_BULLET_REFRAMER`
   prompt is per-bullet, but per-bullet calls (20–40 per generate) blow cost +
   latency + session token caps. One call per role (~3–6 per generate) sends
   each role's bullet list together: the model sees role context, picks a
   strategy per bullet, truth-checks each. *What would invalidate:* if
   per-role responses drift or lose per-bullet truth-check fidelity, drop to
   spec-literal per-bullet for flagship roles only.

4. **Sequencing — Phase 1 first, then Phase 2.** Land the flow (headline-only
   tailoring) and verify end-to-end, then add the reframing pass. Each phase
   ships + verifies independently.

---

## Phase 1 — Re-tailoring plumbing (seed-and-skip) — BUILT 2026-06-13

- [x] `POST /api/updraft/sessions/retailor` — body `{ sourceSessionId }`
      (defaults to caller's active MOD). Validate source owned + has a ready
      MOD. Create new session; seed `stage_01` (identity / path / tier) +
      `stage_03` (mod + ready_for_generation + summary) from source; leave
      `stage_02` empty. Quota-gated like create. Log `retailor_started` with
      `source_session_id`. Return `{ sessionId, redirectTo }`.
- [x] `store.ts` — `createRetailoredSession()`: `createSessionForUser` +
      two `patchSessionStage` calls (stage_01 with tier/path columns, then
      stage_03). Validation reuses the `readSessionForUser` + `stage_03.mod`
      check. **Foot-gun caught:** tier lives in both `stage_01.tier` (dispatch)
      and the `sessions.tier` column (Stage 04 CL draft) — seed both.
- [x] `Dashboard.tsx` — "Tailor to a new role" button near the top, shown
      only when an active MOD is set; POSTs to the retailor endpoint and
      redirects into the new session's Stage 02.
- [x] Stage02Runner polish — "Tailoring your master profile" banner (detects
      re-tailoring via the seeded `stage_03`); deliverable picker defaults to
      jd_build + cover_letter when re-tailoring.
- [ ] Verify live: set active MOD → Tailor → lands on Stage 02 → enter JD →
      Continue jumps to Stage 04 → generate → new role-headlined docs.

## Phase 2 — JD bullet reframing (`SYS_BULLET_REFRAMER`)

A shared Stage-04 capability — improves the **normal flow's** tailored resume
too, not only re-tailoring.

- [ ] `lib/updraft/bullet-reframer.ts` — derive `target_jd_signal`
      (terminology / outcome_type / abstraction_preference / scale_signal)
      from the existing `match_analysis`; reframe each role's bullets in one
      Gemini call via `SYS_BULLET_REFRAMER`; enforce the 4-part truth check
      (return original bullet on failure); produce a `tailoredMod` used
      **only** for the resume render. Canonical MOD doc stays untailored.
- [ ] `generate-files` — when `jd_build` + target present, run the pass before
      `renderResumeDocx({ mod: tailoredMod, target })`. Gate on
      `canMakeAiCall`. **Non-blocking**: reframe failure falls back to
      untailored bullets, ships the resume, surfaces a banner. New
      `bullet_reframe_failed` event (the alert cron already watches failures).
- [ ] Run existing `lintMod` over reframed bullets as the safety net.
- [ ] Persist the reframe log (per-bullet strategy_used + truth_check) into
      `stage_04` outputs for transparency.
- [ ] Cost note: adds N (= role count) model calls to a generate that today
      makes 0–1 (CL only). Reflect in cost-guardrail docs.

---

## Pointers
- `references/lib-bullet-engineer.md` — the 4 reframing strategies + Truth Line.
- `references/lib-system-prompts.md` §SYS_BULLET_REFRAMER — the canonical prompt.
- `V1-GATE.md` §2 — re-tailoring is the headline feature-track item.
- Active-MOD pointer (the foundation) shipped 2026-06-13.
