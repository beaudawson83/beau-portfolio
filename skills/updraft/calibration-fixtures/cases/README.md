# Calibration cases

Each case is a (resume × JD × tier × expected) tuple the harness scores
against the production `analyzeMatch()`. Add cases as YAML or JSON; the
loader accepts either, and a single file may contain one case (object)
or many (array).

## Schema

```yaml
name: short-kebab-name           # required — used in CLI filter + result table
resume: marketing                # required — basename in ../resumes/{resume}.txt
jd: 06-3search-growth-marketing  # required — basename in ../jds/{jd}.txt
tier: 2                          # optional — 1|2|3|4. If omitted, harness auto-classifies.
expected:                        # required — at least one assertion below
  band: GAP                      # optional — DIRECT|TRANSFERABLE|ADJACENT|WEAK|GAP
  min_pct: 0                     # optional — number in 0..100
  max_pct: 45                    # optional — number in 0..100
  critical_gap_keywords:         # optional — substrings the analyzer must surface as critical-severity gaps
    - category mismatch
    - travel center
notes: |                         # optional — free-form notes, not asserted, kept for context
  Why this case matters: ...
```

## Writing good cases

1. **Pick clear ground truth.** A case with band `WEAK` borders `ADJACENT`
   (band cutoffs are ±5pp wide) — those are noisy. Prefer cases with
   obvious GAP, obvious DIRECT, or transitions you specifically want the
   prompt to detect.
2. **State why the case matters** in `notes`. The next person tuning the
   prompt needs to know which failure mode this case is meant to catch.
3. **Use `critical_gap_keywords`** to assert the analyzer surfaces the
   right *headline* gap, not just a numeric pct. The analyzer can hit
   the right band for the wrong reason — keyword assertions catch that.

## Example: Beau vs. Vaughan (the canonical bad-match benchmark)

The first benchmark in CALIBRATION.md (Beau Dawson resume × Vaughan
Director of Operations JD) isn't in this corpus — Beau was the
candidate, and the JD wasn't captured. When you reproduce that case,
the fixture will reference Beau's resume + a `vaughan-director-ops` JD
and assert `band: GAP, max_pct: 45, critical_gap_keywords: ['category mismatch']`.

## Adding a case

1. Pick a resume + JD pair from `../resumes/` + `../jds/`.
2. Decide the *expected* outcome based on your judgment of the pair —
   use the confidence rubric at `references/lib-confidence-rubric.md`.
3. Save as `cases/{name}.yaml`.
4. Run `npm run calibrate:match -- --case {name}` to score it.

Each round of prompt tuning should re-run the full case set so a fix to
one case doesn't silently regress the others.
