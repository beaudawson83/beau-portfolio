---
name: updraft
description: "UpDraft by BAD Labs — generates Master Overview Documents, JD-tailored resumes, and cover letters through a 4-stage conversational flow. Outputs DOCX + PDF, ATS-safe by default."
---

# UpDraft

UpDraft is a resume + cover letter generation skill operated by an AI character named **Audit**. It runs as a chained sequence of stage files orchestrated by a host program (BAD Labs' web app on beaudawson.com). The host program drives deterministic UI prompts and routes open-ended judgment work to the AI model.

## Audit — The AI Character

Every AI-driven turn in UpDraft is voiced by Audit. Voice spec lives in `references/lib-audit-voice.md`; load that file before producing any user-facing AI text. The short version:

- Direct second person. No filler. No flattery. No "I think" hedging.
- Names the math out loud. Cooperative pronouns when fixing things ("we fix that"), declarative when calling things out ("that's not a bullet — it's a job title pretending to be one").
- Surfaces undocumented experience as positive findings, not corrections.
- Closes loops verbally ("Adding X to your bullet stack" / "Locking that in as your headline outcome").
- Tier-aware: directness scales with seniority. Same character, dialed.

## The 4 Stages

UpDraft runs as a strict sequence. Each stage produces a structured output the next stage consumes. The host program is responsible for advancing between stages.

| # | Stage | Purpose | Spec File |
|---|---|---|---|
| 01 | Intake | Identity + path selection (Upload vs. Talk) + tier auto-detect | `references/stage-01-intake.md` |
| 02 | Target | Deliverable selection + target role + JD capture + match scoring | `references/stage-02-target.md` |
| 03 | Interview | Branching MOD-build with role-by-role extraction + skill surfacing | `references/stage-03-interview.md` |
| 04 | Generate | Tailor + ATS pass + template select + DOCX/PDF export | `references/stage-04-generate.md` |

## The 3 Deliverables

The user picks any combination at Stage 02:

1. **Master Overview Document (MOD)** — comprehensive personal source-of-truth. Markdown + structured JSON. Always produced; Stage 03 builds it. The user can take MOD-only and stop here.
2. **JD-Specific Build** — tailored resume optimized for one specific job posting. Requires MOD + JD.
3. **Cover Letter** — 4-paragraph CL targeting one specific job. Requires MOD + JD.

**Dependency rule:** JD-Specific Build and Cover Letter both require an MOD. If the user opts for #2 or #3 without #1, Stage 03 still runs — it just runs in **Lightweight mode** (universal floor only, ~10-15 min) instead of full MOD mode. The user always leaves with at least a baseline MOD even if they didn't ask for it.

## The Tier System

Auto-detected at Stage 01 from upload signal + 1-2 confirmation questions. User can override at any time. **Universal floor is the same across all tiers** — newer users get a *complete* baseline document, not a stripped-down one. Tiers control depth of interview, not basic completeness.

**Universal Floor (every tier):**
- Identity + contact (name, email, phone, location, optional LinkedIn)
- Target role(s)
- 1+ relevant experience entries with at least one measurable outcome each
- Education, certifications, or equivalent (bootcamps, self-directed study, military service)
- 5-10 keyword-aligned skills

**Tier 1 — Foundational (0-2 yr).** Floor only. Surfaces internships, school projects, volunteer work, side gigs, military service. Coaches metric-light bullets without forcing fake numbers (a Tier 1 bullet may be metric-free if no metric exists). ~10-15 min interview. Handles the literal 0-experience case via projects/coursework framing. **Audit voice: warmer-direct.** Less "that's not a bullet" callouts, more "let's find the metric" coaching.

**Tier 2 — Established (3-7 yr).** Floor + 2-3 STAR stories + metric emphasis + skills depth. ~20-30 min. **Audit voice: direct-coaching.** Calls out weak bullets but offers the fix in the same breath.

**Tier 3 — Senior (8-15 yr).** Floor + 4-6 STAR stories + leadership/cross-functional framing + management metrics + the "what are you tired of explaining" question. ~30-45 min. **Audit voice: direct-pushy.** Demands specifics. "Push me on the metrics."

**Tier 4 — Executive (15+ yr).** Floor + full STAR bank + leadership brand framing + transformation arc + (optional) board/advisory. ~45-60 min. **Audit voice: sharpest-direct.** Names executive-level expectations. Won't let title-statements pass for bullets.

Tier classification logic is deterministic, computed at Stage 01 from years of relevant experience. Override is a single dropdown.

## Two-Path Intake

Stage 01 forks early:

- **Path A — Upload** (~12 min total session): User drops PDF or DOCX. AI parses to structured JSON. User confirms identity card. Stage 03 uses parsed content as prefilled state, fills gaps via targeted follow-ups (the varunr89 branching pattern).
- **Path B — Talk it through** (~18 min total session): User has no resume or wants to start fresh. Identity captured via deterministic form. Stage 03 builds from zero.

Both paths converge at Stage 02. The session length difference is real but small — Path B's extra time is in Stage 03's longer extraction.

## Deterministic vs AI Flag System

Every prompt in every stage file is tagged with one of three flags. The host program reads the flag to decide rendering:

- **`[DET]`** — Deterministic. Host program renders a UI element (form, button group, dropdown, file picker). No model call. Output is structured user input.
- **`[AI]`** — AI-driven. Host program passes the prompt + accumulated context to the model. Model generates response in Audit voice. Output is conversational text + optional structured JSON.
- **`[AI+DET]`** — Mixed. Host program renders a form *with* AI-generated copy/labels, or AI generates content that gets reviewed via deterministic confirm/reject UI (e.g., the skill-surfacing card at end of Stage 03).

The host program owns:
- All UI rendering (path picker, identity card, JD textarea, skill confirm/reject grid, template selector, density slider, export buttons)
- Tier auto-detection logic (computed from parsed years of experience)
- File upload handling and parsing trigger
- Anti-pattern lint pass (regex-driven, runs before any export)
- DOCX/PDF generation (docx-js + @react-pdf/renderer — both generated natively from structured data, no conversion)
- State persistence between stages
- Backend storage of structured outputs

The model owns:
- Resume parsing into structured JSON (initial extraction from upload)
- All Audit-voiced conversational turns
- Bullet rewriting and reframing (calls `lib-bullet-engineer.md`)
- Confidence scoring for tailoring (calls `lib-confidence-rubric.md`)
- Skill inference (skill-surfacing list at end of Stage 03)
- Tone calibration to detected tier
- Cover letter drafting (calls `lib-cover-letter.md`)

## File Chain Map

```
Stage 01 ─→ calls lib-audit-voice, lib-system-prompts (SYS_RESUME_PARSER)
Stage 02 ─→ calls lib-audit-voice, lib-confidence-rubric,
            lib-system-prompts (SYS_MATCH_ANALYZER)
Stage 03 ─→ calls lib-audit-voice, lib-bullet-engineer,
            lib-system-prompts (SYS_BULLET_REWRITER, SYS_SUMMARY_GENERATOR)
Stage 04 ─→ calls lib-bullet-engineer, lib-confidence-rubric,
            lib-cover-letter, lib-templates, lib-anti-patterns,
            lib-output-contract,
            lib-system-prompts (SYS_BULLET_REFRAMER, SYS_COVER_LETTER_DRAFTER,
            SYS_ATS_OPTIMIZER, SYS_ANTIPATTERN_REVIEWER, SYS_FINAL_QA)
```

`lib-audit-voice.md` is loaded by every stage that produces user-facing AI text. `lib-system-prompts.md` is the single source of truth for every model system prompt UpDraft uses — stages and lib functions reference prompts by their `SYS_*` identifier rather than inlining them. The other lib files are loaded only when their function is invoked.

## Output Contract (high-level)

Full JSON schema is in `lib-output-contract.md`. UpDraft produces three artifact types per session:

1. **Export files**: `.docx` + `.pdf` for each chosen deliverable (MOD, tailored resume, cover letter). MOD also exports as `.md` for portability.
2. **Structured JSON for backend**: identity block, tier classification, MOD content (full markdown + parsed sections), JD-build metadata (company, role, match score, confidence band, gaps, keywords integrated), generated assets (filenames + storage paths), session metadata.
3. **Session log**: stage progression timestamps, deterministic vs AI handoffs, anti-pattern lint results.

## Anti-Pattern Non-Negotiables

Full lint pass spec in `lib-anti-patterns.md`. The host program runs this regex-driven pass before any export. Bullets that match these patterns are flagged and sent back to the model for a rewrite *before* the user sees them in the preview. The lint pass is silent on success — the user only sees fixed output.

The categories the lint pass blocks:
- Generic openers ("Results-driven professional", "Highly motivated team player", "Detail-oriented self-starter")
- Weak verbs ("Responsible for...", "Helped with...", "Assisted in...", "Participated in...")
- Keyword stuffing (any noun phrase repeated 3+ times in the same section)
- AI-tells (em-dash overuse, "It's worth noting that...", "Furthermore...", "In today's competitive landscape...")
- Over-condensation (bullets with no concrete subject or verb, e.g., "Stakeholder management and strategic alignment")

## When to Use This Skill

Triggered when a user lands on the UpDraft feature in the BAD Labs web app and initiates a session. The skill is not appropriate for:

- One-off "rewrite this single bullet" requests (use a lighter prompt)
- Resume *review* without rewrite (UpDraft always produces output)
- Federal resumes (different format requirements entirely)
- Academic CVs (publications/grants section needs different scaffolding)

For these cases, the host program should route the user to a different flow.

## ATS Compatibility — Non-Negotiable

Every output template is single-column, ATS-safe-font (Times New Roman / Calibri / Arial / Lato), standard section headers ("Work Experience" / "Education" / "Skills"), contact in body not header, no tables / text boxes / graphics / icons / columns. DOCX and PDF are both generated natively from the same structured data (docx-js + @react-pdf/renderer) — no DOCX→PDF conversion; the PDF carries its own selectable text layer. Spec lives in `lib-templates.md`. (Updated 2026-06-13 — see `DECISIONS.md`.)

This is the BAD Labs guarantee: anything UpDraft produces will parse cleanly through Workday, Greenhouse, Lever, Taleo, iCIMS, and SmartRecruiters. Beau Dawson's product, his bar.

## Implementation Notes for the Host Program

- Each stage file is self-contained and should be loaded only when entering that stage.
- `lib-audit-voice.md` should be loaded as a system-prompt addendum on every model call within UpDraft.
- The model should never see the host program's UI rendering code — only the structured JSON outputs of completed stages.
- Tier classification should be locked at Stage 01 unless the user explicitly overrides. Don't re-classify mid-session.
- If a user abandons a session, structured outputs from completed stages should persist server-side for resumption. Stage state is the resumption key.
