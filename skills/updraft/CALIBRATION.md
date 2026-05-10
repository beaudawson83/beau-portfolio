# UpDraft — Match Analyzer Calibration

Durable home for prompt-tuning notes and live-test calibration cases for
`SYS_MATCH_ANALYZER` (Stage 02.3). Maintained as we discover quality issues
and gather user-validated examples for benchmarking.

## Status

**v0.1:** ships with the canonical `SYS_MATCH_ANALYZER` prompt from
`references/lib-system-prompts.md` plus a runtime
`TARGET_EXTRACTION_INSTRUCTION` addendum in
`src/lib/updraft/match-analyzer.ts`. Pipeline is correct end-to-end:
schema validates, structured output parses, persistence + retry path
work, briefing renders, token usage records into quotas. **Quality has
known over-generosity issues, parked for v0.5 prompt tuning.**

## Why this is parked, not fixed

Fixing prompt quality is iterative empirical work — not a one-shot edit.
It requires:

- A corpus of known-good and known-bad matches to test against.
- Multiple rounds of prompt edits + re-scoring + comparing.
- Acceptance criteria that're stricter than "looks right on one example."

Beau is collecting calibration examples (some he knows are good matches,
some he knows are bad) so the tuning pass has real ground truth to score
against, not vibes. Until that corpus exists, prompt edits are guesses.

## Known quality issues observed

These are the patterns we want the tuned prompt to handle correctly.

### 1. Surface-level keyword matching (over-matches required skills)

The default LLM behavior is to pattern-match keywords across the JD and
the resume and call it a match. That misses the contextual / scale check
that determines whether the experience actually fits.

**Fix shape:** Tighten the prompt's `match=true` criteria. Require
evidence to be a verbatim sentence from the resume that demonstrably
proves the requirement *at the right scale*. Add explicit "false-positive
avoidance" rules to the prompt:

- **Industry-name overlap ≠ industry experience match.** "Expedia" is
  online travel; "travel center" is a physical truck stop chain. Same
  word, different category.
- **Title-keyword overlap ≠ role-shape match.** A Customer Experience
  Director who's "led teams" is not the same as a Director who's "led
  multi-unit field-based GM teams."
- **Tooling-name overlap ≠ functional skill match.** Mentioning
  Salesforce in a resume bullet is not the same as "implemented
  Salesforce as a corporate platform across X regions."

### 2. Missing category-mismatch detector

When the candidate's industry / scale / role-shape is fundamentally
different from the JD's, that's the headline gap — surface it loud, drop
the score. Today, the analyzer over-weights keyword matches and produces
a `DIRECT` or `ADJACENT` score even on category-mismatched pairings.

**Fix shape:** Add a pre-scoring step in the prompt that classifies the
pairing along three dimensions:

- **Industry match** — digital ops vs. physical retail vs. healthcare vs.
  finance vs. manufacturing, etc.
- **Scale match** — 1k SaaS accounts vs. 50 brick-and-mortar sites vs.
  enterprise multi-thousand-employee.
- **Role-shape match** — CX leader vs. Operations leader vs. Engineering
  leader vs. Sales leader.

When any dimension is fundamentally mismatched, the analyzer should:

1. Add a `critical`-severity entry to `gaps[]` describing the mismatch.
2. Apply a band cap — e.g., score cannot exceed `WEAK` (59%) on a
   category mismatch, regardless of how many surface-keyword matches the
   resume produces.

### 3. `strengths_to_emphasize` just echoes matched required skills

Per spec (lib-system-prompts.md § SYS_MATCH_ANALYZER, task 6): "top 3
selling points the candidate should lead with on the tailored resume."
Today it just lists matched required skills, which duplicates
`required_skills[].match=true` and provides no strategic insight.

**Fix shape:** Redefine in the prompt as "top 3 *strategic* selling
points distinct from the matched-required-skills list — what's the
candidate's unique angle on this role given the rest of their career
arc, beyond what the JD literally asked for." Add an explicit
non-overlap rule: do not produce a strength that is also already a
matched required skill.

### 4. Confidence band over-generosity

The five-band breakdown (`DIRECT` / `TRANSFERABLE` / `ADJACENT` / `WEAK`
/ `GAP`) compresses too much real signal into `ADJACENT`. A
category-mismatch pairing can land at 60%+ if surface keywords align —
which puts it in `ADJACENT` per the band cutoffs, but realistically
should be `GAP`.

**Fix shape:** This may resolve itself once category-mismatch detection
lands (issue #2). If not, consider tightening the band cutoffs or adding
explicit penalty multipliers for category mismatch.

## Benchmark cases

When the tuning pass starts, run each of these through the analyzer and
verify the result matches the expected outcome. Add new cases as Beau
collects them.

### Benchmark #1 — Beau resume vs. Vaughan Director of Operations (BAD MATCH)

**Date observed:** 2026-05-04 (live test on prod)

**Resume profile:** Beau Dawson — Customer Experience executive, 20+ yrs
across consumer SaaS, hospitality marketplaces, post-acquisition
environments. Career: Expedia/HomeAway → Eviivo → Union → Savvy → BAD
Labs (founder, AI consultancy). Resume is positioned for Director of
Customer Experience roles in SaaS / consumer apps.

**JD:** Director of Operations at Vaughan Executive Partners, LLC.
Physical multi-unit travel center operations across the Western US.
Required:

- 7+ yrs multi-unit operations leadership with P&L
- Travel center / convenience retail / QSR experience
- Field-based team leadership
- Operational systems / technology platforms
- Supply chain understanding

Plus a "10 years travel center experience" gate at the LinkedIn
application step that doesn't appear in the JD body.

**Result returned (v0.1 prompt):**

- Overall match: **62.5%**, band `ADJACENT`
- Required skills: **4 / 5 matched ✓**
  - ✓ Multi-unit operations leadership with P&L
  - ✓ Travel centers / convenience retail / QSR
  - ✓ Hiring + leading field-based teams
  - ✓ Operational systems + tech platforms
  - ✗ Supply chain / merchandising / vendor management
- Preferred skills: 0 / 1 matched (F&B operations)
- Gaps surfaced: 2, both `major` (supply chain, F&B). **Zero `critical`.**
- `strengths_to_emphasize` = three of the four matched-required-skills
  rephrased.

**Expected result (after tuning):**

- Overall match: **under 45%**, band `GAP`
- Required skills: **at most 1 / 5 matched ✓** — the only legitimate
  match is "operational systems + tech platforms" (CRM, support tooling,
  AI platform implementation). The other four should be `match=false`:
  multi-unit ops leadership in SaaS-account-portfolio terms is not what
  the JD asks for; Expedia is not a "travel center"; "field-based teams"
  means physical-site GMs, not remote support staff.
- At least 1 `critical`-severity gap: **category mismatch** (digital CX
  leader → physical retail/F&B operator). Plus `critical` gaps for no
  travel center experience, no F&B operations, no multi-unit physical
  P&L responsibility, no field GM management.
- `strengths_to_emphasize` should pivot to whatever angle the candidate
  *might* sell to a hiring manager despite the gap (e.g., "operational
  systems thinking applied across categories", "transformation
  experience in post-acquisition environments") — and explicitly NOT be
  a copy of the matched-skills list.

**Why this case matters:** if v0.5's tuned prompt scores this at GAP
with a critical category-mismatch gap, two of the four known quality
issues above are functionally fixed. If it still scores ADJACENT, more
work is needed.

### Benchmark #2+

Beau is collecting a calibration corpus — examples he knows are good
matches and examples he knows are bad. Add each case here as it lands,
with the same structure: Resume profile, JD summary, Result returned,
Expected result, Why this case matters.

## Test harness for the tuning pass — SHIPPED 2026-05-10

Iterating on the prompt by clicking through the full Stage 01 → Stage 02 UI
on prod (or even local dev) is too slow. Each round needs: log in, start a
session, upload a resume, confirm identity, classify tier, pick deliverables,
paste a JD, click Analyze, screenshot the briefing. Five minutes per
attempt. Tuning needs *dozens* of attempts.

The harness lives at [`scripts/calibrate-match-analyzer.ts`](../../scripts/calibrate-match-analyzer.ts)
and runs against the corpus at
[`skills/updraft/calibration-fixtures/`](calibration-fixtures/).

### Usage

```bash
# Score every case in cases/*.yaml against the production prompt.
npm run calibrate:match

# Score one case (substring match on case name).
npm run calibrate:match -- --case vaughan

# (Re)parse all corpus resumes — cached as resumes/{name}.parsed.json.
# Run once on first use, again only after the parser changes.
npm run calibrate:parse

# Re-parse one resume.
npm run calibrate:parse -- --resume marketing
```

Requires `GEMINI_API_KEY` in `.env.local` (loaded via dotenv). The harness
skips quota counters / kill switches — calibration is owner-only work,
not user traffic.

### Layout + schema

- **`calibration-fixtures/resumes/{name}.txt`** — anonymized raw resume
  text. Identity-only swaps (name / email / phone / address / LinkedIn
  slug); companies + dates + bullet content preserved verbatim.
- **`calibration-fixtures/resumes/{name}.parsed.json`** — cached
  SYS_RESUME_PARSER output. Created on first run; commit alongside the
  .txt so future harness runs don't re-burn parser tokens.
- **`calibration-fixtures/jds/{NN-name}.txt`** — anonymized JD text.
  LinkedIn UI chrome stripped; recruiter / hiring-team person names
  swapped.
- **`calibration-fixtures/cases/{name}.yaml`** — case files. One case
  per file or an array per file. Schema:

  ```yaml
  name: short-kebab-name           # required
  resume: marketing                # required — basename in resumes/
  jd: 06-3search-growth-marketing  # required — basename in jds/
  tier: 2                          # optional — 1|2|3|4. Auto-classified if omitted.
  expected:                        # required — at least one assertion
    band: GAP                      # DIRECT|TRANSFERABLE|ADJACENT|WEAK|GAP
    min_pct: 0
    max_pct: 45
    critical_gap_keywords:
      - category mismatch
  notes: |                         # optional — context, not asserted
    Why this case matters: ...
  ```

### Workflow

1. **Pick a resume + JD pair** from the corpus (or add a new pair per
   the rules in `calibration-fixtures/README.md`).
2. **Write the case** in `cases/{name}.yaml` with your ground-truth
   expected outcome. Use the confidence rubric at
   `references/lib-confidence-rubric.md` to set band cutoffs.
3. **Run the harness** — `npm run calibrate:match -- --case {name}` —
   to see the current prompt's verdict.
4. **Repeat** for every benchmark you care about. The harness prints a
   summary table + per-case detail; aim for an "N/N passing" baseline
   before editing prompts.
5. **When tuning** — make one prompt change at a time, re-run the full
   set, compare deltas. A good change moves bad cases right without
   regressing good ones. Log the delta in this file as you go.

### Corpus state — 2026-05-10

7 anonymized resumes + 7 anonymized JDs staged. **Cases are not yet
written** — the harness ships with `cases/example.yaml` as a schema
reference but no asserted expected outcomes. Beau is collecting cases
per the prose benchmarks above; the first round of tuning will need at
least 4–6 cases (mix of obvious-DIRECT, obvious-GAP, and at least one
pivot case where the analyzer is known to over-generously score).

The first benchmark in this file (Beau vs. Vaughan Director of
Operations) is **not yet** in the corpus — Beau was the candidate, and
the JD wasn't captured. When that case lands, fixture name
`vaughan-director-ops` is reserved.

### Cost guard

The harness skips the production quota counters — calibration runs are
owner-only and shouldn't pollute the daily-cap counters that real
visitors share. Watch the `tokens (in/out)` column in the result table
to track real spend per round.

## Tuning workflow when we pick this up

1. **Read this file end-to-end before editing any prompts.**
2. **Snapshot the baseline.** Run all benchmark cases against the
   current prompt and document the scores. This is the "before" state.
3. **Make one prompt change at a time.** Re-run benchmarks after each
   change. Compare to baseline.
4. **A change is good** if it moves the bad cases toward expected
   results AND doesn't regress the good cases. If a change moves bad
   cases right but regresses good cases, the prompt overcorrected — back
   off and try a softer rule.
5. **Update this file** as you go: log the change made, the score
   deltas across all benchmarks, what worked and what didn't. Treat it
   as a running lab notebook — the next round of tuning will benefit
   from knowing what was already tried.
6. **Acceptance criteria:** all benchmark cases pass within their
   expected band, with reasonable margin (e.g., a `GAP` benchmark scores
   < 40% comfortably, not 44.9%). When that holds, ship the prompt
   tuning as a single `feat(updraft): tune SYS_MATCH_ANALYZER` commit
   and add a DECISIONS.md entry pointing here.

## Stage 03 deferred features (v0.1 → v0.5)

Stage 03 v0.1 ships a "review + augment + summarize" form: editable
parsed roles + bullets + earlier-career + Tier 2 deepening + AI summary
draft via `SYS_SUMMARY_GENERATOR`. The full conversational interview
from the spec is parked. Specifically, these features are deferred to
v0.5 alongside the match-analyzer tuning pass:

### 1. AI bullet rewriter (`SYS_BULLET_REWRITER`)

Spec describes Audit interactively pulling metric / scope / comparison
out of the user via conversation in Phase B, then rewriting weak bullets
in real time. Without that conversational extraction, the rewriter just
rephrases — adds no real value, only false fluency. Defer to v0.5 when
the conversational pattern lands.

**Fix shape (v0.5):** Per-bullet "✨ Rewrite with Audit" button opens a
small modal with extraction inputs (metric, scope, comparison, outcome)
+ one-click rewrite. Or — better — full Phase B chat per role.

### 2. Phase C "surface the undocumented" prompts

Spec: Audit listens for buried experience (cross-functional work,
hiring scope, crisis-response moments) and reflects it back as positive
findings. Hard to do in a form; needs the chat surface.

### 3. Phase D skill surfacing card

Spec: per-role AI-generated skill list with evidence + confirm/reject UI.
Useful but only worth building once the chat exists to gather the
material.

### 4. STAR story extraction (Tier 3+)

Spec asks "what's the single thing from this role you'd lead with in an
interview" and walks through Situation → Task → Action → Result. Pure
Tier 3+ deepening — out of scope for v0.1's Tier 2-only scope and out of
shape for the form-only v0.1 UI.

### 5. Tier 1 / Tier 3 / Tier 4 deepening branches

v0.1 only handles Tier 2 deepening (cross-role through-line, tools,
interview objections). The other tier branches (projects/coursework
for Tier 1; leadership brand + cross-functional scope for Tier 3;
transformation arc + board/advisory for Tier 4) all defer to v0.5.

### 6. Tier-bump mid-interview

Spec edge case: if a Tier 2 user demonstrates Tier 3 thinking, Audit can
offer a tier bump. Requires conversational signal-reading — defer with
the conversational interview.

When the v0.5 tuning pass starts, these all become candidates for the
same iteration cycle as the match-analyzer prompt-tuning. Re-read this
section before scoping that work.

## Where the prompt actually lives

- **Canonical** `SYS_MATCH_ANALYZER` prompt:
  [`references/lib-system-prompts.md`](references/lib-system-prompts.md)
  — versioned independently of stage flow per the spec convention.
  Permanent rules belong here.
- **Confidence rubric** loaded as additional context:
  [`references/lib-confidence-rubric.md`](references/lib-confidence-rubric.md).
  Scoring methodology — mostly out of scope for the prompt-tuning pass
  but worth re-reading when calibrating band cutoffs.
- **Runtime addendum** for target metadata extraction:
  `src/lib/updraft/match-analyzer.ts` `TARGET_EXTRACTION_INSTRUCTION`.
  Layered tasks that aren't part of the canonical prompt belong here —
  keeps the spec stable while still letting us iterate.

The runtime-addendum pattern is the right place for prompt edits that're
*tactical* (specific instructions for a known v0.x failure mode). Once a
tactical fix proves itself, consider promoting it into the canonical
prompt with a versioning note.

---

## Casing normalization watch — added 2026-05-06

`SYS_RESUME_PARSER` originally said "preserve bullet text VERBATIM" with
no guidance on other fields. Result: resumes that style the name banner,
section headers, or job titles in ALL CAPS leaked that styling into the
parsed data — `identity.name` would come back as `"BEAU DAWSON"` instead
of `"Beau Dawson"`, which then propagated into the MOD, the cover letter
greeting, and the rendered DOCX header.

**Fix shipped 2026-05-06:** added field-by-field casing rules to
`SYS_RESUME_PARSER` (rules 8-11 in the canonical prompt). Brand-name +
acronym carve-outs are explicit (IBM, eBay, BAD Labs, McKinsey & Company
all preserve as-is). Skills and bullets are explicitly excluded from
normalization — those legitimately carry capitalization (SQL, AWS) or
verbatim styling.

**What to watch for during corpus collection:**

- **Real brand names that the model "corrects":**
  - "BAD Labs" lowered to "Bad Labs"
  - "eBay" → "EBay" or "Ebay"
  - "iPhone" → "IPhone"
  - "McDonald's" → "Mcdonald's"
  - Style-trademarked brands ("THE NORTH FACE", "DKNY") — these are
    intentional all-caps brand styling. Hard to tell automatically.
  - Real-name lowercase styling ("danah boyd") that the model may
    auto-Title-Case despite the carve-out.
- **Acronym false positives:**
  - 2-4 letter all-caps tokens that are NOT acronyms ("LOVE", "WORK"
    section headers that leaked into a field). Less likely but possible.
- **Names with unusual casing:**
  - "MacBook"-style camel names in identity.name
  - Hyphenated names with mixed casing ("Beau-James")
  - Suffix variations ("PhD" vs "Ph.D." vs "Ph.D")

**How to report a casing miss:** capture the exact resume input and the
parsed JSON output. Add to a casing-misses corpus file alongside the
match-analyzer benchmark cases. Once we have ≥3 misses, the v0.5 tuning
pass folds in a tactical addendum on top of the canonical prompt
(same pattern as `TARGET_EXTRACTION_INSTRUCTION` in
`match-analyzer.ts`).

**Backfill note:** the prompt change applies to **future parses only**.
Existing test sessions stay mangled until re-parsed. If you have a
session you care about — re-upload the resume to start a fresh session.
