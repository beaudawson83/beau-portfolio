# lib-cover-letter.md — Cover Letter Generation

UpDraft generates 4-paragraph cover letters using `SYS_COVER_LETTER_DRAFTER`. This file specifies the structure, the integration of `interview_objections` (Beau's confirmed wiring), tone calibration, and edge cases.

## Why Cover Letters Still Matter

Most candidates skip cover letters or use templates. That makes a real cover letter a distinguishing signal — the recruiter notices when one shows up that's actually targeted to the role. The cover letter is also where UpDraft does work the resume can't:

- Address gaps honestly (resumes can't acknowledge weaknesses)
- Preempt the recurring interview question (`interview_objections` from Stage 03)
- Add color the bullets can't convey (the strategic question, the conversation pattern, the judgment call)
- Show the candidate's voice (resumes are third-person; cover letters are first-person)

A great cover letter doesn't repeat the resume — it adds dimensions the resume can't carry.

---

## The 4-Paragraph Structure

### Paragraph 1 — Hook (2-3 sentences)

Specific, not generic. The first sentence must demonstrate the candidate read the JD and understood the role's actual problem.

**Banned openers** (lint-pass blocks these):
- "I am writing to apply for..."
- "I am excited to apply for..."
- "Please find attached my resume for..."
- "I came across your job posting..."
- "I would like to express my interest..."

**4 hook patterns** (`SYS_COVER_LETTER_DRAFTER` picks one based on match data):

#### Hook A — Specific Company/Role Knowledge

Names the actual problem the role exists to solve, and connects to relevant work.

> "Director of Operations at a $4B GMV B2B marketplace where the math is 'scale trust without scaling headcount linearly' — that's the exact problem I just spent three years solving at Lattice Markets. I cut chargeback rate 41% while taking the team from 18 to 14 people, on a marketplace doing roughly half the GMV you are."

Best for: Strong matches (75%+), specific JDs with clear problem framing.

#### Hook B — Mutual Connection

References a name (only if the candidate provides one in Stage 03).

> "[Name] on your engineering team mentioned you're looking for a PM to lead the payments initiative. Having worked with [Name] at [Previous Company] and led payment integrations at my current role, I'd want to talk about whether the fit lines up."

Best for: Warm intros, referrals.

#### Hook C — Problem-Solver

Names a specific challenge from the JD and connects to direct experience.

> "Your JD mentions the challenge of aligning technical and business stakeholders — I've navigated this exact challenge, successfully launching 8 products by building shared roadmap visibility across engineering, sales, and executive teams."

Best for: Mid-match (60-74%), JDs that are explicit about challenges.

#### Hook D — Outcome-Led

Leads with the candidate's strongest metric and connects it to the role.

> "I cut chargeback rate 41% on a $2.1B GMV marketplace while shrinking team 22%. Your role is the next version of that problem at twice the scale."

Best for: Tier 3-4 candidates with a flagship metric, when the JD emphasizes outcomes.

### Paragraph 2 — Strongest Match (3-4 sentences)

Connect ONE specific strength from `match_analysis.strengths_to_emphasize` to a specific moment in the candidate's experience. Quantify. Don't list qualifications — narrate one.

**Bad (qualifications list):**
> "I have 10 years of experience in operations, fluency in SQL, and have led teams across the US and Manila."

**Good (narrated moment):**
> "When Lattice asked me to spin up offshore support in 11 weeks, I RFP'd 4 BPO partners, picked TaskUs, and ran the ramp myself — same playbook I'd run for you if the timeline is comparable. The 9-person Manila pod hit baseline SLA in week 4 and exceeded it in week 8."

The narrated moment is the high-leverage paragraph. It demonstrates the candidate has actually done the thing, not just listed it.

### Paragraph 3 — Address the Gap or Add Color (3-4 sentences)

This paragraph branches based on what `match_analysis` and `interview_objections` reveal:

#### Branch 1 — Major Gap Exists

Address head-on. Acknowledge, contextualize, redirect.

> "While my data analysis has primarily been in Excel and Tableau, I'm expanding my SQL skills through DataCamp and can currently write basic queries. More importantly, I've built strong partnerships with data teams and consistently use data to inform product decisions — I'd rather collaborate than self-serve, and I think that's a feature for a director-level role."

Why this works: Honest acknowledgment + adjacent strength + reframe as positive.

#### Branch 2 — Interview Objection Captured

`interview_objections` is non-empty. Preempt the recurring question the candidate gets in interviews.

From Stage 03:
> User: "I'm tired of being told I'm 'not technical.' I write SQL daily."

Cover letter paragraph 3:
> "I know what's coming on the technical question — I'm not a CS major, but I write SQL daily, sit in model reviews, and my last three product decisions were directly informed by data I pulled myself. The CS-degree question stops being relevant after the first 30 minutes. Happy to skip past it."

This is the highest-value cover letter paragraph for Tier 2-4 candidates with established interview patterns. **Beau confirmed this wiring** — `interview_objections` from Stage 03 directly drives this paragraph.

#### Branch 3 — No Gap, No Objection

Use the paragraph to add color the resume can't convey. The strategic question, the conversation pattern, the judgment call.

> "What's on the resume is the easy part. The harder thing — and probably more relevant — is that I've built the muscle of saying 'no, the model isn't ready' to Payments leadership, three quarters in a row, until it actually was. That's the conversation I'd expect to be having with you in year one, and I'd rather have it early than late."

This branch is what separates Tier 3-4 cover letters from Tier 1-2. The "harder thing" framing is canonical at the executive level.

### Paragraph 4 — Close (2-3 sentences)

Specific. Not generic gratitude.

**Banned closes** (lint-pass blocks):
- "Thank you for your consideration."
- "I look forward to hearing from you."
- "I would welcome the opportunity to discuss..."
- "Please feel free to contact me..."

**3 close patterns:**

#### Close A — Specific Topics

Names 2-3 specific things the candidate would want to dig into in the first conversation.

> "A few things I'd want to dig into: how you're currently splitting fraud signal between Risk DS and Ops, whether your dispute SLAs are tiered by GMV bracket, and what your appetite is for a 6-month rebuild vs. an incremental path. Happy to walk through specifics."

#### Close B — Direct CTA

Short, direct, available.

> "Available to talk this week. I'd want to understand your timeline before we go further."

#### Close C — Mission Alignment

For mission-driven roles where the candidate's `values_alignment` matches.

> "The work you're doing on housing stability is the kind of structural fix I've been drawn to my whole career. Happy to talk through the role specifics."

### Sign-Off

Always short:
- "Looking forward,"
- "Best,"
- "Regards,"

Then the candidate's name on the next line. No "Sincerely," (too formal), no "Cheers" (too casual), no "Warm regards" (filler).

---

## Word Count Target

**250-400 words** total. The lint pass flags anything outside this range:

- < 250 words: too thin, doesn't earn the read
- > 400 words: too long, recruiter scans and skips
- 300-350 words is the sweet spot

`SYS_COVER_LETTER_DRAFTER` returns word count in its output. If outside the range, the model is asked to revise (one revision loop max).

---

## Tone Calibration by Tier

The cover letter voice is first-person — the candidate's voice, not Audit's. But Audit's philosophy still informs the tone (direct, no filler, no flattery). Tier dial applies:

### Tier 1 — Cover Letter Tone

Warmer, more "here's what I bring even though I'm early." Lead with learning velocity and concrete project work. Acknowledge the early-career stage without apologizing.

> "I'm two years into my career. What I have is the data analysis muscle — built from doing it daily on the QA team — and the willingness to learn the rest. Your JD mentions Salesforce; I haven't used it yet, but I'm certified in HubSpot and have ramped on three new tools in the past 12 months."

### Tier 2 — Cover Letter Tone

Standard direct cover letter. The voice the design transcript demonstrates — Maya Okonkwo's voice. Confident, specific, no hedging.

> "I cut chargeback rate 41% while shrinking team 22%. The math is the easy part to write down. The harder thing was the four times I told Payments leadership the model wasn't ready — and the one time I told them it was, and we shipped."

### Tier 3 — Cover Letter Tone

Sharper. The strategic question. Less "I would love to" — more "Here's what I'd push on."

> "Three years from now you're going to need someone who can run trust ops *and* talk to Payments leadership *and* hold their ground on model readiness. The job description is asking for the operator. I'd ask you in the first conversation what your appetite is for the harder version of the role — the one where Trust pushes back on Payments instead of consuming whatever they ship."

### Tier 4 — Cover Letter Tone

Hardest. The transformation question. The "what would you actually rebuild" question. Names what the candidate would do in year one without asking permission.

> "Year one as VP of Customer Experience: I'd run a 30-day diagnostic on your support, success, and renewals data and come back with a transformation thesis. Not 'incremental improvements' — a thesis. If you're looking for someone to run the existing playbook, I'm not the hire. If you're looking for someone to rebuild the playbook with you, this is the right conversation."

---

## Integration With MOD Content

`SYS_COVER_LETTER_DRAFTER` reads from these MOD fields:

| MOD Field | Used In Cover Letter |
|---|---|
| `summary_seed` | Hook (Pattern A or D) |
| `experience[].star_stories` | Paragraph 2 (narrated moment) |
| `interview_objections` | Paragraph 3 (preempt) |
| `values_alignment` | Paragraph 4 (Close C) for mission-driven roles |
| `leadership_brand` | Paragraph 3 or 4 for Tier 3-4 |

If a field is empty (e.g., `interview_objections = []`), the prompt skips that branch — never invent objections that weren't captured in Stage 03.

## Truthfulness Constraints

Every claim in the cover letter must trace back to MOD content. The `SYS_FINAL_QA` pass verifies this — if a cover letter paragraph references a metric, scope, or experience not in the MOD, QA flags it as `truthfulness` failure (blocking).

**Specifically banned:**
- Inventing companies, projects, or experiences
- Inflating metrics from the MOD
- Claiming skills not present in MOD's `skills` or `surfaced_skills`
- Attributing work to the candidate that the MOD attributes to a team
- Generic praise of the target company that has no specific basis ("a leader in the industry", "innovative culture")

If the cover letter draft fails truthfulness, regenerate with stricter source-binding instructions in the system prompt.

---

## Edge Cases

### Multiple Strong Matches

If `match_analysis.strengths_to_emphasize` has more than 3 entries, paragraph 2 picks the strongest single match (highest confidence score) rather than listing multiple. One narrated moment > three half-told stories.

### No Match Analysis (Path B Without JD Re-Analysis)

If Stage 02 didn't compute `match_analysis` (Path B, JD captured but no parsed resume), Stage 04 should re-run match analysis after Stage 03 completes the MOD. The cover letter should not be drafted until match analysis is available.

### Mission Alignment Override

If `mod.values_alignment` includes a cause that matches the target company's mission (e.g., LGBTQ+ rights, mental health access, animal welfare), Audit may apply Close C even when the role is otherwise standard corporate. Stage 04 surfaces this option to the user:

> Spotted alignment between your values and this company's mission. Want me to weave that into the close, or keep it role-focused?

User picks. Default is role-focused unless mission alignment is explicitly confirmed.

### Recruiter vs. Hiring Manager Audience

If the JD or company info indicates the cover letter goes to a recruiter (initial screen) vs. a hiring manager (later round):

- **Recruiter**: emphasize match clarity, screen-friendly, hits keywords
- **Hiring manager**: emphasize the strategic question, the harder thing, the judgment call

Default audience is recruiter (most cover letters get screened). Stage 04 offers an override.

### Multi-Hop Application

If the user is applying to multiple roles at the same company (uncommon but happens), generate one cover letter per role. Don't try to address multiple roles in one letter — it dilutes the targeting.

---

## Output Format

`SYS_COVER_LETTER_DRAFTER` returns:

```json
{
  "greeting": "Hi [Recipient],",
  "paragraphs": [
    "[Paragraph 1 — Hook]",
    "[Paragraph 2 — Strongest Match]",
    "[Paragraph 3 — Gap or Color]",
    "[Paragraph 4 — Close]"
  ],
  "signoff": "Looking forward,\n[Candidate Name]",
  "word_count": 312,
  "hook_type": "A | B | C | D",
  "p3_branch": "gap | objection | color",
  "close_type": "A | B | C"
}
```

The structured metadata (`hook_type`, `p3_branch`, `close_type`) is stored in backend session JSON for analytics and future tuning. Doesn't render in the export.

## Recipient Greeting

If the user provides a recipient name in Stage 02 (e.g., the hiring manager's name from the JD or LinkedIn):
- "Hi [First Name]," — modern, friendly
- "Dear [First] [Last]," — traditional industries (Classic template)

If no recipient name:
- "Hi [Company] Hiring Team," — modern default
- "Dear Hiring Manager," — traditional default

The host program offers an optional field in Stage 02 for recipient name. If skipped, default per template selected at Stage 04.
