# lib-confidence-rubric.md — Match Scoring Methodology

The Confidence Rubric is UpDraft's scoring system for measuring how well a candidate's experience matches a target JD. It produces a numerical match percentage (0-100%) plus a qualitative band (DIRECT / TRANSFERABLE / ADJACENT / WEAK / GAP) that drives downstream decisions.

## Why This Rubric Exists

Most resume tools score matches by simple keyword counting: "JD mentions Python; resume mentions Python; +1 match." That's brittle. A candidate who's used Python in a different domain still has the skill; a candidate who's only seen the word in a job ad doesn't.

The Confidence Rubric scores across 4 dimensions, weighted, so adjacent and transferable experience get proper credit. It also forces honest gap assessment — bullets that fail every dimension get flagged as actual gaps, not papered over with weak language.

## The 4 Dimensions

### 1. Direct Match (default 40% weight)

Same skill, same domain, same context.

| Score Range | Description | Example |
|---|---|---|
| 90-100% | Exact match (same skill, same domain, same context) | JD wants "B2B SaaS PM"; candidate is currently a B2B SaaS PM |
| 70-89% | Strong match (same skill, different domain) | JD wants "B2B SaaS PM"; candidate is a B2C SaaS PM |
| 50-69% | Good match (overlapping keywords, similar outcomes) | JD wants "B2B SaaS PM"; candidate is a B2B services PM |
| <50% | Weak direct match | JD wants "B2B SaaS PM"; candidate is a project coordinator |

### 2. Transferable Skills (default 30% weight)

Same capability in a different context.

| Score Range | Description | Example |
|---|---|---|
| 90-100% | Directly transferable (process is generic) | JD wants "team management"; candidate has run distributed teams in unrelated industry |
| 70-89% | Mostly transferable (some translation needed) | JD wants "stakeholder management"; candidate has done customer escalations |
| 50-69% | Partially transferable (analogy required) | JD wants "P&L ownership"; candidate has owned project budgets |
| <50% | A stretch to call it transferable | JD wants "M&A integration"; candidate has done regular team onboarding |

### 3. Adjacent Experience (default 20% weight)

Touched on it as a secondary responsibility, not the primary work.

| Score Range | Description | Example |
|---|---|---|
| 90-100% | Closely adjacent (just different framing) | JD wants "data analysis"; candidate runs BI dashboards as part of ops role |
| 70-89% | Clearly adjacent (related but distinct) | JD wants "user research"; candidate has done customer interviews for product feedback |
| 50-69% | Somewhat adjacent (requires explanation) | JD wants "data analysis"; candidate has used Excel pivot tables |
| <50% | Loosely adjacent | JD wants "data analysis"; candidate has read reports |

### 4. Impact Alignment (default 10% weight)

Achievement type matches what the role values.

| Score Range | Description | Example |
|---|---|---|
| 90-100% | Perfect alignment (metrics, scale, outcome type all match) | JD values "revenue retention"; candidate's headline outcome is $1.1M ARR preserved through migration |
| 70-89% | Strong alignment | JD values "revenue retention"; candidate has 90% account retention but no $ figure |
| 50-69% | Moderate alignment | JD values "revenue retention"; candidate has CSAT improvement |
| <50% | Weak alignment | JD values "revenue retention"; candidate's metrics are all efficiency-based |

## The Formula

```
Confidence = (Direct × W_d) + (Transferable × W_t) + (Adjacent × W_a) + (Impact × W_i)
```

Where:
- `W_d + W_t + W_a + W_i = 1.0` (weights sum to 100%)
- Default weights: `W_d=0.4, W_t=0.3, W_a=0.2, W_i=0.1`

### Tier 1 Override

Early-career candidates rarely have direct matches. Transferable signal carries more weight:

- Tier 1: `W_d=0.3, W_t=0.4, W_a=0.2, W_i=0.1`

This isn't being generous — it's being accurate. A 22-year-old with 6 months of internship experience and strong school projects has more transferable than direct, and the rubric should reflect that.

Tier 2-4 use default weights.

## Confidence Bands

Final score maps to a band, which drives downstream decisions:

| Score | Band | Action |
|---|---|---|
| 90-100% | **DIRECT** | Use bullet with confidence — minimal reframing needed. **Flag overqualification risk** if this score is on a JD requiring 50% fewer years than candidate has. |
| 75-89% | **TRANSFERABLE** | Strong candidate — light reframing recommended (use `lib-bullet-engineer.md` reframing strategies) |
| 60-74% | **ADJACENT** | Acceptable with reframing — flag as moderate fit; cover letter should reinforce |
| 45-59% | **WEAK** | Last resort — only use if no better option exists. Cover letter must address. |
| <45% | **GAP** | Flag as unaddressed JD requirement. See Gap Handling below. |

## Worked Example

**JD requires:** "Experience scaling support operations from 0-1 at growth-stage SaaS"

**Candidate bullet:** "Built 12-person US support division from scratch during post-acquisition integration, achieving 90% account retention across 1,500 migrated accounts"

**Scoring:**

- **Direct: 85%** — Same skill (building support from zero). Slightly different stage context (post-acquisition vs. growth-stage SaaS).
- **Transferable: 95%** — Greenfield support build is the exact capability. The transferability is essentially complete; only the stage context differs.
- **Adjacent: 70%** — M&A context is adjacent to growth-stage scaling. Both involve operational complexity, ambiguity, and pace.
- **Impact: 90%** — Retention metric maps to growth-stage value of customer preservation. Scale (1,500 accounts) is appropriate to growth-stage.

**Calculation (Tier 3 candidate, default weights):**
```
(85 × 0.4) + (95 × 0.3) + (70 × 0.2) + (90 × 0.1)
= 34 + 28.5 + 14 + 9
= 85.5%
```

**Band:** TRANSFERABLE (75-89%) → light reframing recommended.

**Reframing direction:** Emphasis-shift to lead with greenfield-build framing rather than the acquisition context. Use `lib-bullet-engineer.md` Strategy 2.

## Gap Handling

When a score falls below 60% (ADJACENT), three options in priority order:

### Option 1 — Reframe Adjacent Experience

Apply the four reframing strategies from `lib-bullet-engineer.md`:
- Keyword Alignment
- Emphasis Shift
- Abstraction Level
- Scale Emphasis

If reframing pushes the score above 60%, problem solved.

### Option 2 — Address in Cover Letter

The cover letter (`lib-cover-letter.md`) has a dedicated paragraph for gap acknowledgment. Honesty + adjacent experience + learning velocity is the standard structure.

This is the right move when:
- The gap is real but the candidate has strong adjacent work
- The user has flagged it in `interview_objections` ("tired of explaining...")
- The score is in WEAK band but candidate has compensating strengths

### Option 3 — Flag for Discovery

Before accepting a gap, run a branching interview to surface undocumented experience. This happens automatically in Stage 03 Phase C ("Surface the undocumented") but Stage 04 can re-trigger if a gap is identified after the interview is complete.

Audit's prompt:

> Pause — the JD wants [X] and your resume doesn't have it. Before we accept that as a gap: have you ever [adjacent activity], [transferable activity], or [related responsibility]? Sometimes this stuff is buried.

If the user surfaces something, run it through the Confidence Rubric. If still <60%, accept the gap and address in cover letter.

## Score Calibration Notes

### What Counts as "Evidence"

For a skill to score above 50% on Direct or Transferable, the resume must contain at least one bullet that:
- Names the skill or a recognized synonym
- Quantifies or contextualizes the skill (scope, scale, or outcome)
- Is not just a list-style mention in a Skills section

A line item in the Skills section alone is worth ~30% Direct, no more. Real evidence requires demonstration in Experience.

### Anti-Inflation Rules

The rubric must not be gamed by over-claiming. If during scoring the model suspects evidence is thin or stretched:

1. **Drop the Direct score.** A bullet that contains the keyword but doesn't actually demonstrate the skill scores Direct < 60%.
2. **Don't compensate with high Transferable.** Transferable requires demonstrated capability in a different context, not absence of demonstration.
3. **Flag for human review** if total score lands in the 60-75% range with thin evidence — borderline TRANSFERABLE/ADJACENT calls are where over-claiming is most tempting.

### Why Impact is Only 10%

Impact alignment is the smallest weight because it's the easiest dimension to inflate. Every candidate thinks their outcomes "matter." The rubric leans on Direct + Transferable for honest signal.

That said, Impact does the work of distinguishing two candidates with similar skill matches — when both have the same Direct/Transferable scores, the one whose impact type matches the role's value system wins.

## When the Rubric Returns NULL

Stage 02's match analyzer can return `overall_match_pct = null` when:

- `resume_parsed` is null (Path B / no upload)
- The JD is too thin to extract requirements (under 200 words)
- The JD doesn't follow standard structure (no Requirements/Responsibilities sections)

Null is a valid result. Stage 04 re-runs scoring after Stage 03 builds the MOD, so the null can be filled in later. Don't fake a score to fill the slot.

## Integration With Stage 04 Tailoring

When Stage 04 tailors a resume, the Confidence Rubric runs per bullet — every bullet is scored against the JD requirements, and tailoring decisions are made bullet-by-bullet:

- DIRECT/TRANSFERABLE bullets: keep as-is or apply light reframing
- ADJACENT bullets: apply reframing strategy from `lib-bullet-engineer.md`
- WEAK bullets: consider replacing with a different bullet from the same role, if MOD has alternatives
- GAP bullets: don't include if better options exist; if no alternatives, address in cover letter

This bullet-level scoring is what makes UpDraft's tailoring better than keyword-matching tools.

## Calibration Drift

Like the system prompts, the rubric weights are tuneable. If output quality drifts (e.g., users start reporting "the score doesn't match my actual qualifications"), check:

1. **Tier 1 weights** — easiest to drift. If early-career candidates are scoring too low, the Transferable weight may need to go higher.
2. **Direct vs. Transferable ratio** — if mid-career candidates are scoring too high on roles they're a poor fit for, Direct weight may need to come up.
3. **Impact alignment definition** — if scores are clustering at 50-60%, the Impact thresholds may be too tight.

Document any weight changes in `lib-system-prompts.md` versioning notes alongside the related prompt changes.
