# UpDraft — Engineering Handoff

A resume + cover letter generation skill for the BAD Labs web app at beaudawson.com. This README is the engineering integration guide; the skill itself is documented in `SKILL.md` and `references/`.

## What UpDraft Is

UpDraft is a public-facing SaaS feature operated by an AI character named **Audit**. It runs as a chained sequence of stage files orchestrated by the host program (your web app). The host program drives deterministic UI prompts and routes open-ended judgment work to the AI model.

Users can produce three deliverables in any combination:
1. **Master Overview Document (MOD)** — a comprehensive personal source-of-truth document
2. **JD-Specific Resume** — tailored to one specific job posting
3. **Cover Letter** — 4-paragraph CL targeting one specific job

All deliverables export as DOCX + PDF; MOD also exports as Markdown.

## Why This Architecture

**Skill-as-orchestrator pattern**: the AI doesn't drive the user experience — your host program does. The skill files are reference material the model loads at the appropriate stage. The host program owns:

- All UI rendering
- State persistence between stages
- File generation (DOCX + PDF)
- Anti-pattern lint pass (regex-driven, runs before any export)
- Backend storage

The model owns:
- Resume parsing (structured extraction from upload)
- All Audit-voiced conversational turns
- Bullet rewriting and reframing
- Confidence scoring for tailoring
- Skill inference
- Tone calibration to detected tier
- Cover letter drafting

This split means **your backend code is the source of truth for state, not the conversation history**. The model loses access to raw conversation when stages advance — only structured JSON outputs persist forward.

## File Chain

```
updraft/
├── SKILL.md                              ← Orchestrator (load first)
└── references/
    ├── stage-01-intake.md                ← Identity + path + tier classification
    ├── stage-02-target.md                ← Deliverable selection + JD analysis
    ├── stage-03-interview.md             ← Tier-aware MOD-build interview
    ├── stage-04-generate.md              ← Tailoring + ATS + lint + QA + export
    ├── lib-system-prompts.md             ← All SYS_* prompts (single source)
    ├── lib-audit-voice.md                ← Audit character spec (load every AI turn)
    ├── lib-confidence-rubric.md          ← 4-dimension match scoring methodology
    ├── lib-bullet-engineer.md            ← Writing + reframing toolkit
    ├── lib-anti-patterns.md              ← Lint pass spec (8 categories)
    ├── lib-templates.md                  ← 4 templates × 3 densities
    ├── lib-cover-letter.md               ← 4-paragraph CL structure
    └── lib-output-contract.md            ← JSON schemas + storage paths
```

**Total: 12 files, ~4,000 lines, ~180 KB.**

## Stage-to-File Loading

The host program controls which files the model sees in each stage:

```
Stage 01 ─→ load: SKILL.md, stage-01-intake.md, lib-audit-voice.md,
                  lib-system-prompts.md (SYS_RESUME_PARSER section)

Stage 02 ─→ load: SKILL.md, stage-02-target.md, lib-audit-voice.md,
                  lib-confidence-rubric.md,
                  lib-system-prompts.md (SYS_MATCH_ANALYZER section)

Stage 03 ─→ load: SKILL.md, stage-03-interview.md, lib-audit-voice.md,
                  lib-bullet-engineer.md,
                  lib-system-prompts.md (SYS_BULLET_REWRITER + SYS_SUMMARY_GENERATOR)

Stage 04 ─→ load: SKILL.md, stage-04-generate.md,
                  lib-bullet-engineer.md, lib-confidence-rubric.md,
                  lib-cover-letter.md, lib-templates.md,
                  lib-anti-patterns.md, lib-output-contract.md,
                  lib-system-prompts.md (SYS_BULLET_REFRAMER, SYS_COVER_LETTER_DRAFTER,
                                          SYS_ATS_OPTIMIZER, SYS_ANTIPATTERN_REVIEWER,
                                          SYS_FINAL_QA)
```

`lib-audit-voice.md` is loaded as a **system-prompt addendum** on every model call within UpDraft that produces user-facing text. Don't include it for silent extraction calls (parsing, scoring, lint rewrites).

## Deterministic vs AI Flag System

Every prompt in every stage file is tagged with one of three flags. Your backend reads the flag to decide rendering:

- **`[DET]`** — Deterministic. Render a UI element (form, button group, dropdown, file picker). No model call. Output is structured user input.
- **`[AI]`** — AI-driven. Pass the prompt + accumulated context to the model. Model generates response. Output is conversational text + optional structured JSON.
- **`[AI+DET]`** — Mixed. Render a form *with* AI-generated copy/labels, OR AI generates content that gets reviewed via deterministic confirm/reject UI.

Search any stage file for `\`\[DET\]\``, `\`\[AI\]\``, or `\`\[AI+DET\]\`` to find the flag locations.

## Backend Integration Points

### Required REST Endpoints

```
POST   /api/sessions                    Create new session, returns session_id
GET    /api/sessions/[id]               Get current session state
PATCH  /api/sessions/[id]/stage/[n]     Update stage output (n = 1..4)
POST   /api/sessions/[id]/exports       Trigger export file generation
GET    /api/sessions/[id]/exports/[f]   Download a specific export file
DELETE /api/sessions/[id]               Delete a session (cascades to files)
GET    /api/users/[id]/active-mod       Get user's current MOD pointer
PUT    /api/users/[id]/active-mod       Set user's active MOD
```

### Required Backend Services

1. **Resume parser** — Gemini's native PDF input on `generateContent` (`mime_type: application/pdf` inline data) handles both text-based and image-based PDFs (Gemini OCRs internally). DOCX uses mammoth for text extraction, then the same Gemini call with `SYS_RESUME_PARSER`. Originally specced around pdf-parse + a separate text-extraction step; pivoted 2026-05-04 — see `DECISIONS.md`.

2. **DOCX generator** — docx-js (Node) or python-docx. Must support: single-column layouts, paragraph borders for section dividers, native bullet list styling, named font specification (no fallback fonts).

3. **PDF generator** — native via `@react-pdf/renderer` ([`pdf-builder.tsx`](../../src/lib/updraft/pdf-builder.tsx)), rendered directly from the same structured data as the DOCX. **Updated 2026-06-13:** the original spec said "do NOT generate PDF directly — convert from DOCX via LibreOffice for text-layer integrity." That concern is satisfied — @react-pdf produces a real selectable text layer (ATS-safe) — and because UpDraft generates its own templates (not arbitrary DOCX), direct generation needs no conversion engine at all ($0, serverless, locally verifiable). See `DECISIONS.md` 2026-06-13.

4. **Anti-pattern lint** — regex engine for Phase 1 detection. Patterns are documented in `lib-anti-patterns.md` § Pattern Categories. Phase 2 uses `SYS_ANTIPATTERN_REVIEWER` (model call).

5. **State storage** — relational or document store. Schema in `lib-output-contract.md` § Backend Storage Architecture. Encrypt resume content at rest (PII).

6. **File storage** — S3-style object storage for export files. Path pattern: `/users/[user_id]/sessions/[session_id]/exports/[filename]`.

### Optional Services

7. **Telemetry** — emit events from `lib-output-contract.md` § Event Types for analytics and debugging. Recommended: stage progression, AI call latencies, lint flag rates, export generation, abandonment points.

8. **JD URL fetcher** — for users who want to paste a job posting URL instead of the JD text. Out of scope for v1 but the schema supports it (`target.jd_text` can be populated from a URL fetch).

## State Management

Each session is uniquely identified by `session_id` and progresses through 4 stages. State is persisted after each stage completes — partial state (mid-stage) is held in browser until the stage completes, then sent to backend.

**Stage transitions:**

- Stage 01 → 02: requires identity confirmed + tier set + path selected
- Stage 02 → 03: requires deliverables selected + (target captured if jd_build/cover_letter chosen)
- Stage 03 → 04: requires Universal Floor met (≥1 role with bullets, ≥1 education entry, ≥5 skills, summary confirmed)
- Stage 04 → completed: requires QA passed + exports generated + persistence successful

Completion criteria for each stage are documented at the bottom of each stage file.

**Resumption:**

If a user abandons mid-session, the host program persists session state with `status: "in_progress"`. On resumption:
- Load the session from `session_id`
- Determine the last completed stage from `stage_outputs`
- Resume at the next stage (or re-render the UI for the in-progress stage)
- Conversation history is NOT preserved across resumption — only structured stage outputs

## Anti-Pattern Lint — Critical Hookup

This is the single highest-impact backend service. Detailed in `lib-anti-patterns.md`.

**Workflow:**

```
1. Receive assembled resume + cover letter content (post-tailoring, post-QA)
2. Run regex Phase 1 across all 8 anti-pattern categories:
   - Generic openers
   - Weak verbs
   - Keyword stuffing (3+ same noun phrase per section)
   - AI-tells
   - Over-condensation
   - Filler adjectives
   - Vague quantifiers
   - Unsupported superlatives
3. For each flagged item, call SYS_ANTIPATTERN_REVIEWER model
4. Apply rewrites silently (user doesn't see flagged content)
5. Re-run Phase 1 ONCE on rewritten content (no more loops — prevents infinite)
6. Surface remaining flags to user as Audit notes (non-blocking)
7. Output cleaned content + audit log
```

**Performance:** Phase 1 should complete in <50ms for a typical 2-page resume. Phase 2 latency depends on flag count (~500ms per flag). Most sessions should produce 0-5 flags.

**Why it matters:** UpDraft's positioning is "ATS-safe + actually good." The lint pass enforces "actually good." Without it, the AI-tell patterns slip through and resumes feel auto-generated. This is the BAD Labs brand floor — non-negotiable.

## Tier Classification — How It Works

Stage 01 classifies users into Tier 1-4 using a 3-question deterministic classifier (`stage-01-intake.md` § 1.4):

1. Years of relevant experience [0-2 / 3-7 / 8-15 / 15+]
2. Highest role level [IC / Team lead / Manager / Senior Manager / VP+]
3. Direct reports at peak [None / 1-5 / 6-15 / 15+]

The mapping function is deterministic (Python pseudocode in `stage-01-intake.md`):

```python
tier = max(min(years_floor, role_ceiling), reports_floor)
```

This handles the edge cases:
- 15-year IC with no reports → **Tier 2** (years says 4, ceiling caps at 2)
- 4-year manager with 12 reports → **Tier 3** (years says 2, reports floor pushes to 3)
- 6-year director with 8 reports → **Tier 3** (years says 2, reports says 3, ceiling allows 3)
- 20-year C-suite → **Tier 4** (years says 4, ceiling allows 4)

For Path A (Upload), the classifier auto-computes from parsed resume content. For Path B (Talk), all 3 questions are asked deterministically before classification.

User can override at any time via dropdown. If overridden, persist `tier_confidence: "overridden"` so analytics can track auto-classifier accuracy.

## ATS Compatibility — Hard Requirements

Every export must pass these checks. Violation = broken template, ship-blocking. Detailed in `lib-templates.md` § ATS Rules.

- ✅ Single column flow (no 2-column layouts, no side panels)
- ✅ ATS-safe font: Arial / Calibri / Times New Roman / Lato only
- ✅ Standard section headers ("Professional Experience" / "Education" / "Skills")
- ✅ Contact info in body (not header/footer)
- ✅ Standard bullet characters (• or –)
- ✅ Consistent date format (MM/YYYY throughout)
- ✅ No tables for layout, no text boxes, no images, no graphics
- ✅ DOCX + PDF both generated natively from the same data (docx-js + @react-pdf/renderer); PDF has its own selectable text layer

The 4 templates × 3 densities all comply with these rules. Don't add a 5th template without parsing-test validation against Workday, Greenhouse, Lever, Taleo, iCIMS, and SmartRecruiters.

## Testing Approach

### Unit Tests

For each `SYS_*` prompt:
1. Build a fixture set of inputs (10-20 examples per prompt)
2. Call the prompt against each fixture
3. Validate the output JSON against the expected schema
4. Score outputs against a manual rubric (truthfulness, completeness, voice consistency)

Recommended fixture sources:
- Real (anonymized) UpDraft sessions for evolution
- Edge cases for each tier (early career, late career, IC vs manager, gap-heavy resumes)
- Known anti-pattern examples (for lint pass testing)

### Integration Tests

End-to-end session flows:
1. Path A (Upload) + all 3 deliverables, Tier 2
2. Path B (Talk) + only resume, Tier 4
3. MOD-only session, Tier 1
4. Mid-session tier override (Tier 2 → Tier 3)
5. Lightweight MOD (CL-only with auto-built MOD)
6. Edge cases: scanned PDF rejection, < 200-word JD, sub-30% match score

### ATS Parsing Tests

Quarterly (per `lib-templates.md`):
1. Render sample resumes in all 12 template × density combinations
2. Submit to Workday, Greenhouse, Lever, Taleo, iCIMS, SmartRecruiters
3. Verify all sections extract correctly
4. Document any parser-specific quirks

### Lint Pass Tests

Per `lib-anti-patterns.md`:
1. Build a corpus of known anti-pattern bullets (10+ per category × 8 categories = 80+ examples)
2. Run regex Phase 1 — verify 100% detection
3. Run AI Phase 2 — verify rewrites preserve meaning + metrics, remove anti-pattern, no new anti-patterns introduced

## Known Limitations / v1 Scope

### What's IN scope for v1

- 4 templates × 3 densities (12 visual variants)
- 4 tier classifications with universal floor
- 3 deliverables (MOD, resume, cover letter) in any combination
- English language only
- US Letter page size only
- Standard ATS compatibility (Workday, Greenhouse, Lever, Taleo, iCIMS, SmartRecruiters)

### What's NOT in scope for v1

- **Re-tailoring flow** — user has existing MOD, wants new tailored resume for new JD without redoing Stage 03. Schema supports this; UI doesn't ship it. Scheduled for v1.5.
- **International formats** — A4 page size, EU-style CV with photos, federal resume format, academic CV with publications/grants. Different domain entirely.
- **Languages other than English** — Audit voice spec is English-tuned; bullet engineering is English-grammatical. Adding Spanish/Portuguese/etc. requires a full voice + grammar spec rewrite per language.
- **Portfolio integration** — designers/creatives often have visual portfolios. UpDraft generates the resume side; portfolio links go in the contact line but UpDraft doesn't host or generate portfolio content.
- **Recruiter-perspective scoring** — current ATS score is candidate-perspective. Future: a "what would a recruiter notice" scoring layer trained on real recruiter feedback.
- **Live editing collaboration** — single-user only. No real-time multi-user editing.
- **Resume *review* without rewrite** — UpDraft always produces output. Pure review/feedback flows route to a different host-program feature.

## Future Roadmap (Post-v1)

1. **v1.5 — Re-tailoring flow.** User selects existing MOD + pastes new JD → Stage 04 re-runs with new target, no new interview. Estimated 2 weeks of host-program work.

2. **v2.0 — Portfolio sites.** For Tier 4 candidates, generate a one-page portfolio site (separate from the resume) that hosts the longer-form transformation arc + STAR stories from MOD. Different output type, same MOD source.

3. **v2.5 — Multi-language.** Start with Spanish (Beau's intended South Africa expansion). Requires voice spec port + bullet engineering port + cultural adaptations to summary tone.

4. **v3.0 — Recruiter intelligence.** Train a recruiter-perspective model on labeled examples. Score every UpDraft output against "would a recruiter notice this in 8 seconds" and inform Stage 04 tailoring.

## Operational Considerations

### Cost per session

A typical Tier 3 full session (resume + CL + MOD) makes ~30-50 model calls. At current model pricing (~$0.01-0.05 per call), expect $0.30-$2.50 per completed session. Path A (Upload) costs slightly less because parsing replaces some interview turns.

### Latency targets

- Stage 01: 30 sec - 2 min (mostly user thinking time)
- Stage 02: 30 sec - 1 min
- Stage 03: 10-45 min depending on tier and mode
- Stage 04: 20-40 sec compute time (user-perceived as ~15 sec because preview happens during interaction)

### Failure modes

- Model returns malformed JSON → retry with explicit JSON schema reminder; if 3 retries fail, surface error to user with "try again" + skip-this-stage option
- Resume parser fails on PDF → reject with clear error, suggest Path B
- Native PDF generation fails (rare — no network) → fall back to DOCX-only export with note to user
- Backend persistence fails → keep session in `in_progress`, retry on next user action, surface error if persistent

### Privacy

- Resume content is sensitive PII — encrypt at rest, log access per-read
- No third-party sharing of resume content
- User can export all data as JSON archive (GDPR/CCPA portability)
- User can delete account → cascades to delete all sessions, exports, log entries
- User-facing privacy notice in host program UI footer (NOT in UpDraft skill flow)

## Versioning

- The skill bundle (this directory) is versioned as a unit. Tag releases as `updraft-v1.0.0`, etc.
- Individual `SYS_*` prompts in `lib-system-prompts.md` are versioned inline (comment headers — see `lib-system-prompts.md` § Versioning).
- Schema changes (any breaking change to `lib-output-contract.md`) require a major version bump.

## Maintenance

- Anti-pattern list (`lib-anti-patterns.md`) is a living spec — review quarterly against current AI-detection signals.
- Confidence Rubric weights (`lib-confidence-rubric.md`) may need re-tuning as candidate corpus shifts. Watch for drift signals (users reporting "score doesn't match my qualifications").
- Audit voice (`lib-audit-voice.md`) — drift detection patterns are documented in that file. If output starts feeling generic, re-check voice prompt loading.
- Template parsing tests should run quarterly against the 6 ATS systems listed.

## Contact

This skill was built for BAD Labs LLC. Skill ownership and roadmap decisions: Beau Dawson (CEO).

For technical questions about the skill files themselves, the spec is the source of truth — every stage file and lib file is self-contained and explains its inputs, outputs, sequence, and edge cases.
