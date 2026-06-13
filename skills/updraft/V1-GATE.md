# UpDraft — v1.0 Gate

**What stands between today's shipped state and promoting UpDraft to the homepage `MODULES` card as `LIVE`.**

Created 2026-06-12. This is the working checklist for the road to v1.0. It is sequenced: the **Trust track** (§1) must close before the **Feature track** (§2) is worth finishing, and both must close before **Promotion** (§3). Update the checkboxes here as work lands; record *why* a decision was made in `DECISIONS.md`, design detail in `PLAN.md`, and prompt-tuning numbers in `CALIBRATION.md`.

Current shipped baseline: v0.1.5 + first v0.5 polish wave (see `PLAN.md` §8). Live at the unlinked `/updraft` URL with the Pi-egg reveal. Model default is `gemini-3.5-flash` as of 2026-06-10.

---

## The core problem this gate exists to fix

On 2026-06-10 UpDraft's model was force-migrated `gemini-2.0-flash → gemini-3.5-flash` after Google retired 2.0 (9-day silent outage behind graceful fallbacks — see `DECISIONS.md` 2026-06-10). Two consequences make the current production state *unproven*, not just *incomplete*:

1. **The match score runs on untrusted thresholds.** Every band threshold in `SYS_MATCH_ANALYZER` was calibrated against the now-dead 2.0 model. The match score is the single most user-facing number UpDraft produces ("how well do you fit this job"). It cannot be trusted until re-validated on 3.5.
2. **The tuning that *would* fix it is unmerged.** Branch `claude/review-updraft-launch-qMznh` (8 commits, no open PR) holds the calibration harness, a 49-pair anonymized corpus, and four scoring fixes — all developed and verified against 2.0. It is both a GitHub-hygiene loose end and the substance of the calibration work.
3. **The post-migration flow is only compile-verified.** The full 4-stage flow has not been run end-to-end live since the migration.

Until these close, promoting UpDraft publicly would put an unvalidated scoring engine in front of real users.

---

## §1 — Trust track (blocking, sequenced)

Close these in order. Step 1 unblocks 2–4.

### 1.1 — Re-run the 49-pair calibration sweep on `gemini-3.5-flash`
- [ ] Check out `claude/review-updraft-launch-qMznh`; the harness is `SYS_MATCH_ANALYZER` CLI + `--all-pairs` discovery mode against the 7-resume × 7-JD corpus (49 pairs).
- [ ] Run the full sweep on `gemini-3.5-flash` (the harness was last run on 2.0).
- [ ] Diff the 3.5 band/percentage results against the 2.0-era numbers recorded in `CALIBRATION.md`.
- **Cost note:** runs real Gemini calls against the live key — ~49 model hops + any `--all-pairs` discovery. Mind the daily quota.
- **Output:** a 3.5 results table appended to `CALIBRATION.md`.

### 1.2 — Validate or re-tune the four scoring fixes on 3.5
The branch's fixes were anchored to 2.0's behavior. Confirm each still does what its commit claims under 3.5:
- [ ] `tier`: 8–15yr `years_floor` softened 3→2 for career-changers (the "Theo" operations-engineer case → T2).
- [ ] `match-analyzer`: DIRECT band (90–100%) unlocked via second worked-example anchor (DIRECT was never emitted across 49 pairs on 2.0).
- [ ] `match-analyzer`: transferable evidence credited in the match boolean.
- [ ] `match-analyzer`: band/pct contract tightened + fallback.
- Re-anchor any worked example or threshold whose 2.0 calibration no longer holds on 3.5.

### 1.3 — Merge the calibration branch
- [ ] Open a PR for `claude/review-updraft-launch-qMznh` → `main` once 3.5 numbers justify the thresholds.
- [ ] Merge. Clears the unmerged-branch hygiene loose end.

### 1.4 — Live spot-check the full 4-stage flow on 3.5 — DONE 2026-06-12 (2 findings)
- [x] Ran a real session end-to-end via the live `/updraft` UI on `gemini-3.5-flash`.
- [x] Parse (correct name casing), tier (T4), match-analyze (**79% Transferable** — all four calibration fixes confirmed live + a bonus red-flag catch), Stage 03 deep parse, summary auto-draft, and **all three DOCX** (MOD + Resume + Cover Letter, CL drafted on 3.5) behave on 3.5. DOCX download (signed-URL 302) verified.
- **Finding 1 — Brevo email outage (FIXED in-session):** `auth/issue` 500'd on every send — Brevo "unrecognised IP address" 401 (Authorized-IPs vs Vercel rotating IPs). Same surface backs the contact form, so all site email was down. Disabled the restriction in Brevo; resolved. See `DECISIONS.md` 2026-06-12.
- **Finding 2 — Drive PDF export DOWN (OPEN, v1.0 blocker):** Stage 04 PDF failed all three (`updraft.pdf.upload` 403 `storageQuotaExceeded` — service accounts have no My Drive quota). Graceful degradation worked (DOCX shipped). Fix options in `DECISIONS.md` 2026-06-12; tracked under §2 PDF resilience.
- [ ] (Follow-up) Add active alerting on `/api/updraft/status` failure counters — nothing was watching them.

**Exit criteria for §1:** ✅ thresholds calibrated on live model · ✅ branch merged · ✅ full flow verified live · ⚠️ PDF export must be fixed (now a §2 blocker) before promotion.

---

## §2 — Feature track (the v1.0 "Complete" scope)

Per `PLAN.md` §8 the v1.0 line is: *all 4 templates × 3 densities · ATS quarterly parsing tests · BYOK with safety harness · session resumption · active-MOD pointer + session-history UI · re-tailoring flow · Sandbox+LibreOffice PDF if scale demands.* Pick by appetite — these are largely independent of each other. Suggested priority for "good enough to promote":

- [ ] **Re-tailoring flow** — existing MOD + new JD → new resume, skipping Stages 1–3. High user value, leverages everything already built.
- [ ] **Session-history UI + active-MOD pointer** — makes the dashboard a real workspace rather than a one-shot.
- [ ] **MOD Markdown export** — spec promises DOCX + PDF + **Markdown**; Markdown is the one still missing.
- [ ] **BYOK with safety harness** — the documented escape valve when a session hits the token cap; "built carefully or not at all" (`PLAN.md` decision #8).
- [ ] **Template breadth** — currently 1 template × 1 density (Classic); v1.0 target is 4 × 3 = 12.
- [ ] **PDF export — BLOCKER (broken in prod; fix path chosen = Sandbox + LibreOffice).** As of 2026-06-12 Drive returns 403 `storageQuotaExceeded` (service accounts have no My Drive quota); all PDF generation is down (DOCX-only with banner until fixed). **Decided 2026-06-12: rebuild on Vercel Sandbox + LibreOffice**, reversing the 2026-05-04 Drive pivot — removes the Google dependency entirely (see `DECISIONS.md`). Dedicated ~6–10h build: Dockerfile (LibreOffice + Liberation/DejaVu/Carlito/Croscore/Libertine fonts) → Sandbox driver in `pdf.ts` behind the existing `renderPdf()` → validate DOCX text layer survives (ATS-safe). Retry + DOCX-only degradation + `UPDRAFT_DAILY_PDF_CAP` already in place.

**Deferred / parked (not v1.0 blockers):**
- Conversational Stage 03 (Phase A–D rebuild) + its folded-in pieces: AI bullet rewriter, STAR extraction, tier deepening branches — see `CALIBRATION.md` §"Stage 03 deferred features".
- Lint Phase 2 (AI rewrite via `SYS_ANTIPATTERN_REVIEWER`).
- Target-JD seniority downshifting Audit voice (`PLAN.md` parked design changes).
- Gemini explicit context caching (cost optimization, not a gate).

---

## §3 — Promotion to `LIVE`

- [ ] §1 fully closed.
- [ ] Enough of §2 closed to stand as "Complete" (re-tailoring + session history + Markdown export is a defensible minimum).
- [ ] Add the UpDraft `MODULES` card on the homepage (`src/components/Modules/`), wired like the Blog / Global Conflict cards, status `LIVE`.
- [ ] Decide on indexing — UpDraft currently relies on being unlinked rather than `noindex`; confirm the desired discoverability posture before linking it publicly.
- [ ] Tune daily caps (`UPDRAFT_DAILY_*`, `UPDRAFT_PER_IP_*`) for public traffic, not single-tester traffic.

---

## Pointers
- `PLAN.md` — durable design + full route/lib/component inventory + phased roadmap (§8).
- `DECISIONS.md` — append-only rationale log; the 2026-06-10 migration entry is the origin of §1.
- `CALIBRATION.md` — match-analyzer tuning corpus + parked-features list. Calibration sweep results land here.
- Branch `claude/review-updraft-launch-qMznh` — unmerged calibration harness + corpus + four scoring fixes (§1.1–1.3).
