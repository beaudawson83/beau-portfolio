// UpDraft export filename builder.
//
// Per spec lib-output-contract.md § Filename Conventions:
//   [LastName]_[Type]_[TargetRole?]_[Company?]_[Month][Year].[ext]
//
// Sanitization:
//   - Spaces removed in role/company segments
//   - Strip / \ : * ? < > | " ' & ,
//   - Role truncated to 30 chars, company to 20 chars

const STRIP_CHARS_RE = /[/\\:*?<>|"'&,]/g;

const MONTHS_3 = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function sanitizeSegment(s: string, maxLen: number): string {
  return s
    .replace(STRIP_CHARS_RE, '')
    .replace(/\s+/g, '')
    .slice(0, maxLen);
}

function lastNameFromIdentityName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'Resume';
  return sanitizeSegment(parts[parts.length - 1], 32) || 'Resume';
}

export type FilenameType = 'Resume' | 'CoverLetter' | 'MOD';

export interface BuildFilenameArgs {
  candidateName: string;             // mod.identity.name
  type: FilenameType;
  targetRole?: string | null;        // e.g. "Director of Customer Experience"
  company?: string | null;           // e.g. "Acme Corp"
  date?: Date;                       // defaults to now
  ext: 'docx' | 'pdf' | 'md';
}

/**
 * Builds the filename per spec.
 * Examples:
 *   Dawson_Resume_DirectorCustomerExperience_onX_Apr2026.docx
 *   Dawson_CoverLetter_VPCX_Relay_May2026.docx
 *   Dawson_MOD_May2026.docx
 */
export function buildExportFilename(args: BuildFilenameArgs): string {
  const lastName = lastNameFromIdentityName(args.candidateName);
  const date = args.date ?? new Date();
  const monthYear = `${MONTHS_3[date.getMonth()]}${date.getFullYear()}`;

  const parts: string[] = [lastName, args.type];

  // Role + company are spec'd as Resume/CoverLetter only — MOD omits them.
  if (args.type !== 'MOD') {
    if (args.targetRole && args.targetRole.trim()) {
      parts.push(sanitizeSegment(args.targetRole, 30) || 'Role');
    }
    if (args.company && args.company.trim()) {
      parts.push(sanitizeSegment(args.company, 20) || 'Company');
    }
  }

  parts.push(monthYear);
  return `${parts.join('_')}.${args.ext}`;
}
