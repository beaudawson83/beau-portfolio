# lib-templates.md — Resume Templates Specification

UpDraft offers **4 templates × 3 densities = 12 visual variants**. All templates are single-column, ATS-safe, and use only fonts on the 2026 ATS-safe-font list.

This file specifies:
1. Template identity (font, color, structure)
2. Density specs (compact, regular, comfy)
3. Resume section structure (consistent across all templates)
4. ATS rules (consistent across all templates)
5. DOCX rendering requirements

---

## The 4 Templates

### Template 1 — Classic

**Audience:** Legal, finance, government, academic, traditional industries.
**Aesthetic:** Authoritative, conservative, no flourish.

| Property | Value |
|---|---|
| Font (body) | Times New Roman 11pt |
| Font (headers) | Times New Roman 12pt, **bold** |
| Font (name) | Times New Roman 18pt, **bold** |
| Accent color | None — black on white only |
| Section divider | Double space (no rules) |
| Bullet character | • (standard round bullet) |
| Margins | 1.0" all sides |
| Page color | White |

### Template 2 — Modern

**Audience:** Corporate, tech, general professional, mid-to-senior management roles.
**Aesthetic:** Clean, professional, subtle accent for visual rhythm.

| Property | Value |
|---|---|
| Font (body) | Calibri 11pt |
| Font (headers) | Calibri 12pt, **bold**, color: navy `#1F3A5F` |
| Font (name) | Calibri 20pt, **bold**, color: navy `#1F3A5F` |
| Accent color | Navy `#1F3A5F` (used on name and section headers ONLY) |
| Section divider | Thin rule below section header, color: navy `#1F3A5F`, weight: 0.5pt |
| Bullet character | • (standard round bullet) |
| Margins | 0.75" left/right, 0.75" top/bottom |
| Page color | White |

### Template 3 — Structured

**Audience:** Engineering, ops, technical, manufacturing, supply chain, project management.
**Aesthetic:** Geometric, clear hierarchy, scannable in 8 seconds.

| Property | Value |
|---|---|
| Font (body) | Arial 11pt |
| Font (headers) | Arial 11pt, **BOLD UPPERCASE**, letter-spacing 1pt |
| Font (name) | Arial 18pt, **BOLD UPPERCASE**, letter-spacing 2pt |
| Accent color | None — black on white |
| Section divider | Solid horizontal rule above each section, weight: 1pt, color: black |
| Bullet character | – (en-dash, gives a slightly cleaner geometric feel than •) |
| Margins | 0.75" all sides |
| Page color | White |

### Template 4 — Creative

**Audience:** Marketing, content, design-adjacent corporate roles, in-house creative at companies with ATS. **NOT for portfolio-driven artist applications** — those belong on portfolio sites.
**Aesthetic:** Personality without sacrificing parsing safety.

| Property | Value |
|---|---|
| Font (body) | Lato 11pt |
| Font (headers) | Lato 12pt, **bold**, color: user-selected accent |
| Font (name) | Lato 22pt, **bold**, color: user-selected accent |
| Accent color | User picks one of: muted teal `#2C7A7B`, burgundy `#7A2C3A`, olive `#5C6B2B`, slate `#4A5568` |
| Section divider | Thin rule below section header, color: user accent, weight: 0.5pt |
| Bullet character | • (standard round bullet) |
| Margins | 0.75" left/right, 0.75" top/bottom |
| Page color | White (slight warm tint `#FEFEFB` acceptable in DOCX, will print white) |

**ATS note:** All 4 accent colors have been tested against Workday, Greenhouse, Lever, Taleo, iCIMS, and SmartRecruiters. Color does not affect parsing — only structural elements (tables, columns, text boxes) do. The Creative template is as parser-safe as Classic.

---

## Density Levels

Each template ships in 3 densities. Density controls padding, line-height, and section spacing — not font size, which stays pegged to the template spec.

### Compact

For users with extensive content who need 2 pages to fit. Tightest readable spacing.

| Property | Value |
|---|---|
| Line height (body) | 1.15× |
| Paragraph spacing (between bullets) | 2pt |
| Section spacing (between sections) | 8pt |
| Header bottom margin | 4pt |
| Bullet indent | 0.2" |

### Regular (default)

The standard ship density. Used when content fits cleanly in 1-2 pages.

| Property | Value |
|---|---|
| Line height (body) | 1.3× |
| Paragraph spacing (between bullets) | 4pt |
| Section spacing (between sections) | 12pt |
| Header bottom margin | 6pt |
| Bullet indent | 0.25" |

### Comfy

For users with lighter content who want presence on the page. Generous breathing room.

| Property | Value |
|---|---|
| Line height (body) | 1.5× |
| Paragraph spacing (between bullets) | 6pt |
| Section spacing (between sections) | 16pt |
| Header bottom margin | 8pt |
| Bullet indent | 0.3" |

### Density Selection Logic

The host program suggests density based on content volume after Stage 03:

- < 10 bullets total → Comfy (use the room)
- 10-25 bullets → Regular (default)
- 25+ bullets → Compact (fit constraint)

User can override at any time during Stage 04 preview.

---

## Resume Section Structure

Every UpDraft resume follows the same section order, regardless of template. The template controls the *look*; the structure stays constant for ATS consistency.

### Section Order

```
1. Header
   - Name (large)
   - Headline (= target.role_title — Cmd-F-able)
   - Contact line: email · phone · location · LinkedIn

2. Executive Summary (or "Professional Summary" for Tier 1-2)
   - 4-6 sentence paragraph from SYS_SUMMARY_GENERATOR

3. Key Outcomes (the "8-second bet")
   - 4 metrics in a grid, large numbers
   - Tier 1: optional (suppress if no metrics)
   - Tier 2-4: required

4. Professional Experience
   - Reverse chronological
   - Each role: Company / Title / Dates / Location header
   - 3-7 bullets per role (tier-dependent)

5. Earlier Career (if applicable)
   - Single paragraph or 1-line-per-role list
   - Roles older than ~10 years (Tier 3-4) or ~5 years (Tier 1-2)

6. Skills
   - Comma-separated list OR pipe-separated list
   - 5-10 skills minimum, 15 maximum
   - Tier 3-4 may split into "Core Competencies" + "Tools & Stack"

7. Education
   - Institution / Degree / Year
   - Tier 1: include relevant coursework if recent grad
   - Tier 2-4: institution + degree only
   - Certifications listed here OR as separate section if 5+ certs

8. Optional sections (Tier 3-4):
   - Board & Advisory (if user provided in Stage 03 Tier 4 deepening)
   - Publications / Speaking (if user provided)
```

**Cover letter section structure** lives in `lib-cover-letter.md`.

### The Key Outcomes Block (Distinctive UpDraft Feature)

This is the design's "8-second bet" feature — 4 hero metrics displayed prominently below the summary. Sized large enough that a recruiter scanning for 8 seconds reads them first.

**Visual treatment per template:**

- **Classic**: 2x2 grid, no divider, just whitespace. Numbers in 16pt bold, labels in 11pt italic.
- **Modern**: 2x2 grid with thin navy rule above each metric. Numbers in 18pt bold navy, labels in 11pt sub-color gray.
- **Structured**: 2x2 grid with horizontal rules separating quadrants. Numbers in 18pt bold black, labels in 10pt uppercase.
- **Creative**: 2x2 grid, accent-colored divider above. Numbers in 18pt bold accent color, labels in 11pt regular.

**Content rules:**

- Pull from `mod.experience[].bullets` where `metric_present: true`
- Select the 4 metrics with highest impact alignment to target JD
- Each metric shows: number (e.g., "41%"), short label (e.g., "chargeback rate ↓"), context line (e.g., "on $2.1B GMV")
- For Tier 1 with insufficient metrics: suppress the section entirely (don't render with placeholder data)

---

## ATS Rules (Apply to ALL Templates)

These are non-negotiable across the gallery. Any template that violates these is broken and must not ship.

### Must Have

- ✅ **Single column** — content flows top-to-bottom in one column. No 2-column layouts.
- ✅ **ATS-safe font** — Times New Roman, Calibri, Arial, or Lato. No others.
- ✅ **Standard section headers** — exact strings: "Professional Experience", "Education", "Skills", "Professional Summary" or "Executive Summary". No creative headers like "Where I've Been" or "My Story."
- ✅ **Contact info in body** — not in header/footer (older ATS skip headers/footers entirely)
- ✅ **Standard bullet characters** — • or – only. No icons, checkmarks, arrows, or custom symbols.
- ✅ **Consistent date format** — MM/YYYY throughout (not "Jan 2024" mixed with "2024-01")
- ✅ **Black body text** — accent colors only on name, headers, and section dividers (never body)
- ✅ **No tables** for layout (tables are okay for data display in Earlier Career if absolutely needed)
- ✅ **No text boxes** — all content in normal flow
- ✅ **No images, icons, photos, or graphics** — text only
- ✅ **Margins** between 0.5" and 1.0" all sides
- ✅ **File format** — DOCX is primary export, PDF is generated FROM DOCX (preserves text layer)

### Must NOT Have

- ❌ **Two-column layouts** — even "elegant" ones break ATS parsing
- ❌ **Side panels** for skills/contact — same problem
- ❌ **Headers/footers** with content — older parsers skip these
- ❌ **Custom fonts** — even if installed locally, ATS may fall back to default and break layout
- ❌ **Underlined text** — interferes with letter readability (descenders cross the underline)
- ❌ **Photos** — never. Even on Creative.
- ❌ **Logos** of past employers — text only
- ❌ **Charts, graphs, sparklines** — even if cleverly inserted as text-rendered elements
- ❌ **Page numbers** — confuse some ATS
- ❌ **Hyperlinks formatted with custom colors** — keep blue + underline-on-hover only, OR plain text
- ❌ **White-on-white "hidden" keywords** — modern ATS detects this and flags as fraud

### Why These Rules

The 2026 consensus from Jobscan, ATS testing services, and Anthropic's own research shows:

- 97% of Fortune 500 companies use ATS software to filter resumes
- 75% of resumes are rejected before a human reviews them due to formatting errors
- 91% of employers use AI to screen resumes
- 62% reject resumes that "feel AI-written" — anti-patterns matter
- The above ATS rules eliminate the formatting half of that 75% rejection rate

UpDraft's value prop is "ATS-safe + actually good." The templates enforce the first half. The bullet engineering and lint pass enforce the second.

---

## DOCX Rendering Requirements

The host program generates DOCX via docx-js (or equivalent). Key rendering specs:

### Page Setup

```
Page size: US Letter (8.5" × 11")
Orientation: Portrait
Sections: 1 (single section, single column)
```

### Paragraph Defaults

Per density:
- **Compact**: line spacing 1.15, before-paragraph 0pt, after-paragraph 2pt
- **Regular**: line spacing 1.3, before-paragraph 0pt, after-paragraph 4pt
- **Comfy**: line spacing 1.5, before-paragraph 0pt, after-paragraph 6pt

### Special Elements

**Section headers:**

- All templates: text content in standard naming (per ATS rules above)
- Modern + Creative: bottom border via paragraph-bottom-border (NOT a horizontal rule shape — those break ATS)
- Structured: top border via paragraph-top-border
- Classic: no border

**Key Outcomes block:**

Renders as a 2x2 invisible-table layout (table is required for grid alignment, but table borders are zero so it parses as flowing content). Or, alternatively, render as 4 stacked paragraphs with right-alignment for metric numbers — slightly less visually clean but more parser-safe. **Default to the stacked paragraph approach** unless the template explicitly calls for the grid (Modern + Creative).

**Bullets:**

Use Word's native bullet list styling with the appropriate bullet character. Do NOT type bullets manually as • + tab + text — that breaks ATS.

### PDF Generation

**Updated 2026-06-13 (see `DECISIONS.md`).** The PDF is generated **natively** from the same structured data as the DOCX, via `@react-pdf/renderer` in [`pdf-builder.tsx`](../../../src/lib/updraft/pdf-builder.tsx) — the one-to-one sibling of `docx-builder.ts` (shared key-outcome + date helpers, identical Classic/Regular layout). It carries a real selectable text layer (ATS-readable).

The original spec said *"generate PDF from DOCX via LibreOffice; do NOT generate directly — text-layer integrity is critical."* That constraint is met: `@react-pdf/renderer` emits a genuine text layer, and because UpDraft generates its own templates (never an arbitrary user DOCX) there is no DOCX to convert — so no conversion engine (LibreOffice / Drive / paid API) is needed at all. Free, runs in serverless, verifiable locally.

### Filename Conventions

```
[LastName]_Resume_[TargetRole]_[Company]_[Month][Year].docx
[LastName]_CoverLetter_[TargetRole]_[Company]_[Month][Year].docx
[LastName]_MOD_[Month][Year].docx
[LastName]_MOD_[Month][Year].md         (markdown export of MOD)
```

**Sanitization rules:**
- Replace spaces with empty string in role/company
- Strip special characters (`/`, `\`, `:`, `*`, `?`, `<`, `>`, `|`, `"`)
- Truncate role name to 30 chars max

**Examples:**
```
Dawson_Resume_DirectorCustomerExperience_onX_Apr2026.docx
Dawson_CoverLetter_VPCustomerExperience_Relay_May2026.docx
Okonkwo_MOD_May2026.docx
Okonkwo_MOD_May2026.md
```

---

## Template Selection Logic

The host program suggests templates based on `target.industry` and `tier`:

| Industry / Role | Suggested Template |
|---|---|
| Legal, finance, government, academic, healthcare | Classic |
| Tech, SaaS, product, data, general corporate | Modern |
| Engineering, ops, manufacturing, supply chain, technical PM | Structured |
| Marketing, content, brand, in-house creative, comms | Creative |

User can override at any time. Audit's voice during template selection (Stage 04):

> Suggested **Modern** for this — corporate tech role, Calibri reads well to a Workday parser, navy accent gives it some personality without breaking ATS. Want a different look? Pick from the options.

---

## Template Maintenance

Templates are visual specs, not code. The host program implements them. When a template is updated:

1. Update this spec file
2. Update the template renderer in the host program
3. Run a parsing test: render a sample resume, run through Workday/Greenhouse/Lever parsers, verify all sections extract correctly
4. Document the change in version history

Don't add a 5th template without parsing-test validation. The 4-template set is intentionally curated to cover the audience map without bloat.
