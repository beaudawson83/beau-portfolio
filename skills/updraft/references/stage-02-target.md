# Stage 02 — Target

**Purpose:** User selects which deliverables they want (MOD / JD-Build / CL). For JD-Build and CL, capture target role + JD and run match scoring against parsed resume content. Hand off to Stage 03 with deliverable selection, target metadata, and gap analysis.

**Inputs:** Stage 01 output (identity, path, resume_parsed, tier).

**Outputs (structured JSON, consumed by Stage 03):**
```json
{
  "stage": "02-target",
  "deliverables": ["mod" | "jd_build" | "cover_letter"],   // 1, 2, or 3
  "lightweight_mod": "boolean",                              // true if MOD not selected but auto-built for JD/CL
  "target": {                                                // null if only mod selected
    "role_title": "string",
    "company": "string",
    "industry": "string | null",
    "seniority": "string | null",
    "location": "string | null",
    "compensation_range": "string | null",
    "jd_text": "string"
  } | null,
  "match_analysis": {                                        // null if path=talk OR no JD captured
    "overall_match_pct": "number",
    "required_skills": [{"skill": "string", "match": "boolean", "evidence": "string | null"}],
    "preferred_skills": [{"skill": "string", "match": "boolean", "evidence": "string | null"}],
    "soft_skills": ["string"],
    "industry_terms": ["string"],
    "red_flags": [{"type": "string", "description": "string"}],
    "gaps": [{"requirement": "string", "severity": "critical | major | minor"}],
    "strengths_to_emphasize": ["string"]
  } | null,
  "confidence_band": "DIRECT | TRANSFERABLE | ADJACENT | WEAK | GAP | null"
}
```

---

## Stage 02 Sequence

### 2.1 — Deliverable Picker `[AI+DET]`

**AI turn (preceding the picker):**

Audit briefs the user on what's possible. Voice tier-calibrated. Sample for Tier 3:

> Three things I can build. Pick one, two, or all three.
>
> The MOD is your foundation — your full career on paper, properly metric'd, never sent to a recruiter but reused for everything. Most people skip building one and pay for it later.
>
> JD-Build and Cover Letter both need a target job. If you pick those without picking MOD, I'll build a lightweight MOD as part of the work — you get it either way.

For Tier 1, soften the lecture:

> Three things I can build. Pick what you need — you can come back for the others later.
>
> Most people in your spot start with the JD-Build for a specific job. The MOD is the long-game move, and the Cover Letter is for when you're ready to send.

**DET turn (multi-select picker):**

```
WHAT DO YOU WANT TO BUILD?
Pick one, two, or all three.

[ ] Master Overview Document (MOD)
    Your full career, properly structured. Reusable.
    DOCX + PDF + Markdown export.

[ ] JD-Specific Resume Build
    Tailored to one job posting. Match-scored.
    Requires a JD. Auto-builds an MOD if you skipped it.
    DOCX + PDF export.

[ ] Cover Letter
    Four paragraphs, targeted, no filler.
    Requires a JD. Auto-builds an MOD if you skipped it.
    DOCX + PDF export.

[ Continue → ]
```

Host program validates selection (≥1 item required), persists `deliverables` array.

**Branching logic:**
- If only `mod` selected: skip 2.2 and 2.3, advance directly to Stage 03 with `target = null`, `match_analysis = null`, `lightweight_mod = false`.
- If `jd_build` or `cover_letter` selected: continue to 2.2.
- Set `lightweight_mod = true` if `mod` is NOT in deliverables but `jd_build` or `cover_letter` is.

---

### 2.2 — Target Role Capture `[AI+DET]`

**AI turn (preceding the form):**

Audit pushes for specificity. Voice scales by tier. Sample for Tier 3:

> Now the part most people skip — where you're aiming. The resume changes shape depending on the answer, so be specific. "Senior Manager somewhere" doesn't help me; "Director of Trust at a marketplace doing $1B+ GMV" does.
>
> Paste the JD if you have one. If you don't, give me the closest thing — a real posting from a comparable company gets me 80% of the signal.

For Tier 1:

> Where are you aiming? If you have a specific job posting, paste it. If you're more "any junior data analyst role at a tech company" — that works too. Just be as specific as you can.

**DET turn (target form):**

```
TARGET ROLE

Role title       [_____________________________]   *required
Company          [_____________________________]   *required
Industry         [_____________________________]
Seniority        [▾ Junior / Mid / Senior / etc.]
Location         [_____________________________]
Comp range       [_____________________________]

JOB DESCRIPTION
[ Paste the full JD here.                       ]   *required
[                                                ]   ~5,000 char max
[                                                ]
[                                                ]

[ ← Back ]                          [ Analyze → ]
```

User submits. Host program:
1. Validates required fields (role_title, company, jd_text).
2. Persists `target` object.
3. Triggers AI match analysis (2.3).

---

### 2.3 — JD Analysis + Match Scoring `[AI]`

**AI call (silent to user, progress indicator only):**

Pass to model:
- The full `jd_text`
- The `resume_parsed` from Stage 01 (or note that it's null for Path B)
- The `tier` classification

Use the **`SYS_MATCH_ANALYZER`** prompt from `lib-system-prompts.md`. Load `lib-confidence-rubric.md` for scoring methodology — the prompt references the rubric by name and the model needs both files in context to score correctly. Model returns `match_analysis` JSON.

> **Why centralized:** The match analyzer prompt evolves over time as we tune scoring weights and add new JD-pattern detectors. Centralizing it in `lib-system-prompts.md` lets us version it independently from the stage flow.

Host program receives `match_analysis`, persists to session, triggers 2.4.

---

### 2.4 — Match Briefing `[AI+DET]`

**AI turn (Audit briefs the user on the analysis):**

Audit presents the headline numbers and the strategic read. Tone scales by both tier and confidence_band. The briefing is structured but conversational — Audit names the math, calls out gaps without sugarcoating, and previews the work ahead.

**Sample briefing for Tier 3, 78% match (TRANSFERABLE band):**

> 78% match. That's a strong fit — you should apply.
>
> Three things stack up well: your B2B SaaS run, the API product time, and the data-driven framing. Lead with those.
>
> One real gap: SQL. They name it five times in the JD. We're going to address that head-on in the cover letter rather than burying it. Skipping it makes the gap louder, not quieter.
>
> Two minor flags I'm logging but not chasing — "fast-paced environment" twice, salary range is wide. We'll come back to those if you want to talk negotiation later.
>
> Hit Continue and we'll dig into the experience.

**Sample briefing for Tier 1, 52% match (WEAK band):**

> 52% match. Stretch role. Honest read: this is a reach, but you haven't built the resume yet, so we don't know what's actually in there.
>
> Two ways this goes:
>   – If we surface enough relevant experience in the next stage, we might bump this to 65-70%. Worth applying.
>   – If we don't, we save you the time and target something else.
>
> Either way, the next stage tells us. Hit Continue.

**Sample briefing for Path B (no resume, can't compute match yet):**

> No resume yet, so I can't run a match score — that comes after we build the MOD. What I can tell you about this JD up front:
>
> They want [top 3 required]. They mention [top 2 soft skills]. One yellow flag — [red flag if any].
>
> We'll come back to the match number after Stage 03. Continue.

**DET turn (host program renders):**

Continue button. Optional: show match_analysis as an expandable panel below the briefing for users who want the full breakdown. Default state collapsed — Audit's prose briefing is the primary surface.

User clicks Continue. Stage 02 complete. Stage 03 starts.

---

## Tier-Aware Briefing Calibration

| Tier | Tone of briefing |
|---|---|
| 1 | Coaching. Names the math but explains *why* it matters. Frames stretch roles as learning opportunities, not failures. |
| 2 | Direct + helpful. Names the math, names the strategic move, doesn't lecture. |
| 3 | Direct + sharp. Assumes the user knows what a 78% match means. Skips explanation, jumps to strategy. |
| 4 | Sharpest. Names the math in one line, gets straight to the executive-level questions ("Is this the role you actually want, or the role that wants you?"). Surfaces strategic concerns the JD itself raises. |

---

## Edge Cases

**JD pasted is too short to analyze (< 200 words).** Audit calls it out:

> That JD is thin — under 200 words. I can extract some signal but the match score will be unreliable. Want to paste a fuller version, or push through with what we have?

Host renders [Push through] / [Paste more].

**JD is not a JD** (user pasted a company "About Us" page or a recruiter's email). Detect via low keyword density on standard JD elements (no "Requirements", "Responsibilities", "Qualifications" sections). Audit calls it out:

> That doesn't look like a JD — no Requirements or Responsibilities sections. Could be a company overview or a recruiter pitch. UpDraft needs the actual posting to do meaningful match analysis.

Host renders [Paste the actual JD] / [Continue without match scoring — uses what's there].

**Match score < 30%.** Audit names it bluntly but offers a path:

> 24% match. This isn't the right role for you on paper. Two options: pick a different target and start over, or push through and see what we can do — but I'm telling you up front, the cover letter is going to be carrying most of the weight.

Host renders [Pick different target] / [Push through anyway].

**Required experience is far below user's tier (overqualified).** Audit flags flight-risk concern:

> 96% match — but the JD calls for 3-5 years and you have 14. You'll show up as overqualified to most ATS scans, and to the hiring manager. Worth proceeding only if you have a specific reason to take this role (mission, location, lifestyle, etc.).

Host renders [Continue] / [Pick different target].

---

## Stage 02 Completion Criteria

Stage 02 is complete and Stage 03 may start when:
- `deliverables` array has ≥1 item
- If `jd_build` or `cover_letter` in deliverables: `target.role_title`, `target.company`, `target.jd_text` are non-empty AND `match_analysis` is computed
- If only `mod` in deliverables: `target` is null and `match_analysis` is null — both valid
- User has clicked Continue past the briefing (2.4)

Host advances. Stage 02 outputs are passed forward; conversation history from Stages 01 and 02 is summarized into structured state for Stage 03's context window.
