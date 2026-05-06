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

---

## 2026-05-04 — Email provider: Brevo, not Resend

**Decision:** Replace Resend with Brevo as the transactional email provider for both the contact form and UpDraft magic-link auth. Consolidate sending behind a single `src/lib/email.ts` so future provider swaps are one-file changes.

**Reverses:** the implicit "Resend is fine" assumption baked into the original auth decision (2026-05-03 — *Auth: magic-link from day one*), which justified Resend by saying it was "already wired for the contact form, so email infrastructure cost is zero."

**Alternatives considered:**
- **Pay Resend Pro ($20/mo).** Lowest engineering effort. Rejected because the cost is real now and only justified once UpDraft proves out — premature.
- **SendGrid free tier (100/day, domain verification on free).** Equivalent capability to Brevo, slightly more API surface. Reasonable runner-up.
- **AWS SES.** Cheapest at scale ($0.10 per 1,000) but requires IAM + sandbox-then-production lift; mismatch for v0.1 stage.
- **Use Beau's existing Google Workspace or M365 SMTP.** Considered — both pre-paid, no extra cost. Rejected: both Google and Microsoft explicitly say SMTP AUTH is for human-to-human correspondence, not transactional. Magic-link patterns trigger both providers' abuse detection (account suspension risk), throttle rapidly, and deliver poorly to non-Google/non-MS inboxes for transactional patterns. Coexistence is the right shape — Workspace keeps handling Beau's day-to-day inbound; Brevo handles outbound transactional under a verified subdomain.

**Why Resend failed for our use case:** The Resend free tier sandboxes the from-address to `onboarding@resend.dev`, which only delivers to the email of the Resend account owner. The contact form was working because it sent TO Beau's own inbox. UpDraft magic-link auth sends TO arbitrary users — Resend rejected those sends with 403/422, and the route returned 500 to the client. Beau's husband couldn't sign in. Domain verification (which would lift the sandbox restriction) requires Resend Pro at $20/mo as of 2026-05-04 — that's a paywall I missed when I picked Resend.

**Architectural improvement that came with the swap:**

- New `src/lib/email.ts` with a provider-agnostic `sendEmail({ to, subject, html, text, fromName?, replyTo? })` signature. Both `/api/contact` and `/api/updraft/auth/issue` consume it.
- New `MAIL_FROM_ADDRESS` env var (format: `"UpDraft <noreply@mail.beaudawson.com>"` or just the email). Replaces the hardcoded `onboarding@resend.dev` strings that were in two places.
- Future provider swaps: change `src/lib/email.ts`, swap one env var name (`BREVO_API_KEY` → whatever's next), done. No route changes.

**Operational steps (Beau's side, one-time):**
1. Sign up for Brevo (free).
2. Add a domain on Brevo — recommended subdomain like `mail.beaudawson.com` to keep main-domain DNS clean.
3. Add the SPF + DKIM TXT records Brevo provides to DNS.
4. Wait for DNS propagation; click Verify in Brevo.
5. Generate a Brevo API key (transactional scope).
6. Set `BREVO_API_KEY` and `MAIL_FROM_ADDRESS` in Vercel Project Settings.
7. Optionally remove `RESEND_API_KEY` from Vercel (no longer used).

**Lesson captured:** Memory entry `feedback_resend_sandbox_sender.md` (renamed `project_resend_sandbox_sender.md`) flags this for future infra picks. When choosing email provider — or any infra with a sandbox/limited free tier — verify the *specific feature being built* (here: send-to-arbitrary-users) works on the free tier, not just "is the API nice."

**Invalidated by:** Brevo deliverability proving worse than Resend in production (would push toward SES or back to Resend Pro), or Brevo deprecating their free-tier domain verification (would force the same migration we just did).

---

## 2026-05-04 — PDF reading: Gemini direct, not pdf-parse

**Decision:** Replace pdf-parse with Gemini's native PDF input for Stage 01 resume parsing. PDF bytes go inline as `application/pdf` data parts in the same `generateContent` call that runs `SYS_RESUME_PARSER`. Single round-trip; no separate text-extraction step.

**Reverses:** the original "PDF/DOCX → mammoth or pdf-parse → SYS_RESUME_PARSER" two-step pipeline (2026-05-03 — *Stage 01 vertical*).

**Alternatives considered:**
- **Stay with pdf-parse v2 (just fixed).** Pure JS, free, no AI cost. Rejected because: (a) v2.x API churn already bit us once — fragility risk; (b) image-only PDFs are rejected outright, not OCR'd; (c) text-extraction quality varies wildly across PDF generators.
- **pdfjs-dist (Mozilla's PDF.js).** Battle-tested but heavier dep, same OCR limitation as pdf-parse.
- **Tesseract / OCR libraries.** Could add OCR for image PDFs, but huge install footprint, high latency, fragile.

**Rationale:** Gemini 2.0 Flash accepts PDF inline data natively. It handles text-based PDFs and image-based PDFs (OCRs internally) — the latter being the case our parser currently rejects. Removes the pdf-parse dependency entirely, removes the v1/v2 API surface concern, removes the "image-only PDF" rejection branch. Cost is negligible (~258 tokens per page of PDF, fractions of a cent per parse). The same `SYS_RESUME_PARSER` prompt + schema is reused unchanged — Gemini just gets the PDF as an additional inline part instead of pre-extracted text.

**For DOCX**, mammoth stays — Gemini doesn't read DOCX natively as of 2026-05-04, and mammoth's text extraction works fine. DOCX path: mammoth → text → Gemini text-mode. PDF path: Gemini direct.

**Public API consolidation:** the previous `extractResumeText()` + `parseResumeFromText()` two-call pattern collapses to a single `parseResumeFromUpload(buffer)` call that dispatches by file-type internally. Cleaner contract for the API route.

**Invalidated by:** Gemini's PDF input limits changing (e.g., max pages, max bytes) in ways that block real resumes, or the per-call cost rising materially.

---

## 2026-05-04 — PDF generation: Google Drive API, not Vercel Sandbox or CloudConvert

**Decision:** Use Google Drive API (DOCX → Google Doc → PDF export → delete temp Doc) for Stage 04 PDF generation. Single dedicated GCP project (`Updraft`, id `updraft0526`) with a service account scoped to `drive.file`. JSON key stored base64-encoded in `UPDRAFT_GOOGLE_SA_JSON_B64`. PDF generation is non-blocking — failures fall back to DOCX-only with a banner.

**Reverses:** the original 2026-05-03 — *PDF generation: Vercel Sandbox + custom LibreOffice image* decision. The architectural escape hatch baked into that decision (provider-agnostic `renderPdf()` interface, "swappable to ... CloudConvert, or self-hosted in <1 day") is exactly what made this swap a single-file change.

**Alternatives considered:**
- **Vercel Sandbox + custom LibreOffice image (the original lock-in).** 6-10 hours of setup work: Dockerfile spec, font installation, image build, registry pin, validation harness. Free per-conversion at scale. Rejected for v0.1.5 because the work-to-value ratio doesn't match where the product is — testing-with-friends doesn't need self-hosted infrastructure. Still on the v1.0 roadmap if we ever want to cap vendor risk.
- **CloudConvert paid plan ($8/mo).** Considered. Beau pushed back on adding another monthly recurring cost mid-product-validation; reasonable.
- **CloudConvert free tier (5 PDFs/day).** Too tight for "you + husband + a couple friends test on the same day."
- **AWS SES / random PDF API.** Heavier setup, less integrated with Beau's existing toolchain.

**Rationale:**
- Google Docs is the intermediate format → text layer is preserved end-to-end (same engine you'd use to File→Download as PDF in Google Docs UI).
- Free within Google's quotas (1000 queries / 100 sec, well past anything we'll need).
- Beau already has Google Workspace; this is one more dedicated GCP project alongside their existing ones (`BADLabs Syrum`, `Beau Portfolio`, etc. — see screenshots in conversation).
- Service account at `drive.file` scope means the account can only see/manipulate files it created itself — narrowest possible blast radius if the JSON key is ever compromised.
- Same `renderPdf(docxBytes): Buffer` interface as the deferred Sandbox path — when v1.0 wants self-hosted, only `lib/updraft/pdf.ts` body changes.

**Setup steps captured (one-time):**
1. New GCP project: `Updraft` (id `updraft0526`) — separate from existing projects for isolation.
2. Enable Drive API on the project.
3. Create service account `updraft-pdf-converter` with NO project-level roles (drive.file scope is per-file, not project-level).
4. Generate + download JSON key.
5. `cat <key>.json | base64 | pbcopy`, paste into Vercel as `UPDRAFT_GOOGLE_SA_JSON_B64`.
6. Delete the JSON file from local disk.

**Lesson captured:** when scoping infrastructure work, enumerate alternatives that leverage existing user-side accounts before committing to building from scratch. Sandbox + LibreOffice was the "build it ourselves" answer; Drive API is the "use what's already in your ecosystem" answer. Both are valid, but the latter ships in 2-3 hours instead of 6-10. Save the bigger build for when product velocity demands fully-owned infrastructure.

**Invalidated by:** Google Drive API quota changes that affect us, the conversion fidelity dropping (font handling, page-break shifts), or product scale demanding more headroom than Drive provides comfortably.

---

## 2026-05-06 — Cover Letter generation: fold into `generate-files`, single Gemini hop

**Decision:** Cover letter drafting happens inside the existing `POST /api/updraft/sessions/[id]/generate-files` route, not in a separate endpoint. One Gemini call to `SYS_COVER_LETTER_DRAFTER` runs after MOD/Resume DOCX render and before CL DOCX render. Failure to draft is non-blocking — other deliverables still ship and the user sees a banner. Structured metadata (`hook_type`, `p3_branch`, `close_type`, `word_count`) persists to `stage_04.cover_letter_meta` for future tuning.

**Alternatives considered:**
- **Separate `/generate-cover-letter` endpoint that runs on Stage 03 completion.** Mirrors the pattern of `/generate-summary`, which drafts the executive summary in Stage 03 and stores it on `mod.summary` before Stage 04. Rejected because the CL is not a field on the MOD — it's a separate document. Storing the draft would require yet another stage_outputs slot, and the user expects a single "Generate" button at Stage 04 to produce all selected deliverables.
- **Two-shot: draft + revise loop if word count outside 250-400.** Spec calls for "one revision loop max." v0.5 ships single-shot — log the count and accept whatever falls in range. Revision loop is a v1.0 quality polish.
- **Build a separate "Cover Letter editor" UI in Stage 04 to let the user revise before download.** Out of scope for the v0.5 slice. User edits the DOCX after download (same pattern as the lint-flag policy).

**Rationale:** CL is a per-Stage-04 deliverable, not a stage-output that gets re-used. Folding it into `generate-files` keeps the wiring symmetrical with the other deliverables (one button → all files). Non-blocking failure mirrors the existing PDF-failure policy: degrade gracefully, surface a banner. Single Gemini hop keeps cost predictable (~1k tokens per CL) and well under the daily quota.

**Path B handling:** if `match_analysis` is null at this point (Stage 02 didn't compute it), `draftCoverLetter` passes null through to the prompt. The system prompt has fallbacks (Hook D / Branch 3 are data-light). Spec § "No Match Analysis" suggests re-running match analysis at Stage 04 if missing — deferred to v1.0; v0.5 lets the model cope.

**Stage 02 picker un-disabled:** the Cover Letter checkbox is now selectable. `lightweight_mod` already triggers when CL is selected without MOD, so the user gets a lightweight MOD + CL even if they pick CL alone. No extra plumbing needed.

**Frontend banner branches:** the failure banner has three message branches based on `coverLetterError` — `tier-missing` (Stage 01 didn't finish), substring `capacity` (quota tripped), or generic ("MOD might be too thin"). Aimed at telling the user *what to try next*, not the raw error.

**Invalidated by:** persistent quality complaints about single-shot drafts (would push us to the revision loop), or telemetry showing `cover_letter_failed` events climbing past a few percent (would push us to retry logic / fallback to user-written CL slot).

---

## 2026-05-06 — Pi-egg reveal: single dashboard slot, not full unlock screen

**Decision:** Pi-egg reveal exposes UpDraft as a new staging slot (`OPEN_UPDRAFT [BETA]`) on the existing Operator Dashboard component, alongside `OPEN_BLOG_EDITOR [ADMIN]`. Tracked via `trackCTAClick('updraft_open', 'pi_dashboard')` for GA4 funnel analysis. No separate "you've unlocked UpDraft" celebratory screen.

**Alternatives considered:**
- **Bespoke unlock screen** with copy framing UpDraft as an earned reward. Heavier build, opinionated, doesn't compose with the existing slot pattern.
- **Auto-redirect** to `/updraft` on Pi-challenge success. Skips user agency — they came for the easter-egg dashboard, not necessarily for UpDraft.
- **Modal popover** announcing the new slot. Friction without information.

**Rationale:** the dashboard already has a staging-slot pattern; adding UpDraft is one motion.div block of code. Matches the existing visual language (green terminal, monospace, `>` prefix). User clicks intentionally, not by accident. `[BETA]` color (purple) distinguishes from `[ADMIN]` (yellow) so the user understands this is user-facing, not gated to Beau.

**Invalidated by:** the dashboard pattern changing (e.g., a future redesign that does explicit unlock celebrations), or telemetry showing Pi-solvers don't click through (would push us to a more prominent reveal).
