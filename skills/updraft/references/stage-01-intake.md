# Stage 01 — Intake

**Purpose:** Capture user identity, select intake path (Upload vs. Talk), parse resume if uploaded, classify tier, hand off confirmed identity + tier + raw resume content to Stage 02.

**Inputs:** None (entry point).

**Outputs (structured JSON, consumed by Stage 02):**
```json
{
  "stage": "01-intake",
  "identity": {
    "name": "string",
    "email": "string",
    "phone": "string | null",
    "location": "string | null",
    "linkedin": "string | null"
  },
  "path": "upload | talk",
  "resume_raw": "string | null",         // null if path=talk
  "resume_parsed": {                      // null if path=talk
    "summary": "string | null",
    "experience": [/* role objects */],
    "education": [/* education objects */],
    "skills": ["string"]
  } | null,
  "tier": "1 | 2 | 3 | 4",
  "tier_confidence": "auto | confirmed | overridden",
  "tier_classifier_inputs": {            // diagnostic — preserved for future re-classification
    "years_band": "0-2 | 3-7 | 8-15 | 15+",
    "role_level": "IC | Team lead | Manager | Senior Manager | VP/C-suite",
    "reports_peak": "None | 1-5 | 6-15 | 15+"
  },
  "years_experience": "number"            // computed years (continuous, not banded)
}
```

---

## Stage 01 Sequence

The stage runs in 4 sub-steps. Each is tagged `[DET]`, `[AI]`, or `[AI+DET]`.

### 1.1 — Welcome + Path Picker `[AI+DET]`

**AI turn (opening message):**

Load `lib-audit-voice.md`. Audit introduces UpDraft in two short paragraphs. Sample copy (the model can vary phrasing but must keep the structure and tone):

> Hi — I'm Audit. I help people rewrite resumes that aren't pulling their weight.
>
> Two ways to start. Either works; the conversation will be the same after that.

**DET turn (host program renders):**

Two-button picker. Both buttons are equally weighted visually — neither is "primary."

```
┌─ PATH A ────────────────────────────────────┐
│ Upload your resume                          │
│ PDF or DOCX. I'll parse it server-side and  │
│ we'll iterate from there.                   │
│ ~12 min total                            →  │
└─────────────────────────────────────────────┘

┌─ PATH B ────────────────────────────────────┐
│ Talk it through                             │
│ No resume? Starting fresh? We'll build it   │
│ from scratch in conversation.               │
│ ~18 min total                            →  │
└─────────────────────────────────────────────┘
```

User selects one. Host program persists `path` to session state and routes to 1.2A or 1.2B.

---

### 1.2A — Upload Path `[DET → AI]`

**DET turn (file drop UI):**

Standard file drop zone. Constraints:
- Accept `.pdf`, `.docx`, `.doc` only
- Max 4 MB
- Reject scanned/image-only PDFs with a clear error: "This PDF is image-based. UpDraft can only read text-based resumes. Try Path B (Talk it through) or upload a DOCX."

On successful upload, host program:
1. Extracts raw text via standard parser (pdfplumber / python-docx)
2. Stores `resume_raw` (full text) to session
3. Triggers AI parsing call (1.2A.ai)

**AI turn (1.2A.ai — parsing call):**

Pass raw text to the model with the **`SYS_RESUME_PARSER`** prompt from `lib-system-prompts.md`. Model returns structured JSON for `resume_parsed`. This call is silent to the user — they see a progress indicator only.

> **Why centralized:** `SYS_RESUME_PARSER` is versioned in `lib-system-prompts.md`. If the parsing schema changes (e.g., adding new resume sections), update the prompt in one place rather than hunting through stage files.

Host program receives parsed JSON, stores to session as `resume_parsed`, displays the identity card (1.3).

---

### 1.2B — Talk Path `[DET]`

**DET turn (identity intake form):**

Standard form. Required fields: name, email, phone. Optional: location, LinkedIn URL.

Host program persists identity directly to session, sets `resume_raw = null` and `resume_parsed = null`, advances to 1.4 (skipping 1.3 — no identity to confirm).

---

### 1.3 — Identity Confirmation Card `[AI+DET]`

**Only runs for Path A (Upload).** Path B skips this step.

**AI turn (preceding the card):**

Audit confirms parsing succeeded and asks for confirmation. Sample:

> Got it. I pulled the basics — confirm these and we'll move on.

If parsing extracted all 3 required fields (name, email, phone), preface "Matched 3/3 fields" appears on the card.

If 1-2 fields are missing, Audit calls it out:

> Got most of it. Phone number didn't come through cleanly — fill it in below.

**DET turn (host program renders confirmation card):**

```
┌─ Identity · pulled from upload ─────────────┐
│ Name      [Maya Okonkwo            ] [✏]   │
│ Email     [maya.okonkwo@hey.com    ] [✏]   │
│ Phone     [+1 (415) 555-0142       ] [✏]   │
│ Location  [Brooklyn, NY            ] [✏]   │
│ LinkedIn  [linkedin.com/in/mokonkwo] [✏]   │
│                                              │
│ Matched 3/3 required fields                 │
│              [ Edit ]  [ Confirm → ]        │
└──────────────────────────────────────────────┘
```

User edits any field inline, clicks Confirm. Host program persists confirmed identity, advances to 1.4.

---

### 1.4 — Tier Classification `[DET → AI]`

**DET turn (computation, no UI):**

Host program computes tier from a multi-signal classifier. The goal is accurate signal — single-question classifiers misfire on ICs with long tenure (15 years but never managed) and on fast-rising managers (5 years but managing managers).

**For Path A (Upload):** host program auto-computes signals from parsed resume:
- **Years of experience**: sum durations across roles, subtract overlaps for concurrent roles, treat "Present" as today.
- **Highest role level**: parse from job titles. Look for "VP", "Vice President", "Chief", "C-suite" markers (exec); "Director", "Head of" (senior); "Senior Manager", "Principal", "Lead" (manager-tier); "Manager" alone (mid); "Senior", "II", "III" (IC senior); "Junior", "Associate", "I" (IC junior).
- **Direct reports at peak**: scan bullets for management language — "led X-person team", "managed X reports", "team of N", "X direct reports". Highest detected count wins. Default to 0 if no signal.

If any signal is ambiguous from the parse, host program asks the user the corresponding question deterministically before classifying.

**For Path B (Talk):** host program asks all 3 questions deterministically before classifying. Three short questions, no AI inference, takes ~30 seconds:

```
QUICK CLASSIFIER — helps me calibrate the conversation

1. Years of relevant work experience
   ( ) 0-2 years      ( ) 3-7 years
   ( ) 8-15 years     ( ) 15+ years

2. Highest role level you've held
   ( ) Individual contributor (no direct reports)
   ( ) Team lead / Senior IC
   ( ) Manager (managed individual contributors)
   ( ) Senior Manager / Director (managed managers)
   ( ) VP / SVP / C-suite

3. Direct reports at peak
   ( ) None        ( ) 1-5
   ( ) 6-15        ( ) 15+

[ Continue → ]
```

**Tier mapping logic** (deterministic — host program runs this):

```
function classifyTier(years, roleLevel, reportsPeak):
    # Floor by years
    yearsFloor = {
        '0-2':   1,
        '3-7':   2,
        '8-15':  2,    # was 3; calibration showed this over-tiered career
                       # changers (e.g. 8 years hospitality + 3 years tech,
                       # recent Team Lead). Now the role + reports signals
                       # decide T3 for the 8-15 band rather than tenure alone.
        '15+':   4
    }[years]

    # Ceiling by role level
    roleCeiling = {
        'IC':              2,   # never tier 3+ no matter how senior
        'Team lead':       3,   # cap at senior, not exec
        'Manager':         3,
        'Senior Manager':  4,
        'VP/C-suite':      4
    }[roleLevel]

    # Direct-reports tier minimum (catches fast risers)
    reportsFloor = {
        'None': 0,    # no floor — IC with 0 reports stays where years put them
        '1-5':  2,    # at least Tier 2 if you've managed
        '6-15': 3,    # at least Tier 3 if you've managed managers
        '15+':  3     # at least Tier 3
    }[reportsPeak]

    tier = max(min(yearsFloor, roleCeiling), reportsFloor)
    return tier
```

This handles the edge cases cleanly:
- 15-year IC with no reports → years says 4, ceiling caps at 2 → **Tier 2**
- 4-year manager with 12 reports → years says 2, reports floor pushes to 3 → **Tier 3**
- 6-year director (skipped levels) with 8 reports → years says 2, reports says 3, ceiling allows up to 3 → **Tier 3**
- 20-year C-suite → years says 4, ceiling allows 4, reports irrelevant → **Tier 4**
- 11-year career changer (8 years hospitality + 3 years tech, recent Team Lead, no explicit reports number in bullets) → years says 2 (post-fix), ceiling allows 3, reports 0 → **Tier 2** (user can override to T3 if leadership scope is real)

Host sets `tier_confidence = "auto"` and persists `years_experience` along with the classifier inputs to session state for diagnostic purposes.

**AI turn (tier announcement + override offer):**

Audit announces the classification in one short turn and offers an override. Voice scales to the *announced* tier (this is the first time tier-aware voice kicks in). Sample for Tier 3:

> You're at 11 years with 8 direct reports at peak. Running this as a Senior-track session — that means more depth on leadership and cross-functional, less foundational scaffolding.
>
> If you want a different shape — say, you're targeting a Director jump and want me to push harder — switch the tier below. Otherwise, hit Continue.

**DET turn (override UI):**

Dropdown showing current tier with all 4 options. User can change. If user overrides, host sets `tier_confidence = "overridden"` and re-loads `lib-audit-voice.md` with the new tier setting before Stage 02.

Continue button advances to Stage 02.

---

## Tier-Aware Voice — Stage 01 Examples

Loaded from `lib-audit-voice.md`. Quick reference for Stage 01 specifically:

| Tier | Welcome line variation | Tier announcement variation |
|---|---|---|
| 1 | "Hi — I'm Audit. I help people make resumes that actually pull their weight. We'll figure out what you have, then build from there." | "You're early career — that's fine, we work with what's there. Running this as a Foundational session. Hit Continue when you're ready." |
| 2 | "Hi — I'm Audit. I help people rewrite resumes that aren't pulling their weight. We'll find what you've buried and surface it." | "You're at 5 years. Running this as an Established-track session — we'll dig into 2-3 of your strongest roles." |
| 3 | "Hi — I'm Audit. I help people rewrite resumes that aren't pulling their weight." | "You're at 11 years. I'm running this as a Senior-track session — that means more depth on leadership and cross-functional, less foundational scaffolding." |
| 4 | "Hi — I'm Audit. I help people rewrite resumes that aren't pulling their weight. At your level, the resume isn't the gating factor — it's the proof." | "20+ years. Executive-track session. We'll spend most of the time on transformation arc and brand, less on tactical." |

---

## Edge Cases

**Upload parses to zero experience entries.** Treat as Path B from this point forward — discard the upload, ask the identity questions deterministically, classify tier from the experience question. Audit:

> The parser couldn't find structured experience in that file. Easier if we talk through it — same result, takes a few extra minutes.

**Parsed resume has experience but Audit can't determine years.** Common with consulting/freelance/contract resumes. Default to Tier 2, surface override prominently:

> Your dates are mixed — looks like a freelance/consulting career arc. Defaulting to Established-track, but pick the tier that matches how senior you actually are.

**User uploads a resume that's already tailored to a specific job.** Detect via JD-specific phrasing patterns (out of scope for this stage — Stage 02 will catch it). For Stage 01 purposes, treat all uploads identically.

**User enters non-English content.** Out of scope for v1. Audit:

> UpDraft is English-only right now. Português, Español, etc. coming later — for now, this won't work cleanly.

End session.

---

## Stage 01 Completion Criteria

Stage 01 is complete and Stage 02 may start when:
- `identity` has all 3 required fields (name, email, phone) confirmed by user
- `path` is set
- `tier` is set with `tier_confidence` of "auto" or "overridden"
- `resume_parsed` is non-null (Path A) OR `resume_parsed` is null and Path B was selected explicitly

Host program advances. Stage 01 outputs are passed forward; the model loses access to raw conversation history when Stage 02 starts (only structured outputs persist).
