# lib-output-contract.md — Backend Storage & Export Schema

This file specifies what UpDraft produces, what gets stored in the BAD Labs backend, and how files are named and organized.

## Three Artifact Types

Every UpDraft session produces:

1. **Export files** — DOCX + PDF for each chosen deliverable. MOD also exports as Markdown.
2. **Structured JSON for backend** — full session state for storage, future retrieval, and analytics.
3. **Session log** — stage progression, decisions, anti-pattern lint history.

---

## 1. Export Files

### Per Deliverable

| Deliverable | DOCX | PDF | MD |
|---|---|---|---|
| Master Overview Document | ✅ | ✅ | ✅ (portable, plain-text source) |
| JD-Specific Resume Build | ✅ | ✅ | ❌ |
| Cover Letter | ✅ | ✅ | ❌ |

### Filename Conventions

```
[LastName]_[Type]_[TargetRole?]_[Company?]_[Month][Year].[ext]
```

Where:
- `[LastName]`: candidate's last name, sanitized (no spaces, no special chars)
- `[Type]`: `Resume` | `CoverLetter` | `MOD`
- `[TargetRole]`: included for Resume + CoverLetter, omitted for MOD
- `[Company]`: included for Resume + CoverLetter, omitted for MOD
- `[Month]`: 3-letter abbreviation (Jan, Feb, ...)
- `[Year]`: 4-digit year
- `[ext]`: `docx` | `pdf` | `md`

**Sanitization rules:**

- Replace spaces with empty string in role/company
- Strip special characters: `/`, `\`, `:`, `*`, `?`, `<`, `>`, `|`, `"`, `'`, `&`, `,`
- Truncate role name to 30 chars maximum
- Truncate company name to 20 chars maximum

**Examples:**

```
Dawson_Resume_DirectorCustomerExperience_onX_Apr2026.docx
Dawson_CoverLetter_VPCustomerExperience_Relay_May2026.docx
Dawson_MOD_May2026.docx
Dawson_MOD_May2026.pdf
Dawson_MOD_May2026.md
Okonkwo_Resume_DirectorOfOperations_LatticeMarkets_May2026.docx
```

### Storage Path (Backend)

```
/users/[user_id]/sessions/[session_id]/exports/
    [filename].docx
    [filename].pdf
    [filename].md
```

Files are write-once. Re-running UpDraft for the same target generates a new session_id and new files; old files are preserved for the user's history.

---

## 2. Structured JSON for Backend

This is the canonical session record. Persists to user's account for future retrieval, analytics, and (eventually) re-tailoring without rerunning the full interview.

### Top-Level Schema

```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "created_at": "ISO 8601 timestamp",
  "completed_at": "ISO 8601 timestamp | null",
  "status": "in_progress | completed | abandoned",

  "stage_outputs": {
    "stage_01": { /* see Stage 01 output contract */ },
    "stage_02": { /* see Stage 02 output contract */ },
    "stage_03": { /* see Stage 03 output contract */ },
    "stage_04": { /* see Stage 04 output contract */ }
  },

  "deliverables_produced": [
    {
      "type": "mod | resume | cover_letter",
      "files": {
        "docx_path": "string",
        "pdf_path": "string",
        "md_path": "string | null"
      },
      "filename_base": "string",
      "generated_at": "ISO 8601",
      "ats_score": "number | null"     // resume only
    }
  ],

  "session_metadata": {
    "tier_classified": "1 | 2 | 3 | 4",
    "tier_overridden": "boolean",
    "path": "upload | talk",
    "lightweight_mod": "boolean",
    "total_session_minutes": "number",
    "user_agent": "string",
    "tweaks_used": ["string"]
  }
}
```

### Stage 01 Output

(Defined in `stage-01-intake.md`. Repeated here for consolidated reference.)

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
  "resume_raw": "string | null",
  "resume_parsed": { /* parsed resume schema */ } | null,
  "tier": "1 | 2 | 3 | 4",
  "tier_confidence": "auto | confirmed | overridden",
  "tier_classifier_inputs": {
    "years_band": "0-2 | 3-7 | 8-15 | 15+",
    "role_level": "string",
    "reports_peak": "string"
  },
  "years_experience": "number"
}
```

### Stage 02 Output

(Defined in `stage-02-target.md`. Repeated for reference.)

```json
{
  "stage": "02-target",
  "deliverables": ["mod | jd_build | cover_letter"],
  "lightweight_mod": "boolean",
  "target": { /* role + JD object */ } | null,
  "match_analysis": { /* match analysis object */ } | null,
  "confidence_band": "DIRECT | TRANSFERABLE | ADJACENT | WEAK | GAP | null"
}
```

### Stage 03 Output

(Defined in `stage-03-interview.md`. Repeated for reference.)

```json
{
  "stage": "03-interview",
  "mod_mode": "full | lightweight",
  "mod": {
    "identity": { /* from Stage 01 */ },
    "summary": "string",
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
    "earlier_career": [
      {
        "company": "string",
        "title": "string",
        "dates": "string"
      }
    ],
    "education": [
      {
        "institution": "string",
        "degree": "string | null",
        "start_year": "number | null",
        "end_year": "number | null",
        "honors": "string | null"
      }
    ],
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
    "transformation_arc": "string | null",
    "interview_objections": ["string"],
    "board_advisory": [
      {
        "organization": "string",
        "role": "string",
        "dates": "string",
        "context": "string | null"
      }
    ]
  },
  "tier_reaffirmed": "1 | 2 | 3 | 4",
  "ready_for_generation": "boolean"
}
```

### Stage 04 Output

(Defined in `stage-04-generate.md`. Repeated here for completeness.)

```json
{
  "stage": "04-generate",
  "template_selected": "classic | modern | structured | creative",
  "density_selected": "compact | regular | comfy",
  "creative_accent": "teal | burgundy | olive | slate | null",
  "tailored_resume": {
    "headline": "string",
    "summary": "string",
    "key_outcomes": [
      {
        "metric": "string",
        "label": "string",
        "context": "string"
      }
    ],
    "experience": [/* tailored bullets per role */],
    "earlier_career": [/* same as MOD */],
    "skills": ["string"],
    "education": [/* same as MOD */],
    "board_advisory": [/* if Tier 4 */],
    "ats_score": "number",
    "ats_breakdown": {
      "required_coverage": "number",
      "preferred_coverage": "number",
      "quantification_density": "number",
      "section_completeness": "number",
      "keyword_distribution": "number"
    }
  },
  "cover_letter": {
    "greeting": "string",
    "paragraphs": ["string", "string", "string", "string"],
    "signoff": "string",
    "word_count": "number",
    "hook_type": "A | B | C | D",
    "p3_branch": "gap | objection | color",
    "close_type": "A | B | C"
  },
  "lint_pass_log": [
    {
      "stage": "string",
      "type": "string",
      "original_text": "string",
      "rewritten_text": "string",
      "fix_applied": "string"
    }
  ],
  "qa_findings": [
    {
      "category": "string",
      "severity": "blocking | non-blocking",
      "description": "string",
      "resolved": "boolean"
    }
  ],
  "exports": {
    "resume_docx": "path",
    "resume_pdf": "path",
    "cover_letter_docx": "path | null",
    "cover_letter_pdf": "path | null",
    "mod_docx": "path | null",
    "mod_pdf": "path | null",
    "mod_md": "path | null"
  }
}
```

---

## 3. Session Log

The session log is append-only and tracks the user's path through UpDraft. Used for:

- Debugging (when a session fails or produces unexpected output)
- Analytics (which patterns succeed, where users drop off)
- Future tuning (what tier classification accuracy looks like over time)

### Log Schema

```json
{
  "session_id": "uuid",
  "events": [
    {
      "timestamp": "ISO 8601",
      "stage": "01 | 02 | 03 | 04",
      "phase": "string",
      "event_type": "string",
      "data": {}
    }
  ]
}
```

### Event Types

| Event | When | Notable Data |
|---|---|---|
| `stage_entered` | User advances to a stage | `stage`, `entry_method` (auto / back-button / direct-jump) |
| `stage_completed` | Stage validates and advances | `stage`, `duration_seconds` |
| `det_prompt_rendered` | Host renders a deterministic UI | `prompt_id` |
| `det_prompt_answered` | User submits | `prompt_id`, `response_summary` |
| `ai_call_initiated` | Model call starts | `prompt_name` (e.g., `SYS_RESUME_PARSER`) |
| `ai_call_completed` | Model returns | `prompt_name`, `latency_ms`, `tokens_used` |
| `lint_flag_detected` | Anti-pattern detected | `flag_type`, `location`, `original_text` |
| `lint_flag_resolved` | Lint rewrite applied | `flag_type`, `fix_applied` |
| `tier_overridden` | User changed tier | `from_tier`, `to_tier` |
| `tier_reaffirmed` | Stage 03 mid-interview tier change | `from_tier`, `to_tier`, `reason` |
| `qa_finding` | Final QA pass flags | `category`, `severity` |
| `export_generated` | File written to disk | `type`, `path`, `size_bytes` |
| `session_abandoned` | User leaves without completing | `last_stage`, `duration_seconds` |

---

## Backend Storage Architecture

### User Account

```json
{
  "user_id": "uuid",
  "email": "string",
  "name": "string",
  "created_at": "ISO 8601",
  "subscription_tier": "free | pro | enterprise",
  "sessions": ["session_id"],
  "active_mod": {
    "session_id": "uuid",
    "updated_at": "ISO 8601",
    "summary_for_display": "string"
  }
}
```

### Active MOD

The user has at most ONE active MOD at any time. When they run UpDraft and produce a new MOD, the active MOD pointer updates. Old MODs are preserved in their session history but the user's "current source-of-truth" is whichever they generated most recently (or explicitly set as active via UI).

This is what enables future "re-tailor for a new JD without redoing the interview" flows.

### Session History

All sessions persist indefinitely. User can:
- Browse past sessions
- Re-download exports from past sessions
- Re-run a past session against a new JD (Stage 04 only — reuses Stage 01-03 outputs)
- Delete sessions (deletes exports + JSON + log entries)

### Privacy & Data Handling

- All data stored encrypted at rest (standard cloud encryption)
- Resume content (raw + parsed) is sensitive PII — access logged per-read
- No third-party sharing of resume content
- User can export all their data as a JSON archive (GDPR/CCPA-style portability)
- User can delete their account, which cascades to delete all sessions, exports, and logs

(The user-facing privacy notice that explains all of this lives in the host program's UI footer, NOT in the UpDraft skill flow — Beau's call.)

---

## Re-Tailoring Flow (Future)

A v1 stretch goal: user has an MOD from a previous UpDraft session and wants a new tailored resume for a different JD without redoing Stage 03.

The contract for this flow:

```
INPUT: existing session_id (with completed stage_03 output)
       new target object (role + JD)

PROCESS:
  Skip Stage 01 (use existing identity from MOD)
  Skip most of Stage 02 (deliverables = jd_build only by default;
    re-run match_analysis on existing MOD vs new JD)
  Skip Stage 03 entirely (reuse MOD from existing session)
  Run Stage 04 with existing MOD + new target

OUTPUT: new session_id, new export files, no new MOD
        (the existing MOD is unchanged)
```

This is documented for future implementation. v1 ships without it but the schema supports it.

---

## API Considerations (For Host Program)

The host program will need REST endpoints for:

```
POST   /api/sessions                  Create new session, returns session_id
GET    /api/sessions/[id]             Get session state
PATCH  /api/sessions/[id]/stage/[n]   Update stage output
POST   /api/sessions/[id]/exports     Generate export files
GET    /api/sessions/[id]/exports/[f] Download a specific export
DELETE /api/sessions/[id]             Delete a session
GET    /api/users/[id]/active-mod     Get user's current MOD
PUT    /api/users/[id]/active-mod     Set user's active MOD
```

The skill itself is stateless — all state lives in the backend. The skill produces JSON; the backend persists.

This separation means the skill can be tested in isolation against fixture inputs without backend integration.
