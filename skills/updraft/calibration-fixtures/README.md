# UpDraft calibration corpus

Resume + JD fixtures for the SYS_MATCH_ANALYZER prompt-tuning pass. Used
by the CLI harness at [`scripts/calibrate-match-analyzer.ts`](../../../scripts/calibrate-match-analyzer.ts).

See [`../CALIBRATION.md`](../CALIBRATION.md) for the tuning workflow,
acceptance criteria, and benchmark prose.

## Layout

```
calibration-fixtures/
├── resumes/                    # 7 anonymized resume .txt files (raw text)
│   └── {name}.parsed.json      # cached SYS_RESUME_PARSER output (created on first parse)
├── jds/                        # 7 anonymized JD .txt files
└── cases/                      # YAML/JSON case files (resume × JD × tier × expected)
    ├── README.md
    └── example.yaml
```

## Anonymization policy

Identity-only swaps: name, email, phone, address, LinkedIn slug. Companies,
dates, achievements, schools, locations, bullet content all preserved
verbatim. Source PDFs/DOCX never enter the repo.

This corpus contains real career data from real people, light-anonymized.
**The repo is private** — the corpus does not ship publicly. Don't paste
fixture content into screenshots, public Slack messages, or bug reports.

## Adding a new resume

1. Get the source PDF or DOCX (don't commit it).
2. Extract text — copy/paste from a reader, or use the same path Stage 01
   does (Gemini-direct for PDF, mammoth for DOCX).
3. Replace name / email / phone / address / LinkedIn slug with realistic
   fakes. Use 555-area-code prefixes for synthetic phone numbers per the
   US fictional-phone convention.
4. Save as `resumes/{kebab-case-name}.txt` — use a role-descriptive
   filename, not the person's identity.
5. Run `npm run calibrate:parse -- --resume {name}` to generate the
   cached `.parsed.json` once. Commit both files together.
6. Add at least one case in `cases/` referencing the new resume.

## Adding a new JD

1. Get the JD text (copy from the source page).
2. Strip LinkedIn UI chrome ("Apply", "Save", "Show match details", etc.)
   — keep only About / Responsibilities / Qualifications / Compensation.
3. Replace any hiring-team person names + recruiter emails with synthetic
   equivalents.
4. Save as `jds/{NN}-{company-role-kebab}.txt` (numeric prefix preserves
   ordering in `ls`).

## Re-parsing

The harness caches parsed resume JSON next to the .txt file. To force
re-parse (after a SYS_RESUME_PARSER change):

```bash
rm skills/updraft/calibration-fixtures/resumes/*.parsed.json
npm run calibrate:parse
```

## Cost

Each parse call: ~SYS_RESUME_PARSER tokens (~few thousand in/out per
resume). Each analyze call: ~SYS_MATCH_ANALYZER + rubric tokens (~ten
thousand in/few hundred out per pair). Real numbers print in the harness
result table.
