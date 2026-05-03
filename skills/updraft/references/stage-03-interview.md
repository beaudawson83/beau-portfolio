# Stage 03 — Interview

**Purpose:** Build the Master Overview Document through a tier-aware branching interview. Surface undocumented experience. Extract metrics, scope, tools, and STAR stories from each role. Hand off a complete MOD to Stage 04.

**Inputs:** Stage 02 output (deliverables, target, match_analysis, lightweight_mod flag) + Stage 01 output (identity, resume_parsed, tier).

**Outputs (structured JSON, consumed by Stage 04):**
```json
{
  "stage": "03-interview",
  "mod_mode": "full | lightweight",
  "mod": {
    "identity": { /* from Stage 01 */ },
    "summary_seed": "string",
    "experience": [
      {
        "company": "string",
        "title": "string",
        "start_date": "YYYY-MM",
        "end_date": "YYYY-MM | Present",
        "location": "string | null",
        "context": "string",
        "bullets": [
          {
            "text": "string",
            "metric_present": "boolean",
            "source": "extracted | rewritten | new",
            "tags": ["string"]
          }
        ],
        "star_stories": [
          {
            "title": "string",
            "situation": "string",
            "task": "string",
            "action": "string",
            "result": "string"
          }
        ]
      }
    ],
    "earlier_career": [/* roles older than ~10 yr, single-line summaries */],
    "education": [/* education objects */],
    "skills": ["string"],
    "surfaced_skills": [
      {
        "skill": "string",
        "evidence": "string",
        "confirmed": "boolean"
      }
    ],
    "values_alignment": [
      {
        "cause": "string",
        "narrative": "string"
      }
    ],
    "leadership_brand": "string | null",
    "interview_objections": ["string"]
  },
  "tier_reaffirmed": "1 | 2 | 3 | 4",
  "ready_for_generation": "boolean"
}
```

---

## Mode Selection

The first decision Stage 03 makes is `mod_mode`:

- **`full`**: User selected `mod` in deliverables. Run the complete tier-appropriate interview.
- **`lightweight`**: User selected only `jd_build` and/or `cover_letter` (no `mod`). Run universal floor only. Skip Tier 3+ deepening. Skip values/leadership brand. Skip "interview objections" question. Cap at ~10-15 min total.

**Lightweight mode is not a stripped MOD** — it's a *baseline complete* MOD. The user still gets a usable foundation document. They just don't get the leadership-brand/values/STAR-story depth that Tier 3-4 normally adds. They're free to come back later for a full MOD session.

---

## The Universal Floor (every tier, every mode)

Every Stage 03 session, regardless of tier or mode, captures:

1. **Per-role**: company, title, dates, location, 1-2 sentence context, 3-6 bullets with at least one metric per role where one exists.
2. **Education / equivalent**: degree, certs, bootcamps, military service, self-directed work — whatever the user has.
3. **Skills**: 5-10 keyword-aligned skills, drawn from the role-by-role conversation rather than asked separately.
4. **Summary seed**: ~3-5 sentences of raw material that Stage 04 will refine into a final summary.

Floor capture is structured by the role-by-role pattern below.

---

## The Role-by-Role Pattern (the core flow)

Stage 03 walks the user through their experience one role at a time, starting with the most recent. For each role, the AI runs a 4-phase mini-interview:

### Phase A — Pin the role `[AI+DET]`

**If Path A (upload):** Audit presents the parsed role for confirmation:

> Starting with your current role at [Company]. I have you as [Title], from [Start] to Present, [Location]. The bullets I pulled:
>
> — [bullet 1]
> — [bullet 2]
> — [bullet 3]
>
> Confirm the basics, then we'll go deeper.

DET: confirmation card, user can edit any field. Bullets are flagged for the next phase, not edited here.

**If Path B (talk):** Audit asks for the basics:

> Starting with your most recent role. Give me: company, title, when you started, when you ended (or "present"), and location.

DET: 5-field form. User submits.

### Phase B — Outcomes with numbers `[AI]`

This is where Audit earns the "rewrites resumes that aren't pulling their weight" promise. The AI walks the bullets one by one (Path A) or asks for outcomes (Path B), pushing for metrics, scope, and the *specific* pattern of weak-bullet → strong-bullet that the design transcript demonstrated.

**Audit's job in Phase B:**

1. **Identify weak bullets and call them out.** Tier-aware sharpness:
   - Tier 1: "Let's strengthen this — what was the actual outcome?"
   - Tier 2: "This reads like a job description, not an achievement. What changed because of you?"
   - Tier 3: "Push me on the metrics. What was [thing] when you started, and where is it now?"
   - Tier 4: "That's not a resume bullet — it's a job title pretending to be one."

2. **Extract specifics.** Metric, scope, scale, comparison. Sample probes:
   - "What was the [metric] when you started, and where is it at now?"
   - "Team size? Budget? Geographic scope?"
   - "What was the comparison? Industry average, prior baseline, target?"
   - "What did you measure it in — dollars, time, headcount, accounts?"

3. **Name the math out loud.** When the user provides numbers, Audit reframes them in a stronger form before locking them in:
   - User: "2.8% when I joined. 1.6% as of last quarter. On about $2.1B GMV."
   - Audit: "That's a 41% reduction on $2.1B. Roughly $25M in retained revenue depending on how you count loss. Locking that in as your headline outcome."

4. **Rewrite bullets in real time.** Audit verbally drafts the strengthened version and tells the user it's been added to the bullet stack. Sample:
   - "Adding this to your bullet stack: 'Cut chargeback rate 41% (2.8% → 1.6%) on $2.1B GMV marketplace by rebuilding dispute triage around risk-tier SLAs.' Sound right?"

5. **For Tier 1 specifically:** when no metric exists, do NOT force one. Use scope + outcome instead:
   - "You don't have a number on this and that's fine — we'll use scope. 'Designed onboarding curriculum used by 4 incoming hires' is a real bullet. We're not making up percentages."

The bullet rewriting itself uses the framework in `lib-bullet-engineer.md` (X-Y-Z, STAR-condensed, CAR). Load that lib file when entering Phase B.

### Phase C — Surface the undocumented `[AI]`

The pattern from the design transcript: Audit names something the user mentioned in passing that *isn't on the resume yet* and surfaces it as a positive finding.

**Audit's job in Phase C:**

1. **Listen for "buried" experience.** Common signals: cross-functional work mentioned in passing, vendor management, hiring/firing scope, crisis-response moments, sponsor-of-working-group roles, technical work the user dismisses as "not really technical."

2. **Reflect it back as a finding.** Sample:
   - "The Manila pod is interesting — building offshore from zero is a director-level skill that *doesn't appear anywhere on your current resume*. Did you scope the BPO partner, sign the contract, design the ramp plan?"
   - User confirms.
   - Audit: "Adding 'Built and ramped 9-person Manila ops pod via TaskUs partnership in 11 weeks' to your bullet stack."

3. **For Tier 2+: ask the killer elicitation question** (skip for Tier 1 unless the user is a strong communicator):
   - "What are you tired of explaining in interviews? Things hiring managers ask that frustrate you."
   - User answers.
   - Audit names how to preempt it on the resume:
     - User: "That I'm 'not technical.' I write SQL daily. I sit in model reviews. I just don't have a CS degree."
     - Audit: "Then we fix the resume to preempt that. I'll add a Tools row with SQL/Looker explicit, and reframe at least one bullet around model collaboration with DS."
   - Persist user's frustration as `interview_objections` array entry. Stage 04 uses it to inform the cover letter and resume tailoring.

4. **For Tier 3+: extract a STAR story for the strongest moment in this role.** Don't ask "do you have a STAR story" — that's a weak prompt. Instead:
   - "What's the single thing from this role you'd lead with in an interview? The one story the recruiter remembers two weeks later."
   - Walk the user through Situation → Task → Action → Result if they don't structure it themselves.
   - Persist as `star_stories` array entry on the role.

### Phase D — Skill surfacing card `[AI+DET]`

At the end of each role's interview, Audit assembles a list of skills inferred from the conversation that are NOT in the user's existing skills section, and presents them for confirm/reject.

**AI generates the skill list with evidence:**

```json
[
  {
    "skill": "Offshore team buildout (BPO scaling)",
    "evidence": "You spun up Manila pod from 0 → 9 people in 11 weeks",
    "confirmed": null  // user decides
  },
  {
    "skill": "Executive narrative writing",
    "evidence": "Three QBRs you owned end-to-end — currently invisible on your resume",
    "confirmed": null
  },
  {
    "skill": "Incident command & crisis comms",
    "evidence": "Q2-2020 surge response — held SLA at +180% volume",
    "confirmed": null
  }
]
```

**DET turn (host program renders skill list):**

```
SKILLS I'M HEARING — confirm what to include

[ ] Offshore team buildout (BPO scaling)
    You spun up Manila pod from 0 → 9 people in 11 weeks

[ ] Executive narrative writing
    Three QBRs you owned end-to-end — currently invisible on your resume

[ ] Incident command & crisis comms
    Q2-2020 surge response — held SLA at +180% volume

[ Confirm selections → ]
```

User checks/unchecks. Host persists `surfaced_skills` array entries with `confirmed: true` for checked items, `confirmed: false` for unchecked. Both confirmed and rejected are stored — rejected ones are useful signal for downstream tailoring (don't surface them again).

**AI turn after skill confirmation:**

> Locked. [N] new skills added to your stack. Moving on to [next role].

Then loop back to Phase A for the next role.

---

## Tier-Specific Branches

After all roles are walked through, Stage 03 runs tier-specific deepening. **Lightweight mode skips this section entirely.**

### Tier 1 — Foundational Deepening

Tier 1 deepening is short — most of the work is in Phase B (just getting the floor solid). Add only:

**1. Projects + coursework + extracurriculars (if relevant):**

> Outside paid work — anything you built, organized, or led that we should put on the resume? School project, side gig, hackathon, club leadership, volunteer work? If yes, walk me through one or two.

Capture as additional `experience` entries with `title: "Project"` or similar non-employment markers.

**2. Career direction (single question):**

> Where do you want this to go? Not asking for a 5-year plan — just whether you're trying to land a [target_role.role_title] role specifically, or whether you're casting wider. Affects how I write the summary.

Capture in `summary_seed`.

### Tier 2 — Established Deepening

After roles are walked, run:

**1. Cross-role pattern check:**

> Looking across all your roles, what's the through-line? The thing you keep doing well, regardless of company. If you can't name it in one sentence, that's the thing we need to figure out.

Capture as part of `summary_seed` and as a candidate phrase for the resume headline.

**2. Tools and stack:**

> Tools you actually use, weekly or daily. Not the LinkedIn skill list — the real stack. SQL flavor, BI tool, project management, comms, any specialized industry tools.

Capture as `skills` array additions, tagged for the technology section of the resume.

**3. The interview-objections question (if not yet captured):**

> What are you tired of explaining in interviews? Things hiring managers ask that frustrate you. We'll preempt them on the resume.

Capture as `interview_objections`.

### Tier 3 — Senior Deepening

Everything in Tier 2 plus:

**1. Leadership brand statement:**

> One sentence. Not "I lead with empathy" — that's a poster. Something with edge. The kind of leader you actually are, in the words your direct reports would use.
>
> If you can't write it cold, give me a story instead — a moment where your leadership style was visible — and I'll draft it from that.

Capture as `leadership_brand`. Stage 04 may use this in the executive summary.

**2. Cross-functional / stakeholder scope:**

> Span of influence. Who do you regularly partner with, who do you regularly push back on, and what's the highest-level person you've successfully changed the mind of?

Capture as part of `summary_seed` and as candidate bullets for tailoring.

**3. Mission alignment (optional, ask if unclear from interview):**

> Anything that matters to you outside the paycheck — causes, communities, work you'd take a comp hit for? Affects how I tailor cover letters and which roles you should be applying for. Skip if not relevant.

Capture as `values_alignment` array. Each cause has a 1-2 sentence narrative the user provides.

### Tier 4 — Executive Deepening

Everything in Tier 3 plus:

**1. Transformation arc:**

> Across your career, what's the through-line transformation? Not the job titles — the *thing you keep doing*. Cleanup operator, scaling operator, post-acquisition integrator, turnaround specialist, etc. The signature move.

Capture as part of `summary_seed`. This is the brand pillar.

**2. Board / advisory experience (optional):**

> Anything board, advisory, fractional, or fellowship — paid or unpaid? Goes in a separate section on executive resumes; recruiters look for it.

Capture as separate `board_advisory` array (Stage 04 renders as separate resume section).

**3. The "what's the harder thing" question:**

> What's the harder thing you've done that the resume doesn't quite capture? The decision, the conversation, the bet, the call you made when you were the one in the room. Doesn't have to be heroic — has to be true.

Capture as a flagship `star_stories` entry with no role association — it's a career-level story.

---

## Lightweight Mode (Skip Tier-Specific Branches)

When `mod_mode = lightweight`:

- Run the role-by-role pattern (Phases A-D) but limit to the 2 most recent roles + earlier-career as a single summarized paragraph.
- Skip all tier-specific deepening sections above.
- Skip the interview-objections question.
- Cap STAR story extraction at 1 per role (Phase C step 4 → only run on most recent role).
- Skip values_alignment, leadership_brand, transformation arc, board/advisory.

The lightweight MOD is sufficient for Stage 04 to produce a tailored resume + cover letter. The user can rerun UpDraft in full MOD mode later to deepen.

---

## Earlier Career Handling

For roles older than ~10 years (or, for Tier 1-2, roles that aren't in the past 5 years), don't run the full Phase A-D pattern. Instead:

**AI turn (consolidation):**

> The roles before [year] — let me consolidate those into a single line. Quick list: company, title, dates. No bullets, just the existence.

DET: lightweight form (3-line table, add rows). Capture as `earlier_career` array. Stage 04 renders as a single paragraph or 1-line-per-role list, depending on template.

---

## Closing Phase — MOD Summary Generation `[AI]`

Once role-by-role + tier deepening is complete, Audit drafts the executive summary from the accumulated `summary_seed` content using the **`SYS_SUMMARY_GENERATOR`** prompt from `lib-system-prompts.md`.

> **Why centralized:** Summary tone calibration is one of the highest-stakes prompts in UpDraft — small wording changes have big downstream effects. Keep it in one place.

The prompt takes:
- `summary_seed`: raw material captured during the interview
- `tier`: candidate's career tier (governs tone calibration)
- `target.role_title` (if available): the role they're targeting (mirrored in headline for ATS Cmd-F)
- `experience`: captured roles
- `leadership_brand` (Tier 3+): user's leadership statement
- `transformation_arc` (Tier 4): the through-line

Audit presents the draft to the user:

> Drafted your summary. Read it — you can keep it or rewrite. This is the only piece of the MOD you write in your own voice if you want to.
>
> [draft summary]

DET: textarea with the draft prefilled. User edits or accepts. Final summary persists to `mod.summary`.

---

## Stage 03 Completion Criteria

Stage 03 is complete and Stage 04 may start when:
- `mod.experience` has ≥1 role with bullets (universal floor met)
- `mod.education` has ≥1 entry (or explicit "no formal education" marker)
- `mod.skills` has ≥5 entries
- `mod.summary` is non-empty (user-confirmed)
- For full mode + Tier 3+: `mod.leadership_brand` is non-empty (or explicitly skipped by user)
- `ready_for_generation` is `true`

If any criterion fails, host program does not advance. Audit prompts for the missing piece.

---

## Voice Calibration Reference (Stage 03)

Quick reference for the bullet-callout patterns by tier. Full voice spec in `lib-audit-voice.md`.

| Pattern | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|
| Weak bullet detected | "Let's strengthen this — what was the outcome?" | "This reads like a duty, not an achievement. What changed?" | "Push me on the metrics." | "That's a job title pretending to be a bullet." |
| Metric extraction | "Any number you have — even rough — helps here." | "Give me the number. Even a range." | "What was X when you started, where is it now?" | "Numbers. Both ends, comparison, time horizon." |
| Reframing math | "That's actually [reframe] — let's lead with that." | "That's [reframe]. Stronger framing, same fact." | "[Reframe]. Locking that in as your headline outcome." | "[Reframe]. That's the number that does the work." |
| Surface undocumented | "[Thing] you mentioned isn't on the resume — should be." | "[Thing] is a [type] skill — adding it." | "[Thing] is [tier]-level work that doesn't appear anywhere on your resume." | "You buried [thing]. Surfacing it." |

---

## Edge Cases

**User has only one role.** Run the full Phase A-D for that role. Tier deepening still applies. Earlier career section is empty. Education / equivalent fills the gap.

**User refuses a question.** Audit accepts it without lecturing:

> Skipped. Moving on.

Persist as null. Don't loop back to it.

**User's role has no measurable outcome.** Tier 1: use scope as the metric (team size, scope of responsibility). Tier 2+: push for any number — "approximately how many", "rough percentage", "ballpark dollars". If still nothing: persist a metric-free bullet but flag `metric_present: false` so Stage 04 knows to compensate elsewhere.

**User contradicts the parsed resume.** Trust the user. Update the parsed content with the user's version. Persist `source: "rewritten"` on the bullet.

**User's tier feels wrong mid-interview.** If a Tier 2 user demonstrates Tier 3-level thinking and scope, Audit can offer a tier bump:

> Pausing — the scope you're describing is more Senior-track than Established. Want me to switch tiers? Different depth, different framing.

Set `tier_reaffirmed` to whichever tier the user confirms. The bumped tier governs Stage 04.

**Lightweight mode user keeps surfacing executive-level material.** Audit notes it but doesn't deepen:

> Logging that — it's executive-level material we'd dig into in a full MOD session. For now, capturing the headline only. You can come back for the full version later.

Persist enough to support Stage 04, but don't run the Tier 3-4 deepening branches.
