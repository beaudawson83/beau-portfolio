# lib-bullet-engineer.md — Bullet Writing & Reframing

This file contains the toolkit for two distinct bullet operations:

1. **Writing**: turning weak bullets (or interview content) into strong achievement bullets. Used in Stage 03 Phase B.
2. **Reframing**: adapting strong bullets to a specific JD without changing facts. Used in Stage 04 tailoring.

## When to Use Which

| Situation | Use | Driving Prompt |
|---|---|---|
| Bullet is weak (no metric, vague verb, duty-list) | **Writing** | `SYS_BULLET_REWRITER` |
| Bullet is already strong but doesn't match THIS JD's vocabulary or emphasis | **Reframing** | `SYS_BULLET_REFRAMER` |
| Bullet is strong AND already matches the JD | **Leave it alone** | none |
| Bullet is unsalvageable (no concrete content) | **Cut it** | none |

Don't reframe a weak bullet — strengthen it first, *then* reframe if needed. Don't rewrite a strong bullet — that loses the work the user already did.

---

# WRITING — From Weak to Strong

## The Bullet Point Problem

Most resumes have weak bullets that list job duties instead of achievements. This is the single biggest preventable failure mode in resume writing.

**Weak bullets** (don't ship):
- "Responsible for managing team"
- "Helped with customer service"
- "Worked on improving processes"
- "Assisted with projects"

These are passive, vague, and don't show impact or results.

**Strong bullets** (ship these):
- "Led cross-functional team of 12 to deliver $2M product, increasing revenue by 35%"
- "Resolved 50+ customer issues daily, improving satisfaction scores from 3.2 to 4.8/5"
- "Streamlined approval process, reducing cycle time by 40% (from 10 to 6 days)"
- "Managed portfolio of 8 concurrent projects with 100% on-time delivery rate"

These are active, specific, and quantify the impact.

## The Three Frameworks

`SYS_BULLET_REWRITER` selects from three frameworks based on the source content. The choice is automatic — the prompt picks the framework that best fits the available data.

### Framework 1 — X-Y-Z (Google Method)

**Structure:** "Accomplished [X] as measured by [Y] by doing [Z]"

- **X** = what was achieved
- **Y** = how it was measured
- **Z** = what actions were taken

**When to use:** When the source material clearly separates achievement, metric, and action. Default framework.

**Example transformation:**

```
WEAK:    "Managed social media accounts"

STRONG:  "Grew Instagram following by 250% (5K to 17.5K) by implementing
          daily content calendar and influencer partnerships"

X = Grew Instagram following by 250%
Y = 5K to 17.5K followers
Z = Daily content calendar + influencer partnerships
```

### Framework 2 — STAR-Condensed

**Structure:** "[Action] [object] through [method], achieving [result with metric]"

This is the STAR framework (Situation/Task/Action/Result) compressed into a single bullet. Use when the source has a clear action+result but the situation/task is implicit.

**Full STAR (for interview prep / cover letter):**
> "Inherited underperforming sales team (S) with 65% quota attainment. Tasked with improving performance within Q1 (T). Implemented new training program and revised commission structure (A). Achieved 92% quota attainment by Q2, generating $1.8M additional revenue (R)."

**STAR-condensed (for resume bullet):**
> "Revitalized underperforming sales team through training program and commission restructure, improving quota attainment from 65% to 92% and generating $1.8M additional revenue."

**When to use:** Leadership/transformation bullets, especially for Tier 3-4 candidates.

### Framework 3 — CAR

**Structure:** "[Challenge addressed] by [action], resulting in [measurable outcome]"

Compact alternative to STAR-condensed. Good for lead bullets when you need to compress further.

**Example:**
> "Reduced customer churn by implementing proactive outreach program, retaining 85% of at-risk accounts worth $500K ARR"

**When to use:** When space is tight, especially for Tier 1-2 candidates with shorter bullet stacks.

## Tier-Specific Bullet Rules

### Tier 1 (Foundational)

- Use scope when no metric exists. Don't invent metrics.
- Acceptable: "Designed onboarding curriculum used by 4 incoming hires"
- Acceptable: "Led 8-person volunteer team coordinating event for 200+ attendees"
- Not acceptable: "Increased efficiency by 25%" (when there's no measurement)
- Length: 1 line preferred, 2 lines max
- Average: 3-5 bullets per role

### Tier 2 (Established)

- Push for at least one metric per bullet
- If no metric exists, the bullet stays in but flags `metric_present: false` — Stage 04 compensates with metrics in adjacent bullets
- Length: 1-2 lines, 2 lines max
- Average: 3-5 bullets per role

### Tier 3 (Senior)

- Two metrics per bullet where possible (one scope, one outcome)
- Lead with the verb, surface the number early, end with the outcome
- Use leadership language ("Led", "Built", "Architected", "Spearheaded")
- Length: 2 lines standard
- Average: 4-6 bullets per role

### Tier 4 (Executive)

- Lead with the strongest metric
- Frame in transformation language ("transformed", "rebuilt", "spearheaded", "orchestrated", "championed")
- Cross-functional and organizational scope visible in every leadership bullet
- Length: 2 lines standard, occasionally 3 for flagship outcomes
- Average: 5-7 bullets per role

## Power Verb Library

By category. Use these to replace weak verbs.

### Leadership & Management
Led, Directed, Managed, Supervised, Coordinated, Spearheaded, Orchestrated, Oversaw, Championed, Mentored, Guided, Steered

### Achievement & Success
Achieved, Delivered, Exceeded, Surpassed, Attained, Secured, Won, Earned, Captured, Clinched, Hit, Cleared

### Growth & Improvement
Increased, Grew, Expanded, Scaled, Accelerated, Boosted, Enhanced, Improved, Strengthened, Elevated, Raised, Drove

### Reduction & Efficiency
Reduced, Cut, Decreased, Minimized, Eliminated, Streamlined, Optimized, Simplified, Consolidated, Compressed

### Building & Creating
Built, Created, Developed, Designed, Architected, Engineered, Established, Founded, Pioneered, Launched, Initiated, Implemented

### Analysis & Strategy
Analyzed, Evaluated, Assessed, Diagnosed, Researched, Investigated, Identified, Determined, Defined, Strategized

### Transformation (Tier 3-4)
Transformed, Revolutionized, Rebuilt, Modernized, Overhauled, Reengineered, Reshaped, Repositioned, Pivoted, Disrupted

## Banned Weak Verbs

Always replace these:
- "Responsible for..."
- "Helped with..."
- "Assisted in..."
- "Participated in..."
- "Worked on..."
- "Involved in..."
- "Was tasked with..."
- "Duties included..."

The lint pass in `lib-anti-patterns.md` catches these automatically.

## Length Rules

**Hard rules:**
- Maximum 2 lines per bullet (except Tier 4 flagship bullets, which may run 3 lines for transformation outcomes)
- ~30 words is the upper bound for a 2-line bullet at standard density
- If a bullet is longer, trim — tight beats comprehensive on resumes

**Soft rules:**
- Lead with the verb (don't bury it in a clause)
- Surface the number in the first 8 words if possible
- End with the strongest outcome

---

# REFRAMING — Adapting Strong Bullets

X-Y-Z, STAR, and CAR are for *creating* strong bullets from scratch. **Reframing** is for *adapting* existing strong bullets to a different JD without losing truth or fabricating new achievements.

**When to reframe:** Use these when a bullet scores 60-89% in the Confidence Rubric (`lib-confidence-rubric.md`) — the achievement is real and strong, but the framing doesn't match what THIS specific role values.

## The 4 Reframing Strategies

### Strategy 1 — Keyword Alignment

Same meaning, swap terminology to match JD vocabulary.

```
Before: "Led experimental design and data analysis programs"
After:  "Led data science programs combining experimental design
         and statistical analysis"
Reason: Target role uses "data science" terminology
```

```
Before: "Built end-to-end Shopify-to-HubSpot integration enabling
         online hardware sales"
After:  "Architected eCommerce platform integration enabling online
         hardware sales channel"
Reason: Target role uses "platform integration" and "channel"
```

**Use when:** JD uses specific terminology that's a synonym for what the candidate did. Don't invent new claims — just match the vocabulary.

### Strategy 2 — Emphasis Shift

Same facts, lead with the outcome the JD values most.

```
Before: "Designed statistical experiments saving millions in
         recall costs"
After:  "Prevented millions in potential recall costs through
         predictive risk detection using statistical modeling"
Reason: Target role values business outcomes over technical methods
```

```
Before: "Implemented tiered-support model, reducing resolution time
         by 20% and boosting CSAT by 35%"
After:  "Boosted CSAT by 35% and reduced resolution time by 20%
         through tiered-support model implementation"
Reason: Target role leads on customer satisfaction outcomes
```

**Use when:** The bullet has multiple outcomes and the JD values one over the other. Lead with what they care about.

### Strategy 3 — Abstraction Level

Add or remove technical specificity based on the JD's signal.

```
Before: "Built MATLAB-based automated system for evaluation"

For language-agnostic role:
After:  "Developed automated evaluation system"
Reason: Role doesn't care about specific languages — emphasize outcome

For technical role:
After:  "Built automated evaluation system (MATLAB,
         Python integration)"
Reason: Role values specific technical depth
```

```
Before: "Built Python automation handling document processing and
         customer communication"

For executive/non-technical role:
After:  "Built automation eliminating manual bottlenecks in document
         processing and customer communication"
Reason: Audience cares about the bottleneck, not the language

For senior dev role:
After:  "Built Python automation pipeline (LLM integration, webhook
         orchestration) handling document processing and customer
         communication workflows"
Reason: Audience values the technical stack
```

**Use when:** The JD signals different abstraction preferences (executive vs. technical, generalist vs. specialist).

### Strategy 4 — Scale Emphasis

Reframe the same achievement to highlight what the JD values most.

```
Before: "Managed project with 3 stakeholders"

For management role:
After:  "Led cross-functional initiative coordinating 3
         organizational units"
Reason: Emphasizes cross-org complexity over headcount

For IC role:
After:  "Coordinated 3 stakeholder workstreams to deliver project
         on schedule"
Reason: Emphasizes individual coordination capability
```

```
Before: "Migrated 1,500 customer accounts during acquisition with
         90% retention"

For revenue-focused role:
After:  "Preserved $1.1M ARR through 90% retention during 1,500-
         account acquisition migration"
Reason: Emphasizes revenue impact over operational scale

For ops-focused role:
After:  "Orchestrated 1,500-account migration during acquisition
         integration with 90% retention rate"
Reason: Emphasizes operational complexity over financial outcome
```

**Use when:** A single achievement has multiple scale dimensions (revenue vs. headcount vs. accounts vs. geographic) and the JD prefers one.

## The Truth Line

**Reframing is moving the spotlight on a real achievement. Lying is making up the achievement.**

If you can't point to the original true statement that the reframe is based on, you've crossed the line. If the reframe changes the meaning rather than the framing, you've crossed the line. If the reframe inflates the metric, scale, or scope, you've crossed the line.

**The 4-part Truth Check** (run on every reframed bullet):

1. ✅ Every fact remains true
2. ✅ The metrics are unchanged
3. ✅ A reference checking your story would confirm the reframed version
4. ✅ The reframing serves THIS specific JD, not a generic "better" version

If any check fails, return the original bullet unchanged. The `SYS_BULLET_REFRAMER` prompt enforces this — it returns `truth_check_passed: false` and `strategy_used: "none"` rather than producing a non-truthful reframe.

## When to NOT Reframe

- The bullet is already at 90%+ confidence — leave it alone, don't risk making it worse
- The JD is generic/vague — there's no signal to reframe toward
- The bullet uses terminology the JD also uses — already aligned
- Reframing would require fabrication (truth check fails)

In these cases, ship the bullet as-is.

## Bullet Strength Checklist

Run before any bullet ships. Every bullet should have:

- ✅ Strong action verb (no banned weak verbs)
- ✅ At least one number/metric (Tier 2+) OR scope (Tier 1)
- ✅ Specific outcome or result
- ✅ Context of scale (team size, budget, users, accounts, etc.)
- ✅ 1-2 lines maximum (Tier 4 flagships up to 3)
- ✅ Reads as an achievement, not a duty
- ✅ Relevant to target role
- ✅ Truthful (no inflation, no fabrication)

The lint pass (`lib-anti-patterns.md`) catches the first three automatically. The rest are model-judgment calls during writing/reframing.
