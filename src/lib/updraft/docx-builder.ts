// UpDraft DOCX builder — Classic / Regular template.
//
// Produces ATS-safe single-column DOCX output per
// skills/updraft/references/lib-templates.md § Template 1 — Classic.
// v0.1 ships only this template + the Regular density. The other 3
// templates × 3 densities = 12 variants land in v1.0 per PLAN.md §8.
//
// Two entry points: renderModDocx (full source-of-truth document) and
// renderResumeDocx (the publishable resume). Both share the same Classic
// styling primitives; they differ in section selection and content depth.
//
// Sizing notes (docx package uses unusual unit conventions):
//   - Font size: half-points. 22 = 11pt, 24 = 12pt, 36 = 18pt.
//   - Margins / indent: twips. 1 inch = 1440 twips.
//   - Line spacing: twips at lineRule=auto. 240 = 1.0×, 312 ≈ 1.3×.
//   - Paragraph spacing: twips. 4pt = 80 twips.

import 'server-only';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type {
  ParsedResumeIdentity,
  UpdraftEarlierCareerEntry,
  UpdraftMod,
  UpdraftRoleInMod,
  UpdraftTargetRole,
} from '@/types';

// ---------------------------------------------------------------------------
// Classic / Regular constants (lib-templates.md)
// ---------------------------------------------------------------------------

const FONT_BODY = 'Times New Roman';
const SIZE_BODY = 22;                              // 11pt
const SIZE_SECTION_HEADER = 24;                    // 12pt
const SIZE_NAME = 36;                              // 18pt
const SIZE_KEY_OUTCOME_NUMBER = 32;                // 16pt
const SIZE_KEY_OUTCOME_LABEL = 22;                 // 11pt italic

const MARGIN_TWIPS = 1440;                         // 1.0"

const LINE_SPACING_BODY = 312;                     // 1.3× (Regular density)
const SPACING_BETWEEN_BULLETS = 80;                // 4pt
const SPACING_BETWEEN_SECTIONS = 240;              // 12pt
const SPACING_HEADER_AFTER = 120;                  // 6pt
const BULLET_INDENT = 360;                         // 0.25"

// ---------------------------------------------------------------------------
// Date formatting — YYYY-MM → MM/YYYY (ATS-consistent per spec)
// ---------------------------------------------------------------------------

function formatDate(s: string): string {
  if (s === 'Present' || s === 'present') return 'Present';
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[2]}/${m[1]}`;
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

// ---------------------------------------------------------------------------
// Paragraph builders
// ---------------------------------------------------------------------------

function bodyRun(text: string, opts: { bold?: boolean; italic?: boolean; size?: number } = {}): TextRun {
  return new TextRun({
    text,
    font: FONT_BODY,
    bold: opts.bold ?? false,
    italics: opts.italic ?? false,
    size: opts.size ?? SIZE_BODY,
  });
}

function bodyParagraph(
  text: string | TextRun[],
  opts: {
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
    spacingBefore?: number;
    spacingAfter?: number;
  } = {},
): Paragraph {
  return new Paragraph({
    alignment: opts.alignment,
    spacing: {
      line: LINE_SPACING_BODY,
      lineRule: 'auto',
      before: opts.spacingBefore ?? 0,
      after: opts.spacingAfter ?? SPACING_BETWEEN_BULLETS,
    },
    children: typeof text === 'string' ? [bodyRun(text)] : text,
  });
}

function sectionHeader(label: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: SPACING_BETWEEN_SECTIONS,
      after: SPACING_HEADER_AFTER,
      line: LINE_SPACING_BODY,
      lineRule: 'auto',
    },
    children: [
      new TextRun({
        text: label.toUpperCase(),
        font: FONT_BODY,
        bold: true,
        size: SIZE_SECTION_HEADER,
      }),
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: 'updraft-bullets', level: 0 },
    indent: { left: BULLET_INDENT, hanging: 200 },
    spacing: {
      line: LINE_SPACING_BODY,
      lineRule: 'auto',
      before: 0,
      after: SPACING_BETWEEN_BULLETS,
    },
    children: [bodyRun(text)],
  });
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function buildHeader(
  identity: ParsedResumeIdentity,
  headline: string | null,
): Paragraph[] {
  const out: Paragraph[] = [];

  // Name — large, centered
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: SPACING_HEADER_AFTER, line: LINE_SPACING_BODY, lineRule: 'auto' },
      children: [
        new TextRun({
          text: identity.name || '— name —',
          font: FONT_BODY,
          bold: true,
          size: SIZE_NAME,
        }),
      ],
    }),
  );

  // Headline — target.role_title for ATS Cmd-F. Centered, italic.
  if (headline) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING_HEADER_AFTER, line: LINE_SPACING_BODY, lineRule: 'auto' },
        children: [
          new TextRun({
            text: headline,
            font: FONT_BODY,
            italics: true,
            size: SIZE_BODY,
          }),
        ],
      }),
    );
  }

  // Contact line — body in normal flow per ATS rules (NOT in header/footer).
  const contactParts = [
    identity.email,
    identity.phone,
    identity.location,
    identity.linkedin,
  ].filter((s): s is string => Boolean(s && s.trim() !== ''));
  if (contactParts.length > 0) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING_BETWEEN_SECTIONS, line: LINE_SPACING_BODY, lineRule: 'auto' },
        children: [bodyRun(contactParts.join(' · '))],
      }),
    );
  }

  return out;
}

function buildSummary(summary: string | undefined): Paragraph[] {
  if (!summary || !summary.trim()) return [];
  return [
    sectionHeader('Professional Summary'),
    bodyParagraph(summary.trim(), { spacingAfter: SPACING_BETWEEN_BULLETS }),
  ];
}

interface KeyOutcome {
  number: string;       // e.g. "41%"
  label: string;        // e.g. "chargeback rate ↓"
  context?: string;     // e.g. "on $2.1B GMV"
}

function extractKeyOutcomesFromBullets(mod: UpdraftMod, max = 4): KeyOutcome[] {
  // v0.1 heuristic: find the first 4 metric-bearing bullets across roles.
  // Pull the first metric phrase out of each bullet for the number, use
  // the rest as the label. Honest but unsophisticated — full impact
  // scoring lands in v0.5 alongside the JD-tailoring pass.
  const out: KeyOutcome[] = [];
  for (const role of mod.experience) {
    for (const b of role.bullets) {
      if (out.length >= max) break;
      if (!b.metric_present) continue;
      // Pull the first number-with-unit. Captures things like "41%",
      // "$2.1B", "1,500+", "90%+", "11 weeks".
      const m =
        /(\$\d[\d.,]*\s*[KkMmBb]?\+?|\d[\d.,]*\s*(?:%|%\+|x|×|\s+(?:weeks?|months?|years?|hours?|days?|people|reports?|customers?|accounts?|hires?))|\d[\d.,]+\+?)/.exec(
          b.text,
        );
      if (!m) continue;
      const number = m[0].trim();
      // Label: trim around the metric, take a short fragment from the
      // sentence start (or after a verb) — keep it under ~50 chars.
      const before = b.text.slice(0, m.index).trim();
      const after = b.text.slice(m.index + m[0].length).trim();
      const candidate = (before.length >= 4 ? before : after).slice(0, 60).trim();
      out.push({
        number,
        label: candidate || role.title,
        context: role.company,
      });
    }
    if (out.length >= max) break;
  }
  // Spec says: don't render with placeholders. Only render if we have at
  // least 4. Tier 1 rule from the spec also implies this.
  return out.length >= 4 ? out.slice(0, max) : [];
}

function buildKeyOutcomes(mod: UpdraftMod): Paragraph[] {
  const outcomes = extractKeyOutcomesFromBullets(mod);
  if (outcomes.length === 0) return [];

  const out: Paragraph[] = [sectionHeader('Key Outcomes')];

  // Classic spec calls for a 2x2 grid. ATS rules forbid actual tables for
  // layout, so we render as a 4-paragraph stack instead — semantically
  // identical and parser-safe. Visual 2x2 grid is a v1.0 polish concern.
  for (const o of outcomes) {
    out.push(
      new Paragraph({
        spacing: {
          line: LINE_SPACING_BODY,
          lineRule: 'auto',
          before: 0,
          after: SPACING_BETWEEN_BULLETS,
        },
        children: [
          new TextRun({
            text: o.number,
            font: FONT_BODY,
            bold: true,
            size: SIZE_KEY_OUTCOME_NUMBER,
          }),
          bodyRun('  '),
          bodyRun(o.label, { italic: true, size: SIZE_KEY_OUTCOME_LABEL }),
          ...(o.context ? [bodyRun(`  —  ${o.context}`, { size: SIZE_KEY_OUTCOME_LABEL })] : []),
        ],
      }),
    );
  }
  return out;
}

function buildExperienceSection(roles: UpdraftRoleInMod[]): Paragraph[] {
  if (roles.length === 0) return [];
  const out: Paragraph[] = [sectionHeader('Professional Experience')];
  for (const role of roles) {
    // Header line: "Company — Title  |  MM/YYYY – MM/YYYY · Location"
    const dateRange = formatDateRange(role.start_date, role.end_date);
    const headerBits: TextRun[] = [
      bodyRun(role.company, { bold: true }),
      bodyRun('  ·  '),
      bodyRun(role.title, { italic: true }),
      bodyRun('  |  '),
      bodyRun(dateRange),
    ];
    if (role.location) {
      headerBits.push(bodyRun('  ·  '));
      headerBits.push(bodyRun(role.location));
    }
    out.push(
      new Paragraph({
        spacing: {
          line: LINE_SPACING_BODY,
          lineRule: 'auto',
          before: SPACING_HEADER_AFTER,
          after: SPACING_BETWEEN_BULLETS,
        },
        children: headerBits,
      }),
    );
    if (role.context && role.context.trim()) {
      out.push(bodyParagraph(role.context.trim()));
    }
    for (const bullet of role.bullets) {
      if (bullet.text.trim() === '') continue;
      out.push(bulletParagraph(bullet.text.trim()));
    }
  }
  return out;
}

function buildEarlierCareer(entries: UpdraftEarlierCareerEntry[]): Paragraph[] {
  if (entries.length === 0) return [];
  const out: Paragraph[] = [sectionHeader('Earlier Career')];
  for (const e of entries) {
    out.push(
      new Paragraph({
        spacing: {
          line: LINE_SPACING_BODY,
          lineRule: 'auto',
          after: SPACING_BETWEEN_BULLETS,
        },
        children: [
          bodyRun(e.company, { bold: true }),
          bodyRun('  ·  '),
          bodyRun(e.title, { italic: true }),
          bodyRun('  |  '),
          bodyRun(e.dates),
        ],
      }),
    );
  }
  return out;
}

function buildSkills(skills: string[], toolsStack: string | undefined, includeStack: boolean): Paragraph[] {
  if (skills.length === 0 && !toolsStack) return [];
  const out: Paragraph[] = [sectionHeader('Skills')];
  if (skills.length > 0) {
    out.push(bodyParagraph(skills.join(' · ')));
  }
  if (includeStack && toolsStack && toolsStack.trim()) {
    out.push(
      new Paragraph({
        spacing: { line: LINE_SPACING_BODY, lineRule: 'auto', after: SPACING_BETWEEN_BULLETS, before: SPACING_BETWEEN_BULLETS },
        children: [bodyRun('Tools & Stack: ', { bold: true }), bodyRun(toolsStack.trim())],
      }),
    );
  }
  return out;
}

function buildEducation(education: UpdraftMod['education']): Paragraph[] {
  if (education.length === 0) return [];
  const out: Paragraph[] = [sectionHeader('Education')];
  for (const e of education) {
    const dateBit =
      e.start_year && e.end_year
        ? `  |  ${e.start_year} – ${e.end_year}`
        : e.end_year
          ? `  |  ${e.end_year}`
          : '';
    const degreeBit = e.degree ? `  ·  ${e.degree}` : '';
    out.push(
      bodyParagraph([
        bodyRun(e.institution, { bold: true }),
        bodyRun(degreeBit, { italic: true }),
        bodyRun(dateBit),
      ]),
    );
  }
  return out;
}

// MOD-only sections (spec says only the publishable resume goes through
// ATS rules; the MOD is the source-of-truth doc, can hold extra context).
function buildModDeepening(mod: UpdraftMod): Paragraph[] {
  const out: Paragraph[] = [];
  const hasAny =
    (mod.through_line && mod.through_line.trim()) ||
    (mod.tools_stack && mod.tools_stack.trim()) ||
    (mod.interview_objections && mod.interview_objections.length > 0) ||
    (mod.leadership_brand && mod.leadership_brand.trim()) ||
    (mod.transformation_arc && mod.transformation_arc.trim());
  if (!hasAny) return out;

  out.push(sectionHeader('MOD Notes'));

  if (mod.leadership_brand?.trim()) {
    out.push(
      bodyParagraph([bodyRun('Leadership brand: ', { bold: true }), bodyRun(mod.leadership_brand.trim())]),
    );
  }
  if (mod.transformation_arc?.trim()) {
    out.push(
      bodyParagraph([bodyRun('Transformation arc: ', { bold: true }), bodyRun(mod.transformation_arc.trim())]),
    );
  }
  if (mod.through_line?.trim()) {
    out.push(
      bodyParagraph([bodyRun('Cross-role through-line: ', { bold: true }), bodyRun(mod.through_line.trim())]),
    );
  }
  if (mod.tools_stack?.trim()) {
    out.push(
      bodyParagraph([bodyRun('Tools / stack: ', { bold: true }), bodyRun(mod.tools_stack.trim())]),
    );
  }
  if (mod.interview_objections && mod.interview_objections.length > 0) {
    out.push(bodyParagraph([bodyRun("Things you're tired of explaining:", { bold: true })]));
    for (const o of mod.interview_objections) {
      out.push(bulletParagraph(o));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------

function assembleDocument(children: Paragraph[]): Document {
  return new Document({
    creator: 'UpDraft by BAD Labs',
    description: 'Resume / Master Overview Document generated by UpDraft',
    styles: {
      default: {
        document: {
          run: { font: FONT_BODY, size: SIZE_BODY },
          paragraph: {
            spacing: { line: LINE_SPACING_BODY, lineRule: 'auto' },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'updraft-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',                // standard round bullet •
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: BULLET_INDENT, hanging: 200 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    MARGIN_TWIPS,
              right:  MARGIN_TWIPS,
              bottom: MARGIN_TWIPS,
              left:   MARGIN_TWIPS,
            },
          },
        },
        children,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export interface RenderArgs {
  mod: UpdraftMod;
  /** Optional target — provides headline for the resume. Ignored for MOD render. */
  target?: UpdraftTargetRole | null;
}

/**
 * Render the publishable resume — Classic / Regular template.
 * Section order per spec § Resume Section Structure.
 */
export async function renderResumeDocx(args: RenderArgs): Promise<Buffer> {
  const headline = args.target?.role_title?.trim() || null;
  const children: Paragraph[] = [
    ...buildHeader(args.mod.identity, headline),
    ...buildSummary(args.mod.summary),
    ...buildKeyOutcomes(args.mod),
    ...buildExperienceSection(args.mod.experience),
    ...buildEarlierCareer(args.mod.earlier_career),
    // Skills section: tools_stack appended only on the MOD render
    // (publishable resume keeps a tighter, single skills line).
    ...buildSkills(args.mod.skills, args.mod.tools_stack, /* includeStack */ false),
    ...buildEducation(args.mod.education),
  ];
  const doc = assembleDocument(children);
  return Packer.toBuffer(doc);
}

/**
 * Render the Master Overview Document — same Classic primitives but
 * carries the deepening notes that don't go on the publishable resume.
 */
export async function renderModDocx(args: RenderArgs): Promise<Buffer> {
  const children: Paragraph[] = [
    ...buildHeader(args.mod.identity, /* headline */ null),
    ...buildSummary(args.mod.summary),
    ...buildKeyOutcomes(args.mod),
    ...buildExperienceSection(args.mod.experience),
    ...buildEarlierCareer(args.mod.earlier_career),
    ...buildSkills(args.mod.skills, args.mod.tools_stack, /* includeStack */ true),
    ...buildEducation(args.mod.education),
    ...buildModDeepening(args.mod),
  ];
  const doc = assembleDocument(children);
  return Packer.toBuffer(doc);
}
