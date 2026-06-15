# UpDraft — Post-v1.0 Backlog

Everything parked after the v1.0 promotion (2026-06-15). Items are
grouped by theme, not priority. Pick by appetite and user demand.

---

## Template breadth

**Summary:** Currently 1 template (Classic) × 1 density (Regular).
The original v1.0 target was 4 templates × 3 densities = 12 variants.

**Notes collected:**
- DOCX templates live in `docx-builder.ts`, PDF templates in `pdf-builder.tsx`. Adding a template means a new layout function in each.
- Density = how much whitespace / how compact the layout is (Regular / Condensed / Expanded).
- ATS safety is non-negotiable — single column, no tables-as-layout, real text layer.
- Research needed: find open-source / freely-licensed resume template repos that can inform layout design without IP risk.

**Status:** Research project — needs a survey of available template sources before scoping the build.

---

## BYOK (Bring Your Own Key)

**Summary:** Let users supply their own Gemini API key when they hit the
daily token cap, so they can keep generating without waiting for the
quota to reset.

**Notes collected:**
- `PLAN.md` decision #8: "built carefully or not at all."
- Needs: key validation before use, sandboxing (their key only used for their session), clear billing boundary, error handling when their key is invalid/exhausted.
- Current escape valve: users can download their MOD (DOCX/PDF/Markdown) and take it to another tool.

**Status:** Back-benched. The download-and-go path covers the need for now. Revisit when daily caps become a real friction point with actual users.

---

## Conversational Stage 03 (Phase A–D rebuild)

**Summary:** The spec describes a full conversational interview where
Audit pulls metrics, scope, and stories out of the user interactively.
v1.0 ships a form-based "review + augment + summarize" flow instead.

**Notes collected (from CALIBRATION.md §"Stage 03 deferred features"):**

1. **AI bullet rewriter (`SYS_BULLET_REWRITER`)** — Audit extracts metric / scope / comparison from the user, then rewrites weak bullets. Without conversational extraction, it just rephrases (false fluency, no value). Fix shape: per-bullet "Rewrite with Audit" modal with extraction inputs, or full Phase B chat per role.

2. **Phase C "surface the undocumented"** — Audit listens for buried experience (cross-functional work, hiring scope, crisis-response) and reflects it back. Needs the chat surface.

3. **Phase D skill surfacing card** — Per-role AI-generated skill list with evidence + confirm/reject UI. Only worth building once chat exists to gather the material.

4. **STAR story extraction (Tier 3+)** — "What's the single thing from this role you'd lead with in an interview?" walks through Situation → Task → Action → Result. Pure Tier 3+ deepening.

5. **Tier 1 / 3 / 4 deepening branches** — v1.0 only handles Tier 2 (cross-role through-line, tools, interview objections). Other tiers: projects/coursework (T1), leadership brand + cross-functional scope (T3), transformation arc + board/advisory (T4).

6. **Tier-bump mid-interview** — if a T2 user demonstrates T3 thinking, Audit offers a tier bump. Requires conversational signal-reading.

**Status:** All gated on the conversational Stage 03 surface. Large scope — its own project.

---

## Lint Phase 2 (AI rewrite)

**Summary:** Today's lint pass (`lintMod`) is regex-based pattern
detection (antipatterns like "Responsible for…", vague claims, etc.).
Phase 2 would add AI-powered rewrite suggestions via a
`SYS_ANTIPATTERN_REVIEWER` prompt.

**Notes collected:**
- Phase 1 (regex detection) is shipped and also used as the safety net for bullet reframing (lint regression guard).
- Phase 2 would show the user flagged bullets + AI-suggested rewrites with accept/reject.
- Depends on the conversational Stage 03 surface for the best UX (inline rewrite in context).

**Status:** Blocked on conversational Stage 03 for full value. Could ship a limited "review panel" version independently.

---

## Target-JD seniority downshifting Audit voice

**Summary:** For someone senior in industry A pivoting to industry B at
a junior level, the tier system computes seniority by experience only.
A smarter version would let the target JD's seniority level pull Audit's
voice down a notch independently.

**Notes collected (from PLAN.md):**
- The user-override tier selector is the current escape valve.
- Real design change — the tier is a single number today; this would add a second axis (target seniority).

**Status:** Design problem, not a code problem. Deserves its own scoping session.

---

## Gemini explicit context caching

**Summary:** Gemini supports caching large context blocks across calls.
UpDraft's system prompts are large and repeated across stages — caching
could cut token costs significantly.

**Notes collected:**
- Cost optimization, not a feature.
- Most impactful for heavy users (multiple generates in one session).
- Implementation: cache the system prompt + skill-file context at session start, reference the cache ID in subsequent calls.

**Status:** Pure cost optimization. Worth doing when Gemini usage costs become material.

---

## Pointers

- `V1-GATE.md` — the gate checklist (now closed for v1.0 promotion).
- `CALIBRATION.md` §"Stage 03 deferred features" — detailed notes on items 1–6 above.
- `PLAN.md` §8 roadmap table — v0.5 row lists the original scope for most of these.
- `PLAN.md` parked design changes — the seniority-downshift note.
