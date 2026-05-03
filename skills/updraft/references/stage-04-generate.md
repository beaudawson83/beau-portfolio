# Stage 04 — Generate

**Purpose:** Take the completed MOD from Stage 03 plus the target/match data from Stage 02, and produce the final deliverables — tailored resume, cover letter, MOD export. Run ATS scoring, anti-pattern lint, and final QA. Generate DOCX + PDF + MD. Hand off to backend persistence.

**Inputs:**
- Stage 01: identity, tier, classifier inputs
- Stage 02: deliverables, target, match_analysis, lightweight_mod flag
- Stage 03: full MOD, tier_reaffirmed, ready_for_generation

**Output schema:** see `lib-output-contract.md` § Stage 04 Output. Stage 04 does not redefine the schema — it produces it.

---

## Stage 04 Sequence

Stage 04 runs in 8 sub-steps. Several are conditional based on which deliverables the user selected at Stage 02.

| Step | Phase | Flag | Runs When |
|---|---|---|---|
| 4.1 | Tailoring pass | `[AI]` | `jd_build` in deliverables |
| 4.2 | Cover letter generation | `[AI]` | `cover_letter` in deliverables |
| 4.3 | Template + density selection | `[AI+DET]` | always |
| 4.4 | Live preview | `[DET]` | always |
| 4.5 | Anti-pattern lint pass | `[DET → AI]` | always (silent if clean) |
| 4.6 | Final QA | `[AI]` | always |
| 4.7 | Export bar | `[DET]` | always |
| 4.8 | Backend persistence | `[DET]` | always |

---

### 4.1 — Tailoring Pass `[AI]`

**Runs when:** `jd_build` in `deliverables`. Skipped for MOD-only sessions.

**What it does:** Walks every bullet in `mod.experience` and decides per-bullet whether to keep, reframe, or rewrite, based on the Confidence Rubric scoring against the target JD.

**Required context:** `lib-confidence-rubric.md`, `lib-bullet-engineer.md`, `lib-system-prompts.md` (for `SYS_BULLET_REFRAMER`).

**Sub-sequence:**

#### 4.1.a — Per-bullet confidence scoring

For each bullet in each role:
1. Run the bullet through the Confidence Rubric against `target.jd_text` and `match_analysis.required_skills`.
2. Compute Direct, Transferable, Adjacent, Impact scores using tier-appropriate weights (Tier 1 override: 30/40/20/10).
3. Determine confidence band:
   - 90-100% DIRECT → keep as-is
   - 75-89% TRANSFERABLE → light reframing
   - 60-74% ADJACENT → reframe required
   - 45-59% WEAK → consider replacement from other bullets in same role
   - <45% GAP → drop unless no alternatives exist

#### 4.1.b — Reframe pass

For bullets in TRANSFERABLE or ADJACENT bands, call `SYS_BULLET_REFRAMER` from `lib-system-prompts.md` with:
- `original_bullet`: the current bullet text
- `target_jd_signal`: extracted from JD (terminology, outcome_type, abstraction_preference, scale_signal)
- `strategy`: best-fit strategy from `lib-bullet-engineer.md`:
  - **Keyword Alignment** if JD uses synonym terminology
  - **Emphasis Shift** if bullet has multiple outcomes and JD prefers one
  - **Abstraction Level** if JD signals different technical depth than bullet
  - **Scale Emphasis** if achievement has multiple scale dimensions

The Truth Line enforces: every fact must remain true, metrics unchanged, reframing serves THIS specific JD.

If `truth_check_passed: false` returns from the model, the original bullet is preserved unchanged.

#### 4.1.c — Replace/drop pass

For bullets in WEAK band:
- If the role has more than 5 bullets total, drop the WEAK one
- If the role would drop below 3 bullets, keep the WEAK one but flag for cover letter address

For bullets in GAP band:
- Drop unless the role would drop below 3 bullets
- If the gap is in `match_analysis.required_skills`, flag for cover letter Branch 1 (gap-acknowledgment paragraph)

#### 4.1.d — Headline + Summary tailoring

The resume headline must mirror `target.role_title` exactly (recruiters Cmd-F). Override whatever the MOD's headline says.

The summary is regenerated from `mod.summary` + `mod.summary_seed` + `target` context using `SYS_SUMMARY_GENERATOR` with the `target_role_title` parameter populated. The MOD-default summary is preserved separately; this is a tailored version.

#### 4.1.e — Skills section tailoring

From the union of `mod.skills` + `mod.surfaced_skills` (where confirmed=true):
1. Score each skill against `match_analysis.required_skills` and `match_analysis.preferred_skills`.
2. Promote skills that match required to the top of the list.
3. Drop skills that score 0 against the JD AND don't appear in any retained bullet.
4. Cap final list at 15 skills (industry standard for ATS).

For Tier 3-4 candidates, split skills into "Core Competencies" (top 8 matched) + "Tools & Stack" (technical specifics).

#### 4.1.f — Key Outcomes block (the 8-second bet)

Select 4 metrics for the Key Outcomes block per `lib-templates.md`:
1. Filter `mod.experience[*].bullets` where `metric_present: true`
2. Score each metric for impact alignment with target JD
3. Select top 4 by alignment score
4. Format each as: number + short label + context line

For Tier 1 with fewer than 4 metric-bearing bullets: suppress the entire block (don't render with placeholders).

**Output:** `tailored_resume` object populated, ready for template rendering.

---

### 4.2 — Cover Letter Generation `[AI]`

**Runs when:** `cover_letter` in `deliverables`. Skipped if user only selected resume.

**What it does:** Drafts a 4-paragraph cover letter using `SYS_COVER_LETTER_DRAFTER` from `lib-system-prompts.md`.

**Required context:** `lib-cover-letter.md`, `lib-system-prompts.md`.

**Inputs to the prompt:**
- `mod` (full MOD from Stage 03)
- `target` (role + JD from Stage 02)
- `match_analysis` (scoring + gaps + strengths)
- `interview_objections` (from `mod.interview_objections` — drives paragraph 3 Branch 2)
- `tier` (from `tier_reaffirmed`)

**Branch logic for paragraph 3** (the high-leverage paragraph):
- If `match_analysis.gaps` contains any `severity: major` or `severity: critical` → Branch 1 (gap-acknowledgment)
- Else if `interview_objections.length > 0` → Branch 2 (preempt objection)
- Else → Branch 3 (add color)

**Word count enforcement:** target 250-400 words. If the model returns outside this range, regenerate once with explicit length constraint. If still out of range after regenerate, ship with closest valid output and flag `qa_findings` non-blocking note.

**Hook type and close type selection:** `SYS_COVER_LETTER_DRAFTER` picks based on match band and tier, but Stage 04 stores the choice metadata for analytics:
- `hook_type`: A | B | C | D
- `p3_branch`: gap | objection | color
- `close_type`: A | B | C

**Output:** `cover_letter` object populated, ready for template rendering.

---

### 4.3 — Template + Density Selection `[AI+DET]`

**Runs:** always.

**AI turn (Audit recommends):**

Audit suggests a template based on `target.industry` (or `target.company` if industry isn't set) using the mapping in `lib-templates.md`:

| Industry / Role | Suggested Template |
|---|---|
| Legal, finance, government, academic, healthcare | Classic |
| Tech, SaaS, product, data, general corporate | Modern |
| Engineering, ops, manufacturing, supply chain, technical PM | Structured |
| Marketing, content, brand, in-house creative, comms | Creative |

For MOD-only sessions (no target), default to Modern.

Voice scales by tier. Sample for Tier 3 corporate tech role:

> Suggested **Modern** for this — corporate tech role, Calibri reads well to a Workday parser, navy accent gives it some personality without breaking ATS. Want a different look? Pick from the options.

For Tier 1:

> Going with **Modern** as the default — clean, professional, parses well through any ATS. If you want something different, the four options are below. The aesthetic differences are real but small; what matters is the content, which we just locked in.

**DET turn (template gallery):**

Host program renders 4 thumbnail cards showing the same content rendered in each template. User clicks to select. Active selection highlights.

**Density picker:**

After template selection, Audit suggests density based on bullet count:
- < 10 bullets total → Comfy
- 10-25 bullets → Regular
- 25+ bullets → Compact

DET: 3-button radio (Compact / Regular / Comfy). User overrides.

**Creative accent picker (only if Creative template selected):**

DET: 4 swatches (teal `#2C7A7B`, burgundy `#7A2C3A`, olive `#5C6B2B`, slate `#4A5568`). User picks one. Stored as `creative_accent`.

**Output:** `template_selected`, `density_selected`, `creative_accent` (or null).

---

### 4.4 — Live Preview `[DET]`

**Runs:** always. After every selection in 4.3.

**What it does:** Host program renders the DOCX live in an iframe (or canvas) using docx-js → render-to-pdf-preview pipeline.

User can:
- Toggle between resume / cover letter / MOD views (only those that were generated)
- Switch templates and see live re-render (re-runs minimal pieces of 4.3, not the full tailoring)
- Switch densities and see live re-render
- Edit the summary inline (rare but supported — host program triggers a regeneration of `mod.summary` if user types changes)

**No AI calls in 4.4.** This is pure host rendering. Audit is silent during preview unless the user clicks "Regenerate" on a section, which triggers the relevant AI call.

**Edit modes:**

Three pencil icons in the preview surface allow direct user edits without breaking the AI pipeline:
- **Edit Summary**: opens a textarea with current summary, user edits and saves. New summary persists to `tailored_resume.summary`.
- **Edit Bullet**: opens a textarea per bullet, user edits and saves. New bullet text persists to that role's bullets array. Bullet edits skip the lint pass (user takes responsibility).
- **Reorder Roles**: drag-and-drop to reorder experience entries. Most users don't touch this; default is reverse-chronological.

User's manual edits are preserved through subsequent template switches.

---

### 4.5 — Anti-Pattern Lint Pass `[DET → AI]`

**Runs:** always. Executes after user clicks "Generate Final Files" or equivalent.

**What it does:** Detailed in `lib-anti-patterns.md`. Two phases:

#### 4.5.a — Phase 1: Regex detection

Host program scans assembled content for the 8 anti-pattern categories:
1. Generic openers
2. Weak verbs
3. Keyword stuffing (3+ repetitions)
4. AI-tells
5. Over-condensation
6. Filler adjectives
7. Vague quantifiers
8. Unsupported superlatives

Each detection produces a flag with `type`, `location`, `current_text`. **No AI calls in this phase.**

#### 4.5.b — Phase 2: AI rewrite

For each flagged item, host calls `SYS_ANTIPATTERN_REVIEWER` from `lib-system-prompts.md`. Returns `rewritten_bullet` + `fix_applied` + `needs_human_review`.

Rewrites are applied silently. Logged to `lint_pass_log` for audit.

#### 4.5.c — Re-run check

After all rewrites are applied, re-run Phase 1 once. If new flags appear (rare, but possible if a rewrite introduces a different anti-pattern), apply Phase 2 to the new flags. **Do NOT loop more than once** — prevents infinite loops.

If re-run still produces flags, surface them to the user as Audit notes (non-blocking):

> Two patterns I couldn't clean up automatically:
> — "many cross-functional initiatives" — do you have the actual number?
> — "highly motivated" in summary — strip "highly" or replace with a concrete trait
> Want me to take another pass, or ship as-is?

User picks. Skip ships with patterns. Fix loops back to 4.5.b with manual user input.

#### 4.5.d — needs_human_review handling

If `SYS_ANTIPATTERN_REVIEWER` returns `needs_human_review: true` for a bullet (no concrete content to preserve), Audit surfaces:

> One bullet I couldn't clean up: "[bullet text]". It needs more context to be useful. Want to give me a metric or scope, or cut it?

DET: textarea (user types replacement) | [Cut bullet] button | [Keep as-is] button.

User decides. Persist their choice and proceed.

---

### 4.6 — Final QA `[AI]`

**Runs:** always. Final pass before export.

**What it does:** Calls `SYS_FINAL_QA` from `lib-system-prompts.md` to verify the assembled outputs are coherent, truthful, consistent, and complete.

**Inputs to the prompt:**
- `assembled_resume` (post-tailoring + post-lint)
- `assembled_cover_letter` (if generated)
- `mod` (source-of-truth for verification)
- `target` (for headline match check)
- `match_analysis` (for gap consistency)

**Five check categories** (per `SYS_FINAL_QA`):

1. **Truthfulness**: every bullet's claim exists in MOD; no inflated metrics, no invented scope, no claimed tools missing from MOD
2. **Consistency**: resume headline matches target role title; resume + cover letter reference same metrics; tier-appropriate tone throughout
3. **Completeness**: Universal Floor sections present; identity contact info complete; ≥5 skills; ≥1 metric per role where MOD supports it
4. **Aesthetic**: no bullets >2 lines; no section <2 bullets; consistent date format; no remaining anti-patterns
5. **Cover letter alignment**: hook is specific (not generic); body content traces to MOD; if `interview_objections` non-empty, they appear in CL paragraph 3; word count 250-400

**Severity handling:**

- **Blocking findings**: prevent export. Display Audit note, surface the issue, offer fix flow.
- **Non-blocking findings**: surface as Audit note before export, let user decide.

**Audit voice for blocking finding:**

> Stop — found a problem before export: the resume claims "managed $4M budget" but the MOD only shows "managed project budget" without a number. I can't ship that. Two options: edit the bullet to remove the $4M claim, or confirm the number and add it to the MOD.

DET: [Edit bullet] | [Confirm number]

**Audit voice for non-blocking finding:**

> Two non-blocking notes before export:
> — Cover letter is at 412 words, slightly over the 400 target. Reads fine, just longer than ideal.
> — Resume bullet 3 in Lattice role doesn't have a metric. The MOD doesn't have one either, so this is a gap we couldn't fill. The other bullets carry it.
> Ship anyway, or want me to fix?

DET: [Ship as-is] | [Fix first]

---

### 4.7 — Export Bar `[DET]`

**Runs:** always. After QA passes.

**What it does:** Host program renders the export UI — a sticky bar with download buttons for each generated deliverable.

**Layout:**

```
┌─ READY TO EXPORT ────────────────────────────────────┐
│                                                       │
│  RESUME                                               │
│  Dawson_Resume_DirectorCustomerExperience_onX_       │
│  Apr2026.docx                                         │
│  [ Download .docx ] [ Download .pdf ]                │
│                                                       │
│  COVER LETTER                                         │
│  Dawson_CoverLetter_DirectorCustomerExperience_onX_  │
│  Apr2026.docx                                         │
│  [ Download .docx ] [ Download .pdf ]                │
│                                                       │
│  MASTER OVERVIEW DOCUMENT                             │
│  Dawson_MOD_Apr2026.docx                             │
│  [ Download .docx ] [ Download .pdf ] [ .md ]        │
│                                                       │
│  ATS Score: 87 / 100  ✓                              │
│  Match Confidence: TRANSFERABLE (78%)                 │
│                                                       │
│  [ Save & New Session ]  [ Save & Exit ]             │
└───────────────────────────────────────────────────────┘
```

**File generation pipeline** (per `lib-templates.md`):
1. Render DOCX via docx-js using selected template + density specs
2. Save DOCX to `/users/[user_id]/sessions/[session_id]/exports/[filename].docx`
3. Generate PDF via LibreOffice headless: `soffice --headless --convert-to pdf input.docx`
4. Save PDF to same directory
5. For MOD only: also export markdown (already in MOD source-of-truth format)

**Audit voice on export-bar render:**

For TRANSFERABLE+ matches:

> Done. ATS score 87, match confidence TRANSFERABLE. Resume and cover letter ready below. Ship it.

For ADJACENT or below:

> Done. ATS score 76, match confidence ADJACENT. The cover letter is doing real work here — make sure paragraph 3 lands when you read it through. Files below.

For MOD-only:

> Done. Your MOD is ready below in DOCX, PDF, and Markdown. The Markdown copy is the portable source-of-truth — useful if you want to maintain it manually or feed it to something else later.

---

### 4.8 — Backend Persistence `[DET]`

**Runs:** always. Triggered by user clicking [Save & New Session] or [Save & Exit].

**What it does:** Host program writes the full session state to backend storage per `lib-output-contract.md` schema.

**Persisted artifacts:**
1. Full structured JSON (all 4 stage outputs, top-level session metadata)
2. Export files (already on disk from 4.7)
3. Session log (append all events from this session)
4. Update `users[user_id].active_mod` pointer to this session

**Atomicity:** Persistence should be atomic — either all four artifacts save successfully or the session is marked `status: in_progress` for retry on next load. Don't leave partial state.

**Telemetry events to emit:**
- `stage_completed` for stage 04
- `export_generated` for each file (resume, CL, MOD × DOCX/PDF/MD)
- `session_completed` with total duration

---

## Tier-Aware Stage 04 Behaviors

Stage 04's tone is mostly transactional (less Audit voice than Stages 02-03), but tier still calibrates a few moments:

| Behavior | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|
| Template recommendation tone | "Going with [X] as the default — clean, professional" | "Suggested [X] — [reason]" | "[X] — fits your profile" | "[X]. Pick a different one if you have a reason." |
| Lint pass verbosity | Explain each fix | Show fixes in a summary list | Summary list, brief | Silent unless blocking |
| Final QA blocking note | Coaching tone, explain why it matters | Direct callout | Sharp callout | "Stop — [issue]." |
| Export-bar congratulation | "Done. Resume's ready." | "Done. Ship it." | "Files below." | (no congratulation, just files) |
| ADJACENT/WEAK match warning | "Cover letter is doing the heavy lift on this one" | "Cover letter has to land — read paragraph 3 carefully" | "Cover letter is the lever. P3 is the bet." | (silent — assume user knows) |

---

## Edge Cases

### Lightweight MOD session, only cover letter requested

Stage 04 has no resume to tailor. Sequence:
- Skip 4.1 (no resume tailoring)
- Run 4.2 (cover letter generation)
- Run 4.3 with default Modern template (no tailored resume to consider)
- Run 4.4 with cover letter + lightweight MOD only
- Run 4.5 on cover letter content
- Run 4.6 with limited scope (truthfulness against MOD, cover letter alignment, completeness on the CL only)
- Run 4.7 with CL + MOD exports only

### MOD-only session

Stage 04 short-circuits significantly:
- Skip 4.1 (no JD to tailor against)
- Skip 4.2 (no JD to write CL against)
- Run 4.3 with default Modern template
- Run 4.4 with MOD only
- Run 4.5 on MOD content
- Run 4.6 with completeness + truthfulness focus
- Run 4.7 with MOD exports only (DOCX + PDF + MD)

### Tier reaffirmation between Stages 03 and 04

If `mod.tier_reaffirmed` differs from `tier_classifier_inputs` Stage 01 result, Stage 04 uses `tier_reaffirmed`. The tier classification displayed in any UI reflects the final reaffirmed tier.

### User abandons mid-Stage 04

If user closes browser between 4.3 and 4.7:
- Persist session with `status: in_progress`
- Mark last completed stage as 03 (since 04 didn't finish)
- On resumption, load Stage 03 outputs and offer to re-run Stage 04 with same or different template

If user closes after 4.7 but before 4.8:
- Files exist on disk but session record isn't finalized
- On resumption, detect orphan files and offer to download or re-run Stage 04

### ATS score below 70

Surface as Audit note before export (non-blocking):

> ATS score is 64 — below my recommended floor of 70 for this kind of role. Two reasons it's low:
>   – Required skill "SQL" only appears in Skills section, not in any bullet
>   – Quantification density is at 60% (target: 75%+ for senior roles)
> Want me to take another pass at the bullets, or ship and rely on the cover letter?

User picks. Some users prefer to ship low-ATS resumes intentionally (e.g., personal-network applications where ATS doesn't apply).

### Match score below 45% (GAP band)

Stage 04 still runs but Audit flags it harder at 4.7:

> Reminder before you ship: this is a 38% match. The resume is as good as I can make it given the actual data. The cover letter is doing the entire pitch. If this is a stretch role you're committed to, ship it. If you have other options, this might not be the best use of an application.

Doesn't block — user's decision.

---

## Stage 04 Completion Criteria

Stage 04 is complete when:
- All conditional sub-steps appropriate to the deliverables ran successfully
- 4.6 returned `status: ready_for_export` (or user accepted non-blocking findings)
- 4.7 generated all required export files
- 4.8 persisted to backend
- User received the export bar or downloaded at least one file

After 4.8, the session enters `status: completed`. The skill ends. UpDraft is done with this session.

---

## Performance Budget

Stage 04 is the most computationally expensive stage. Target performance for a typical Tier 3 full session (resume + cover letter + MOD):

| Sub-step | Target Latency |
|---|---|
| 4.1 Tailoring | 8-15 sec (per-bullet AI calls; ~20-30 bullets) |
| 4.2 Cover letter | 4-8 sec |
| 4.3 Template select | <1 sec |
| 4.4 Live preview | 1-2 sec per re-render |
| 4.5 Lint pass | 2-5 sec |
| 4.6 Final QA | 3-6 sec |
| 4.7 Export generation | 2-4 sec (DOCX + LibreOffice PDF) |
| 4.8 Backend persist | <1 sec |
| **Total Stage 04** | **20-40 sec** |

User-perceived latency should be lower because 4.4 happens during user interaction time. 4.5-4.8 should ideally complete in <15 seconds total — beyond that, the user perceives "stuck."

If Stage 04 exceeds 60 seconds total, surface a progress indicator with stage names so the user knows work is happening.
