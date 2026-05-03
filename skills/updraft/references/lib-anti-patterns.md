# lib-anti-patterns.md — Lint Pass Specification

The anti-pattern lint pass is a deterministic check the host program runs on assembled resume + cover letter content **before any export**. It catches the patterns that make resumes feel generic, AI-written, or unprofessional.

## How the Lint Pass Works

The pass runs in two phases:

1. **Phase 1 — Regex detection** (deterministic, host program). Scans assembled content for known anti-pattern strings. Fast, exhaustive, no model call.
2. **Phase 2 — AI rewrite** (model, `SYS_ANTIPATTERN_REVIEWER`). For each flagged item, sends to model for a clean replacement that preserves meaning and metrics.

The user never sees the flagged content — only the cleaned version. The lint pass is silent on success.

If a bullet is flagged but cannot be cleanly rewritten (no concrete content to preserve), `SYS_ANTIPATTERN_REVIEWER` returns `needs_human_review: true` and the bullet is surfaced to the user as an Audit-voiced note before export:

> One bullet I couldn't clean up: "[bullet]". It needs more context to be useful. Want to give me a metric or scope, or cut it?

---

## Pattern Categories

### 1. Generic Openers

Phrases that say nothing about the candidate. Banned from summaries and bullet leads.

**Detection (regex):**

```
^(Results-driven|Highly motivated|Detail-oriented|Self-starter|Goal-oriented|Hard-working|Dedicated|Passionate)\s+(professional|individual|team player|leader)\b

Variants caught:
- "Results-driven professional"
- "Highly motivated team player"
- "Detail-oriented self-starter"
- "Goal-oriented individual"
- "Dedicated professional with..."
- "Passionate leader"
```

Also catches mid-sentence usage when followed by `with X+ years` patterns.

**Why it matters:** These phrases are universal — every resume has them, so they signal nothing. They're filler that buys nothing. Worse, they trigger AI-detection scans (since they're statistically over-represented in AI-generated resumes).

**Fix pattern:** Replace the opener with a concrete identity statement.

```
BEFORE: "Results-driven professional with 8 years of experience in
         project management."

AFTER:  "Project management leader with 8 years scaling B2B SaaS
         delivery teams from 12 to 60 people across 3 acquisitions."
```

### 2. Weak Verbs

Verbs that hedge the user's actual contribution. Banned in all bullets.

**Detection (regex):**

```
\b(Responsible for|Helped with|Helped to|Assisted in|Assisted with|Participated in|Involved in|Worked on|Was tasked with|Duties included|Tasked with)\b

Variants caught:
- "Responsible for managing..."
- "Helped with customer service"
- "Assisted in onboarding..."
- "Participated in cross-functional meetings"
- "Worked on improving..."
- "Was tasked with..."
- "Duties included..."
```

**Why it matters:** Weak verbs make the candidate sound like they were nearby when something happened, not that they did it. Every bullet should claim ownership.

**Fix pattern:** Replace with a power verb (see `lib-bullet-engineer.md` Power Verb Library) that names the actual action.

```
BEFORE: "Responsible for managing customer support team"

AFTER:  "Led 15-person customer support team" (if metric available)
        OR
        "Managed customer support team across 3 product lines"
        (if scope available)
```

### 3. Keyword Stuffing

The same noun phrase repeated 3+ times in the same section. Common when over-eagerly inserting JD keywords.

**Detection (deterministic):**

For each section (summary, experience, skills, education):
1. Tokenize into noun phrases (length 1-3 words)
2. Count occurrences of each phrase
3. Flag any phrase appearing 3+ times in a single section

Exclude from counting: company names, role titles, candidate name, common job-title words ("manager", "engineer", "analyst").

**Why it matters:** Keyword stuffing trips ATS keyword-density scoring (modern ATS treats overuse as a fraud signal) AND reads poorly to humans. Mirror the JD vocabulary — don't pile it on.

**Fix pattern:** Vary terminology across instances. Keep meaning, swap synonyms or restructure sentences.

```
BEFORE (3x "stakeholder management" in experience section):
  "Led stakeholder management for product roadmap"
  "Provided stakeholder management across engineering teams"
  "Stakeholder management included executive briefings"

AFTER:
  "Led stakeholder alignment for product roadmap"
  "Coordinated cross-functional partnership with engineering teams"
  "Conducted executive briefings as part of stakeholder management"
```

(Total instances: 1, down from 3. Other instances use synonyms.)

### 4. AI-Tells

Phrases statistically over-represented in AI-generated text. Banned.

**Detection (regex):**

```
\b(It['\u2019]s worth noting that|Furthermore,|Additionally,|In today['\u2019]s competitive landscape|Delve into|Leverage(?:d|s|ing)? my|Robust solutions|Cutting-edge|Innovative solutions|Synergize|Spearhead innovative)\b

Em-dash overuse: more than 2 em-dashes (— or --) in a single bullet
or paragraph

Variants caught:
- "It's worth noting that..."
- "Furthermore, I..."
- "In today's competitive landscape..."
- "Delve into the data..."
- "Leveraged my expertise..."
- "Robust solutions for complex challenges"
- Excessive em-dash mid-sentence
```

**Why it matters:** Modern recruiters and ATS systems screen for AI-generated content. 62% of employers reject resumes that "feel AI-written." These phrases are the tells.

**Fix pattern:** Strip the phrase entirely; rewrite the sentence to flow without it.

```
BEFORE: "Furthermore, I leveraged my expertise in data analysis to
         delve into customer behavior patterns."

AFTER:  "Analyzed customer behavior patterns using SQL and Tableau
         to identify churn drivers."
```

### 5. Over-Condensation

Bullets that compressed so far they lost their subject and verb. The user knows what they did, but the bullet doesn't communicate it to a stranger.

**Detection (heuristic — model-assisted in Phase 2):**

A bullet flags for over-condensation if:
- Lacks a verb in active voice (gerunds and noun phrases only)
- Lacks a clear "who did what" structure
- Could describe any candidate at any company

Examples of over-condensation:
- "Stakeholder management and strategic alignment"
- "Cross-functional collaboration"
- "Operational excellence and continuous improvement"
- "Process optimization across multiple teams"

**Why it matters:** These bullets are decorative, not informative. They don't help a recruiter decide anything.

**Fix pattern:** Add the subject (you, the candidate, did what), the verb (the action you took), and the object (what changed).

```
BEFORE: "Stakeholder management and strategic alignment"

AFTER:  "Aligned 5 cross-functional stakeholders on Q3 product
         roadmap, reducing scope-change requests 60%"
```

### 6. Filler Adjectives

Adjectives that don't add specificity. Common in summaries and headlines.

**Detection (regex):**

```
\b(very|really|quite|extremely|highly|truly|incredibly|fantastically|amazingly)\s+\w+\b

Banned standalone adjectives in summary contexts:
- "innovative" (without specifics)
- "dynamic"
- "synergistic"
- "transformative" (only acceptable for Tier 4 with concrete transformation)
- "cutting-edge"
- "best-in-class"
```

**Why it matters:** "Highly skilled" tells the reader nothing. The skills should be visible in the bullets; the adjective is filler.

**Fix pattern:** Strip the adjective. If the meaning is essential, replace with specifics.

```
BEFORE: "Highly skilled in data analysis"

AFTER:  "8 years of data analysis using SQL, Python, and Looker"
```

### 7. Vague Quantifiers

Numbers that aren't actually numbers.

**Detection (regex):**

```
\b(many|several|various|multiple|numerous|countless|a number of|some)\s+(\w+)

Variants caught:
- "many cross-functional teams"
- "several stakeholders"
- "various tools"
- "multiple projects"
- "numerous initiatives"
```

**Why it matters:** Vague quantifiers signal the user doesn't have the actual number — which means the achievement is small or untracked.

**Fix pattern:** Replace with the actual number, or reframe to drop the quantifier.

```
BEFORE: "Led many cross-functional initiatives"

AFTER (with number):  "Led 6 cross-functional initiatives"

AFTER (no number):    "Led cross-functional initiatives across
                       Engineering, Product, and Customer Success"
```

### 8. Unsupported Superlatives

Claims of being "the best" without evidence.

**Detection (regex):**

```
\b(best-in-class|world-class|industry-leading|top-tier|premier|elite|unparalleled|unmatched|exceptional|outstanding)\s+(\w+)

Banned in resumes (acceptable in cover letters only when supported
with specific evidence in the same paragraph)
```

**Fix pattern:** Strip the superlative. Show the evidence; don't claim the title.

```
BEFORE: "Built world-class customer success program"

AFTER:  "Built customer success program with 95% retention rate
         (industry average: 73%)"
```

---

## Lint Pass Workflow

The host program implements the lint pass as a sequence:

```
INPUT: assembled resume + cover letter content (post-tailoring)

1. For each section (summary, experience bullets, skills, cover letter):
   For each anti-pattern category:
     Run regex/heuristic detection
     Collect flagged items with: location, type, current_text

2. If no flags: return "lint_passed: true". Done.

3. If flags exist:
   Send each flagged item to SYS_ANTIPATTERN_REVIEWER
   Receive rewritten bullet (or null + needs_human_review flag)

4. Apply rewrites:
   - Successful rewrites: silently replace original
   - needs_human_review items: surface to user via Audit voice

5. Re-run lint pass on the rewritten content (one re-run only —
   prevent infinite loops)

6. If re-run passes: return "lint_passed: true"
   If re-run still fails: surface remaining issues to user

OUTPUT: cleaned content + audit log of fixes applied
```

## Severity Tiers

Not all flags are blocking. The lint pass categorizes:

**Blocking (must be fixed before export):**
- Generic openers in summary
- Weak verbs in any bullet
- AI-tells anywhere
- Over-condensation that loses meaning
- Unsupported superlatives in resume body

**Non-blocking (surfaced to user, optional fix):**
- Vague quantifiers (sometimes the user genuinely doesn't have the number)
- Filler adjectives in cover letter (some stylistic latitude)
- Keyword stuffing at exactly 3 instances (borderline — user may accept)

The host program presents non-blocking flags via Audit:

> Two things I'd tighten if you give me the chance:
> — "many cross-functional teams" — do you have the actual number?
> — "highly skilled in data analysis" — strip "highly" and lean on the bullets to do the work
> Want me to fix these, or ship as-is?

User decides. Skip → ship with the patterns. Fix → re-run model rewrites.

## Performance Notes

- Phase 1 (regex) should run in <50ms even on a 2-page resume — pure string matching.
- Phase 2 (AI rewrites) adds latency proportional to flag count. Budget ~500ms per flag.
- For a typical Stage 04 export, expect 0-5 flags total. Most should be 0 if Stage 03 did its job.
- High flag counts (10+) signal that Stage 03 didn't push hard enough on bullet writing — surface this as telemetry to inform prompt tuning.

## Why This Matters for the BAD Labs Brand

UpDraft's positioning is "ATS-safe + actually good." The lint pass is what enforces the "actually good" half. A resume that passes ATS but reads like AI slop fails the brand promise.

This pass is non-negotiable. Every export runs it. No bypass for "trusted users" or "advanced mode" — the lint pass is the floor.

## Maintenance

Anti-patterns evolve. Some patterns were AI-tells in 2024 and are now common human writing (or vice versa). Review this list quarterly:

1. Audit recent UpDraft exports flagged for "feels AI-written" by users
2. Compare to current AI-detection tool patterns (GPTZero, Originality.ai signal sets)
3. Add or remove patterns based on signal
4. Update regex; document changes in this file's version history

The pattern list is a living spec, not a one-time build.
