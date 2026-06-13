// UpDraft PDF builder — Classic / Regular template, native generation.
//
// Generates the PDF DIRECTLY from the same structured data the DOCX builder
// uses (the MOD object) via @react-pdf/renderer — NOT by converting the DOCX.
// UpDraft owns its templates, so there's no need for a DOCX→PDF rendering
// engine (LibreOffice / Drive / a paid service). This is the PDF sibling of
// docx-builder.ts: same Classic / Regular look (Times, 1" margins, single
// column, bold uppercase headers, bulleted experience), produced free and
// natively on Vercel with a real selectable text layer (ATS-safe).
//
// Layout parity with docx-builder.ts: that file works in half-points (font)
// and twips (spacing); here we use PDF points (72pt = 1"). Equivalents:
//   - body 11pt · section header 12pt bold · name 18pt bold ·
//     key-outcome number 16pt bold · key-outcome label 11pt italic
//   - 1" page padding · 1.3× line height · 12pt section gap · 6pt header gap ·
//     4pt inter-bullet gap · 0.25" bullet indent
//
// Built-in PDF standard fonts Times-Roman / Times-Bold / Times-Italic /
// Times-BoldItalic match docx-builder's "Times New Roman" with zero font
// files to bundle — the reason this Just Works in serverless.

import 'server-only';
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type {
  ParsedResumeIdentity,
  UpdraftEarlierCareerEntry,
  UpdraftMod,
  UpdraftRoleInMod,
  UpdraftTargetRole,
} from '@/types';
import {
  extractKeyOutcomesFromBullets,
  formatDateRange,
  type KeyOutcome,
} from './docx-builder';

// ---------------------------------------------------------------------------
// Styles (Classic / Regular)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.3,
    paddingTop: 72,
    paddingBottom: 72,
    paddingHorizontal: 72,
    color: '#000000',
  },
  name: { fontSize: 18, fontFamily: 'Times-Bold', textAlign: 'center', marginBottom: 6 },
  headline: { fontSize: 11, fontFamily: 'Times-Italic', textAlign: 'center', marginBottom: 6 },
  contact: { fontSize: 11, textAlign: 'center', marginBottom: 12 },
  sectionHeader: { fontSize: 12, fontFamily: 'Times-Bold', marginTop: 12, marginBottom: 6 },
  para: { marginBottom: 4 },
  roleHeader: { marginTop: 6, marginBottom: 4 },
  bold: { fontFamily: 'Times-Bold' },
  italic: { fontFamily: 'Times-Italic' },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletDot: { width: 18 },
  bulletText: { flex: 1 },
  outcomeRow: { marginBottom: 4 },
  outcomeNumber: { fontSize: 16, fontFamily: 'Times-Bold' },
  outcomeLabel: { fontSize: 11, fontFamily: 'Times-Italic' },
});

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sections (mirror docx-builder.ts one-for-one)
// ---------------------------------------------------------------------------

function Header({
  identity,
  headline,
}: {
  identity: ParsedResumeIdentity;
  headline: string | null;
}) {
  const contactParts = [identity.email, identity.phone, identity.location, identity.linkedin]
    .filter((s): s is string => Boolean(s && s.trim() !== ''));
  return (
    <View>
      <Text style={styles.name}>{identity.name || '— name —'}</Text>
      {headline ? <Text style={styles.headline}>{headline}</Text> : null}
      {contactParts.length > 0 ? (
        <Text style={styles.contact}>{contactParts.join(' · ')}</Text>
      ) : null}
    </View>
  );
}

function Summary({ summary }: { summary: string | undefined }) {
  if (!summary || !summary.trim()) return null;
  return (
    <View>
      <SectionHeader label="Professional Summary" />
      <Text style={styles.para}>{summary.trim()}</Text>
    </View>
  );
}

function KeyOutcomes({ outcomes }: { outcomes: KeyOutcome[] }) {
  if (outcomes.length === 0) return null;
  return (
    <View>
      <SectionHeader label="Key Outcomes" />
      {outcomes.map((o, i) => (
        <Text key={i} style={styles.outcomeRow}>
          <Text style={styles.outcomeNumber}>{o.number}</Text>
          {'  '}
          <Text style={styles.outcomeLabel}>{o.label}</Text>
          {o.context ? <Text style={styles.outcomeLabel}>{`  —  ${o.context}`}</Text> : null}
        </Text>
      ))}
    </View>
  );
}

function Experience({ roles }: { roles: UpdraftRoleInMod[] }) {
  if (roles.length === 0) return null;
  return (
    <View>
      <SectionHeader label="Professional Experience" />
      {roles.map((role, i) => (
        <View key={i} wrap={false}>
          <Text style={styles.roleHeader}>
            <Text style={styles.bold}>{role.company}</Text>
            {'  ·  '}
            <Text style={styles.italic}>{role.title}</Text>
            {'  |  '}
            {formatDateRange(role.start_date, role.end_date)}
            {role.location ? `  ·  ${role.location}` : ''}
          </Text>
          {role.context && role.context.trim() ? (
            <Text style={styles.para}>{role.context.trim()}</Text>
          ) : null}
          {role.bullets
            .filter((b) => b.text.trim() !== '')
            .map((b, j) => (
              <Bullet key={j} text={b.text.trim()} />
            ))}
        </View>
      ))}
    </View>
  );
}

function EarlierCareer({ entries }: { entries: UpdraftEarlierCareerEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <View>
      <SectionHeader label="Earlier Career" />
      {entries.map((e, i) => (
        <Text key={i} style={styles.para}>
          <Text style={styles.bold}>{e.company}</Text>
          {'  ·  '}
          <Text style={styles.italic}>{e.title}</Text>
          {'  |  '}
          {e.dates}
        </Text>
      ))}
    </View>
  );
}

function Skills({
  skills,
  toolsStack,
  includeStack,
}: {
  skills: string[];
  toolsStack: string | undefined;
  includeStack: boolean;
}) {
  if (skills.length === 0 && !toolsStack) return null;
  return (
    <View>
      <SectionHeader label="Skills" />
      {skills.length > 0 ? <Text style={styles.para}>{skills.join(' · ')}</Text> : null}
      {includeStack && toolsStack && toolsStack.trim() ? (
        <Text style={styles.para}>
          <Text style={styles.bold}>Tools &amp; Stack: </Text>
          {toolsStack.trim()}
        </Text>
      ) : null}
    </View>
  );
}

function Education({ education }: { education: UpdraftMod['education'] }) {
  if (education.length === 0) return null;
  return (
    <View>
      <SectionHeader label="Education" />
      {education.map((e, i) => {
        const dateBit =
          e.start_year && e.end_year
            ? `  |  ${e.start_year} – ${e.end_year}`
            : e.end_year
              ? `  |  ${e.end_year}`
              : '';
        return (
          <Text key={i} style={styles.para}>
            <Text style={styles.bold}>{e.institution}</Text>
            {e.degree ? <Text style={styles.italic}>{`  ·  ${e.degree}`}</Text> : null}
            {dateBit}
          </Text>
        );
      })}
    </View>
  );
}

function LabeledLine({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.para}>
      <Text style={styles.bold}>{label} </Text>
      {value}
    </Text>
  );
}

function ModDeepening({ mod }: { mod: UpdraftMod }) {
  const objections = (mod.interview_objections ?? []).map((s) => s.trim()).filter(Boolean);
  const hasAny =
    (mod.through_line && mod.through_line.trim()) ||
    (mod.tools_stack && mod.tools_stack.trim()) ||
    objections.length > 0 ||
    (mod.leadership_brand && mod.leadership_brand.trim()) ||
    (mod.transformation_arc && mod.transformation_arc.trim());
  if (!hasAny) return null;
  return (
    <View>
      <SectionHeader label="MOD Notes" />
      {mod.leadership_brand?.trim() ? <LabeledLine label="Leadership brand:" value={mod.leadership_brand.trim()} /> : null}
      {mod.transformation_arc?.trim() ? <LabeledLine label="Transformation arc:" value={mod.transformation_arc.trim()} /> : null}
      {mod.through_line?.trim() ? <LabeledLine label="Cross-role through-line:" value={mod.through_line.trim()} /> : null}
      {mod.tools_stack?.trim() ? <LabeledLine label="Tools / stack:" value={mod.tools_stack.trim()} /> : null}
      {objections.length > 0 ? (
        <View>
          <Text style={styles.para}>
            <Text style={styles.bold}>Things you&apos;re tired of explaining:</Text>
          </Text>
          {objections.map((o, i) => (
            <Bullet key={i} text={o} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Public entry points — signatures mirror docx-builder.ts
// ---------------------------------------------------------------------------

export interface RenderArgs {
  mod: UpdraftMod;
  /** Optional target — provides the headline for the resume. Ignored for MOD. */
  target?: UpdraftTargetRole | null;
}

export async function renderResumePdf(args: RenderArgs): Promise<Buffer> {
  const headline = args.target?.role_title?.trim() || null;
  const outcomes = extractKeyOutcomesFromBullets(args.mod);
  const doc = (
    <Document creator="UpDraft by BAD Labs" title="Resume">
      <Page size="LETTER" style={styles.page}>
        <Header identity={args.mod.identity} headline={headline} />
        <Summary summary={args.mod.summary} />
        <KeyOutcomes outcomes={outcomes} />
        <Experience roles={args.mod.experience} />
        <EarlierCareer entries={args.mod.earlier_career} />
        <Skills skills={args.mod.skills} toolsStack={args.mod.tools_stack} includeStack={false} />
        <Education education={args.mod.education} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

export async function renderModPdf(args: RenderArgs): Promise<Buffer> {
  const outcomes = extractKeyOutcomesFromBullets(args.mod);
  const doc = (
    <Document creator="UpDraft by BAD Labs" title="Master Overview Document">
      <Page size="LETTER" style={styles.page}>
        <Header identity={args.mod.identity} headline={null} />
        <Summary summary={args.mod.summary} />
        <KeyOutcomes outcomes={outcomes} />
        <Experience roles={args.mod.experience} />
        <EarlierCareer entries={args.mod.earlier_career} />
        <Skills skills={args.mod.skills} toolsStack={args.mod.tools_stack} includeStack={true} />
        <Education education={args.mod.education} />
        <ModDeepening mod={args.mod} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

export interface RenderCoverLetterArgs {
  identity: ParsedResumeIdentity;
  greeting: string;
  paragraphs: string[];
  signoff: string;
  generatedAt?: Date;
}

function formatLetterDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function renderCoverLetterPdf(args: RenderCoverLetterArgs): Promise<Buffer> {
  const dateLine = formatLetterDate(args.generatedAt ?? new Date());
  const paragraphs = args.paragraphs.map((p) => p.trim()).filter(Boolean);
  const signoffParts = args.signoff.split('\n').map((s) => s.trim()).filter(Boolean);
  const doc = (
    <Document creator="UpDraft by BAD Labs" title="Cover Letter">
      <Page size="LETTER" style={styles.page}>
        <Header identity={args.identity} headline={null} />
        <Text style={{ marginBottom: 12 }}>{dateLine}</Text>
        <Text style={{ marginBottom: 12 }}>{args.greeting}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={{ marginBottom: 12 }}>
            {p}
          </Text>
        ))}
        {signoffParts.map((s, i) => (
          <Text key={i} style={{ marginBottom: i === signoffParts.length - 1 ? 0 : 4 }}>
            {s}
          </Text>
        ))}
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
