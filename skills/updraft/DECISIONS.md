# UpDraft — Decisions Log

Append-only record of architectural and product decisions. Each entry: **Decision · Alternatives considered · Rationale · What would invalidate it.**

When a decision is reversed, append a new entry referencing the old one — never edit history in place.

---

## 2026-05-03 — Folder cleanup + reorganization

**Decision:** Delete `updraft files/updraft UI/` (byte-identical duplicate of parent). Move 12 spec files into `references/` subfolder. Add `PLAN.md` and `DECISIONS.md` at folder root.

**Alternatives considered:** Leave flat layout, write the plan docs without restructuring.

**Rationale:** README explicitly references `references/stage-01-intake.md` etc. Reality didn't match the doc. Aligning now is cheaper than later.

**Invalidated by:** A future skill version that flattens the layout (would re-flatten and update README).

---

## 2026-05-03 — AI provider: Gemini, not Claude

**Decision:** Use Gemini (`gemini-2.0-flash` default) for all UpDraft model calls. Reserve `gemini-2.5-pro` for cover-letter draft if quality demands after testing.

**Alternatives considered:**
- Anthropic Claude (the spec was written Anthropic-shaped — skill files, voice loading, prompt caching).
- Vercel AI Gateway for multi-provider failover.

**Rationale:** Site already runs Gemini for AskBeau — same key, same billing, one provider relationship. Beau wants to stay with the existing key. Gemini's explicit context caching API gives us the cost lever for the heavy lib files. The "skill-as-orchestrator" pattern collapses cleanly to "system instruction = Audit voice + active stage prompt + cached lib refs" with Gemini.

**Invalidated by:** Sustained quality regression in Audit voice on Gemini, or a Gemini pricing/availability change that makes the swap to Claude or AI Gateway materially better.

---

## 2026-05-03 — PDF generation: Vercel Sandbox + custom LibreOffice image

**Decision:** Run `soffice --headless --convert-to pdf` inside a Vercel Sandbox microVM with a custom Debian-slim image baking in LibreOffice + the Liberation/DejaVu/Carlito/Croscore/Libertine font families.

**Alternatives considered:**
- External API (CloudConvert / Aspose Cloud) — adds vendor dependency + per-conversion cost.
- DOCX-only first, PDF later — feasible but defers a non-negotiable feature (spec mandates DOCX-derived PDF for ATS text-layer integrity).
- Custom HTML-to-PDF renderer (Puppeteer) — re-renders, breaks text-layer fidelity, fails ATS.

**Rationale:** Sandbox is officially supported (GA Jan 2026), and the only path that preserves the DOCX text layer through to PDF without a third-party vendor. Custom image keeps cold-start manageable.

**Risks acknowledged:** new product (pricing/API may shift); cold start 5–15s; Active CPU billing scales with concurrency.

**Mitigations:** provider-agnostic `renderPdf(docxBytes)` interface (swappable in <1 day); hard daily Sandbox-invocation cap; single-flight lock per session; DOCX-only fallback when Sandbox unavailable.

**Invalidated by:** Sandbox sunset, pricing change that makes per-conversion cost untenable, or inability to bake LibreOffice into the image reliably.

---

## 2026-05-03 — Storage: Supabase only

**Decision:** All UpDraft persistence (users, sessions, events, exports, quotas, magic tokens) lives in the existing Supabase project `ygvhoocbvraiplzmgufa`. Exports use a new Storage bucket `updraft-exports` (signed-URL reads, write-once).

**Alternatives considered:** Vercel Blob, Vercel Postgres (sunset), separate Supabase project, S3.

**Rationale:** Single-store goal across the site. Existing patterns (blog, conflict) already use Supabase with the marketplace-trap-aware env resolution in `lib/supabase.ts`. Reusing keeps the operational footprint and the diagnostic patterns unified.

**Invalidated by:** Supabase storage cost issues at scale, or a need to host PII outside the existing project's compliance posture.

---

## 2026-05-03 — Auth: magic-link from day one (was: anonymous + 30-day purge for v0.1–v1.0)

**Decision:** Magic-link authentication via Resend, required from v0.1. No anonymous-session layer. User accounts persist indefinitely until manual delete. **Combined with** a 30-day purge of session-level data (sessions, events, exports) by `last_activity_at`, plus a per-session `keep_indefinitely` flag and a one-click full-account delete from the account page.

**Alternatives considered:**
- Anonymous sessions with `session_token` cookie + 30-day purge for v0.1–v1.0; magic-link upgrade in v1.5 (originally proposed earlier in this thread).
- Username + password — too much surface for a small product.
- OAuth (Google/GitHub) — too much friction + provider dependency.

**Rationale:** Anonymous sessions create PII liability without an owner who can recall the data — there's no way to honor delete requests for un-authenticated users. Magic-link from day one eliminates that, removes the v1.5 anonymous-to-authenticated migration entirely, and lets users return to past sessions immediately. Resend is already wired for the contact form, so email infrastructure cost is zero. Combined with the 30-day session purge, this gives the strongest privacy posture: authenticated identity for accountability, automated purge for liability cap, and manual override (delete-anytime + per-session keep flag) for user control.

**Privacy statement requirement:** the login page reserves a `<PrivacyCallout>` slot above the email input covering (1) why login, (2) 30-day purge guarantee, (3) delete-anytime promise. Final verbiage owned by Beau; engineering ensures the slot exists, is prominent, and is not skippable.

**Invalidated by:** Resend pricing/availability change (would swap to AWS SES or similar with same flow), or product evidence that login friction kills v0.1 testing engagement.

---

## 2026-05-03 — Retention: 30-day purge + per-session keep flag + manual delete + data export

**Decision:** Default 30-day auto-purge based on `last_activity_at`. Users can mark individual sessions as "kept indefinitely" via a per-session flag (defaults off — explicit opt-in). One-click full-account delete cascades through all session/event/export/token rows + Storage files. `/api/updraft/me/data-export` returns a self-serve archive (offered before manual delete in the UI flow).

**Alternatives considered:**
- Indefinite retention with manual delete only — looser; more PII liability.
- Shorter purge (7 or 14 days) — too aggressive for a tool people use across multiple sessions.
- No keep-flag — forces re-uploads if a user wants to come back later.

**Rationale:** 30 days is long enough for typical re-engagement, short enough to bound the PII window. Keep-flag preserves user autonomy without making indefinite the default. Data-export + delete endpoints satisfy GDPR/CCPA portability + erasure expectations even though we're not strictly subject to them — Beau wants the privacy posture regardless.

**Invalidated by:** Legal/regulatory requirement for shorter retention, or product evidence that 30 days is too short for normal re-engagement patterns.

---

## 2026-05-03 — Cost guardrails: env-var caps + owner bypass

**Decision:** All thresholds (per-session, per-IP, daily global) set as env vars and dialable from the Vercel dashboard with no redeploy. Owner bypass via `UPDRAFT_OWNER_SECRET` Bearer header (mirrors `BLOG_EDITOR_SECRET` pattern), with `owner: true` event tag for clean analytics.

**Alternatives considered:**
- Hardcoded constants (forces redeploy per tweak).
- Vercel Edge Config for live tuning (adds a moving part for v0.1).
- IP whitelist for owner (less reliable across networks — phone, laptop, hotspot, café).

**Rationale:** Beau needs to test extensively to calibrate real-world numbers. Env vars + owner bypass keeps it boring, operational, and inspectable.

**Invalidated by:** Need for sub-minute cap adjustments (would push to Edge Config) or multi-owner collaboration (would push to a proper admin role).

---

## 2026-05-03 — BYOK fallback: deferred to v1.0

**Decision:** Bring-your-own Gemini key feature ships at v1.0, not earlier.

**Alternatives considered:** Ship at v0.1 (riskier, less abuse signal); never ship (closes off a real fallback for cap'd users).

**Rationale:** BYOK done well = sessionStorage-only, server forwards-and-forgets, redacted everywhere. BYOK done rushed = key leakage. v0.5 traffic will tell us whether real users actually hit the caps and want the fallback. Better data → better safety harness.

**Invalidated by:** Hard cap-hit pattern in v0.1/v0.5 traffic forcing BYOK earlier, or a security review that pushes it later still.

---

## 2026-05-03 — Phased rollout: v0.1 → v0.5 → v1.0 → v1.5 → v2.0+

**Decision:** Five phases, each independently shippable. v0.1 is a vertical slice (one tier, one path, one template, two deliverables). Each subsequent version adds one or two scope dimensions.

**Alternatives considered:** Big-bang v1.0 (full spec, all templates, all tiers, all deliverables) — tempting, but risks shipping nothing for months.

**Rationale:** Spec is large enough that vertical slicing dominates horizontal layering. Vertical slice surfaces integration risks (Sandbox PDF, lint pass, magic-link auth, quota model) before they compound. Each subsequent layer is a known scope dimension we can scope-cut if v0.1 discovery surprises us.

**Invalidated by:** v0.1 discovery showing the architecture itself needs rethinking (would force a re-plan, not a re-phase).

---

## 2026-05-03 — Entry surface phasing

**Decision:** v0.1 lives at an unlinked `/updraft` URL Beau shares manually with friends. v0.5 exposes via the existing Pi-egg reveal flow. v1.0 promotes to a MODULES card with `LIVE` status.

**Alternatives considered:** MODULES card from day one (too much exposure for a half-built feature), Pi-egg from day one (fine, but needs a Pi-egg flow update before testing can start — adds a dependency).

**Rationale:** Smallest blast radius first. Beau controls v0.1 access entirely by who he shares the URL with. Pi-egg gating earns the next traffic tier. MODULES card is the GA milestone.

**Invalidated by:** Decision to launch publicly earlier (would skip Pi-egg phase).

---

## 2026-05-04 — Match-analyzer prompt tuning parked to v0.5

**Decision:** Ship v0.1's `SYS_MATCH_ANALYZER` with the canonical prompt as-is plus the runtime `TARGET_EXTRACTION_INSTRUCTION` addendum. Park prompt-quality tuning to v0.5. Track all known issues, observed failure cases, and the test-harness wishlist in `skills/updraft/CALIBRATION.md`.

**Alternatives considered:**
- Tune the prompt now during v0.1. Tempting, but premature — prompt tuning is iterative empirical work that needs a calibration corpus to score against. Without ground-truth examples, edits are guesses.
- Ship without flagging the issue. Worse — Beau's first live test (a Customer Experience exec resume vs. a physical multi-unit travel-center Director of Operations role) returned 62.5% / `ADJACENT` when the realistic match is `GAP`. Surface keyword matching beat contextual scale-and-category checks. UpDraft's whole brand is "blunt, honest, no sugarcoating" — leaving a generosity bias unflagged would actively work against the product mission.

**Rationale:** v0.1's job is "the pipeline works end-to-end." It does — schema validates, persistence works, retry path works, briefing renders, token usage records. Quality tuning is its own phase with its own deliverables: a CLI test harness, a benchmark fixture corpus (Beau is collecting examples now, both good matches and bad), and a documented tuning workflow that catches regressions on good cases when fixing bad ones. Shipping that all together as a single coherent v0.5 deliverable will be cleaner than blending it into v0.1.

**Known issues captured in `CALIBRATION.md`:**
1. Surface-level keyword matching over-matches required skills (industry-name overlap ≠ industry experience).
2. Missing category-mismatch detector — digital CX leader → physical retail ops should auto-cap at `WEAK`.
3. `strengths_to_emphasize` echoes matched required skills instead of distinct selling points.
4. Confidence band over-generosity — `ADJACENT` band absorbs scores that should land in `GAP`.

**Benchmark #1 (Vaughan / Beau resume):** documented in `CALIBRATION.md` with both the result returned (62.5% `ADJACENT`, 4/5 ✓, 2 `major` gaps) and the expected result after tuning (< 45% `GAP`, ≤ 1/5 ✓, ≥ 1 `critical` category-mismatch gap). Beau is collecting more cases.

**Invalidated by:** Discovery that v0.1's analyzer quality is *worse* than expected and damaging trust in early test traffic — would force tuning earlier, possibly as a v0.1.1 patch rather than waiting for v0.5.
