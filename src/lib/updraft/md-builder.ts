// UpDraft — Markdown builder for the Master Overview Document.
//
// Renders the MOD as clean Markdown (.md). Mirrors the section order of
// renderModDocx in docx-builder.ts: header, summary, key outcomes,
// experience, earlier career, skills, education, MOD deepening notes.
//
// Pure string concatenation — no external dependencies. Returns a Buffer
// for upload consistency with the DOCX/PDF paths.

import 'server-only';
import { extractKeyOutcomesFromBullets } from './docx-builder';
import type {
  UpdraftMod,
  UpdraftRoleInMod,
  UpdraftEarlierCareerEntry,
  ParsedResumeEducation,
  ParsedResumeIdentity,
} from '@/types';

export function renderModMarkdown(args: { mod: UpdraftMod }): Buffer {
  const { mod } = args;
  const lines: string[] = [];

  lines.push(...buildHeader(mod.identity));
  lines.push(...buildSummary(mod.summary));
  lines.push(...buildKeyOutcomes(mod));
  lines.push(...buildExperience(mod.experience));
  lines.push(...buildEarlierCareer(mod.earlier_career));
  lines.push(...buildSkills(mod.skills, mod.tools_stack));
  lines.push(...buildEducation(mod.education));
  lines.push(...buildDeepening(mod));

  return Buffer.from(lines.join('\n'), 'utf-8');
}

function buildHeader(id: ParsedResumeIdentity): string[] {
  const lines: string[] = [];
  lines.push(`# ${id.name}`);
  lines.push('');
  const contact: string[] = [];
  if (id.email) contact.push(id.email);
  if (id.phone) contact.push(id.phone);
  if (id.location) contact.push(id.location);
  if (id.linkedin) contact.push(id.linkedin);
  if (contact.length > 0) {
    lines.push(contact.join('  ·  '));
    lines.push('');
  }
  return lines;
}

function buildSummary(summary: string | undefined): string[] {
  if (!summary?.trim()) return [];
  return ['## Summary', '', summary.trim(), ''];
}

function buildKeyOutcomes(mod: UpdraftMod): string[] {
  const outcomes = extractKeyOutcomesFromBullets(mod);
  if (outcomes.length === 0) return [];
  const lines: string[] = ['## Key Outcomes', ''];
  for (const o of outcomes) {
    const ctx = o.context ? `  —  ${o.context}` : '';
    lines.push(`- **${o.number}** ${o.label}${ctx}`);
  }
  lines.push('');
  return lines;
}

function formatDateRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

function buildExperience(roles: UpdraftRoleInMod[]): string[] {
  if (roles.length === 0) return [];
  const lines: string[] = ['## Professional Experience', ''];
  for (const role of roles) {
    const dateRange = formatDateRange(role.start_date, role.end_date);
    const loc = role.location ? `  ·  ${role.location}` : '';
    lines.push(`### ${role.company}  ·  ${role.title}`);
    lines.push(`${dateRange}${loc}`);
    lines.push('');
    if (role.context?.trim()) {
      lines.push(`*${role.context.trim()}*`);
      lines.push('');
    }
    for (const b of role.bullets) {
      lines.push(`- ${b.text}`);
    }
    lines.push('');
  }
  return lines;
}

function buildEarlierCareer(entries: UpdraftEarlierCareerEntry[]): string[] {
  if (entries.length === 0) return [];
  const lines: string[] = ['## Earlier Career', ''];
  for (const e of entries) {
    lines.push(`- **${e.company}** — ${e.title} (${e.dates})`);
  }
  lines.push('');
  return lines;
}

function buildSkills(skills: string[], toolsStack?: string): string[] {
  if (skills.length === 0 && !toolsStack?.trim()) return [];
  const lines: string[] = ['## Skills', ''];
  if (skills.length > 0) {
    lines.push(skills.join('  ·  '));
    lines.push('');
  }
  if (toolsStack?.trim()) {
    lines.push(`**Tools / Stack:** ${toolsStack.trim()}`);
    lines.push('');
  }
  return lines;
}

function buildEducation(edu: ParsedResumeEducation[]): string[] {
  if (edu.length === 0) return [];
  const lines: string[] = ['## Education', ''];
  for (const e of edu) {
    const degree = e.degree ? `${e.degree}, ` : '';
    const years =
      e.start_year && e.end_year
        ? ` (${e.start_year}–${e.end_year})`
        : e.end_year
          ? ` (${e.end_year})`
          : '';
    lines.push(`- ${degree}${e.institution}${years}`);
  }
  lines.push('');
  return lines;
}

function buildDeepening(mod: UpdraftMod): string[] {
  const objections = (mod.interview_objections ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const hasAny =
    mod.through_line?.trim() ||
    mod.tools_stack?.trim() ||
    objections.length > 0 ||
    mod.leadership_brand?.trim() ||
    mod.transformation_arc?.trim();
  if (!hasAny) return [];

  const lines: string[] = ['---', '', '## MOD Notes', ''];
  if (mod.leadership_brand?.trim()) {
    lines.push(`**Leadership brand:** ${mod.leadership_brand.trim()}`);
    lines.push('');
  }
  if (mod.transformation_arc?.trim()) {
    lines.push(`**Transformation arc:** ${mod.transformation_arc.trim()}`);
    lines.push('');
  }
  if (mod.through_line?.trim()) {
    lines.push(`**Cross-role through-line:** ${mod.through_line.trim()}`);
    lines.push('');
  }
  if (objections.length > 0) {
    lines.push("**Things you're tired of explaining:**");
    lines.push('');
    for (const o of objections) {
      lines.push(`- ${o}`);
    }
    lines.push('');
  }
  return lines;
}
