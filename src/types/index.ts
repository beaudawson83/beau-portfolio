export interface Metric {
  label: string;
  value: string;
  context: string;
  source: string;
}

export interface Experience {
  yearRange: string;
  company: string;
  role: string;
  context?: string;
  impacts: string[];
  tech?: string[];
  highlights?: string[];
  isLegacy?: boolean;
}

export interface Skill {
  category: string;
  items: string[];
}

export interface BadLabsFeature {
  title: string;
  description: string;
}

export type ContactObjective =
  | 'full-time'
  | 'fractional'
  | 'project'
  | 'consulting'
  | 'speaking'
  | 'connecting';

export const OBJECTIVE_LABELS: Record<ContactObjective, string> = {
  'full-time': 'Full-Time Director',
  'fractional': 'Fractional Deployment',
  'project': 'Project-Based Engagement',
  'consulting': 'Consulting / Advisory',
  'speaking': 'Speaking / Workshop',
  'connecting': 'Just Connecting',
};

export interface ContactFormData {
  name: string;
  objective: ContactObjective;
  message: string;
}

export interface SocialLink {
  label: string;
  url: string;
  type: 'linkedin' | 'phone' | 'email';
}

// ============================================
// Chatbot Types (AskBeau component and API)
// ============================================

export interface ChatMessage {
  type: 'question' | 'response';
  text: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

// Boot sequence for terminal animation
export interface BootLine {
  type: 'command' | 'output';
  text: string;
  highlight?: boolean;
}

// ============================================
// Blog (Terminal Notebook)
// ============================================

export type BlogPostStatus = 'draft' | 'scheduled' | 'published';
// Categories are user-defined; the four below are seeded as starter
// suggestions in the editor dropdown. Any non-empty string is accepted at
// the API + storage layer (normalized to uppercase, ≤32 chars).
export type BlogCategory = string;
export const CATEGORY_SUGGESTIONS: readonly string[] = ['OPS', 'AI', 'CRAFT', 'NOTE'];
export type BlogCoverId =
  | 'cover-mesh'
  | 'cover-grid'
  | 'cover-stripe'
  | 'cover-photo'
  | 'none';

// Discriminated union of every block type the editor can produce.
// `id` is a stable per-block key the editor uses for React reconciliation,
// drag-reorder, and slash-menu anchoring; it is persisted with the body.
type BlockBase = { id: string };

export type BlogBlock =
  | (BlockBase & { type: 'h1' | 'h2' | 'h3' | 'p'; content: string })
  | (BlockBase & { type: 'ul' | 'ol'; content: string[] })
  | (BlockBase & { type: 'pullquote'; content: { text: string; attr?: string } })
  | (BlockBase & {
      type: 'callout';
      content: { kind: 'info' | 'warn' | 'success' | 'note'; title?: string; text: string };
    })
  | (BlockBase & { type: 'divider'; content: 'line' | 'dots' })
  | (BlockBase & { type: 'image'; content: { caption?: string; label?: string; url?: string } })
  | (BlockBase & { type: 'gallery'; content: { items: string[]; caption?: string } })
  | (BlockBase & { type: 'video'; content: { caption?: string; label?: string; url?: string } })
  | (BlockBase & { type: 'audio'; content: { title?: string; duration?: string; url?: string } })
  | (BlockBase & {
      type: 'code';
      content: { language?: string; filename?: string; body: string };
    })
  | (BlockBase & {
      type: 'table';
      content: { headers: string[]; rows: string[][] };
    })
  | (BlockBase & {
      type: 'chart';
      content: {
        title?: string;
        unit?: string;
        data: { label: string; value: number; highlight?: boolean }[];
      };
    })
  | (BlockBase & {
      type: 'wordart';
      content: { text: string; variant?: 'gradient' | 'outline' | 'fill' | 'chrome' };
    })
  | (BlockBase & {
      type: 'embed';
      content: {
        kind: 'tweet';
        author?: string;
        handle?: string;
        content?: string;
        time?: string;
        stat?: { likes?: number; retweets?: number; views?: string };
      };
    })
  | (BlockBase & { type: 'button'; content: string })
  | (BlockBase & { type: 'twocol'; content: { left?: string; right?: string } });

export type BlogBlockType = BlogBlock['type'];

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: BlogCategory | null;
  tags: string[];
  coverId: BlogCoverId;
  coverUrl: string | null;
  body: BlogBlock[];
  wordCount: number;
  readTime: number;
  seoDescription: string;
  status: BlogPostStatus;
  publishAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Lightweight summary used by the index list — same shape minus `body`.
export type BlogPostSummary = Omit<BlogPost, 'body'>;

// Heading entry derived from h2/h3 blocks for the TOC.
export interface BlogHeading {
  id: string;
  label: string;
  depth: 2 | 3;
}

// ============================================
// MODULES — homepage control panel section
// ============================================

export type ModuleStatus = 'LIVE' | 'BETA' | 'PLANNED';

/** Static content per module. Lives in src/lib/data.ts. */
export interface ModuleEntry {
  id: 'conflict' | 'blog';
  name: string;
  description: string;
  href: string;
  status: ModuleStatus;
}

/** Live telemetry pulled from Supabase per render. `null` if unavailable. */
export interface ConflictTelemetry {
  active: number;
  lastIngest: string | null;
}

export interface BlogTelemetry {
  posts: number;
  latest: string | null;
}

export interface ModuleTelemetry {
  conflict: ConflictTelemetry | null;
  blog: BlogTelemetry | null;
}

// =============================================================================
// UpDraft (v0.1 — IN PROGRESS)
// Spec lives in skills/updraft/. Auth-gated resume + cover-letter generator.
// =============================================================================

export type UpdraftSessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type UpdraftPath = 'upload' | 'talk';
export type UpdraftTier = 1 | 2 | 3 | 4;

/** A logged-in UpDraft user. One row per email. */
export interface UpdraftUser {
  id: string;
  email: string;
  createdAt: string;
  activeModSessionId: string | null;
  deletedAt: string | null;
}

/** Summary view used on the dashboard. */
export interface UpdraftSessionSummary {
  id: string;
  status: UpdraftSessionStatus;
  tier: UpdraftTier | null;
  path: UpdraftPath | null;
  startedAt: string;
  completedAt: string | null;
  lastActivityAt: string;
  keepIndefinitely: boolean;
}

/**
 * Dashboard view-model: a session summary plus the few derived fields the
 * workspace list needs. Computed server-side from stage_outputs so the
 * dashboard can label rows (target role) and offer the active-MOD action
 * (hasMod) without shipping the full stage payloads to the client.
 */
export interface UpdraftDashboardSession extends UpdraftSessionSummary {
  /** True when stage_03 holds a generation-ready MOD (mod + ready_for_generation). */
  hasMod: boolean;
  /** Stage 02 target role title, when set. */
  targetRole: string | null;
  /** Stage 02 target company, when set. */
  targetCompany: string | null;
}

/** Full session record including stage outputs. */
export interface UpdraftSession extends UpdraftSessionSummary {
  userId: string;
  /**
   * Keyed by stage name: 'stage_01' | 'stage_02' | 'stage_03' | 'stage_04'.
   * Shape per stage is defined in skills/updraft/references/stage-*.md +
   * lib-output-contract.md. Treated as opaque here — orchestrator validates.
   */
  stageOutputs: Record<string, unknown>;
}

/** Append-only event log entry. See lib-output-contract.md § Event Types. */
export interface UpdraftEvent {
  id: number;
  sessionId: string;
  ts: string;
  stage: string | null;
  eventType: string;
  data: Record<string, unknown>;
}

/** Privacy-callout copy block — Beau-edited, sourced from PRIVACY-COPY.md. */
export interface UpdraftPrivacyCopy {
  heading: string;
  lede: string[];
  protections: {
    intro: string;
    introCitations: UpdraftCitation[];
    points: UpdraftPrivacyPoint[];
  };
  whyItMatters: { heading: string; body: string[] };
  footerMicrocopy: string;
}

export interface UpdraftCitation {
  label: string;
  href: string;
}

export interface UpdraftPrivacyPoint {
  heading: string;
  body: string;
  citations?: UpdraftCitation[];
}

// --- Resume parser (Stage 01.2A.ai output) -----------------------------------

export interface ParsedResumeIdentity {
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
}

export interface ParsedResumeExperience {
  company: string;
  title: string;
  start_date: string;          // YYYY-MM
  end_date: string;            // YYYY-MM | "Present"
  location: string | null;
  bullets: string[];
}

export interface ParsedResumeEducation {
  institution: string;
  degree: string | null;
  start_year: number | null;
  end_year: number | null;
}

/**
 * Output shape of SYS_RESUME_PARSER. Mirrors the schema in
 * skills/updraft/references/lib-system-prompts.md.
 */
export interface ParsedResume {
  identity: ParsedResumeIdentity;
  summary: string | null;
  experience: ParsedResumeExperience[];
  education: ParsedResumeEducation[];
  skills: string[];
}

// --- Stage 02: target + match analysis -----------------------------------

export type UpdraftDeliverable = 'mod' | 'jd_build' | 'cover_letter';

export type UpdraftConfidenceBand =
  | 'DIRECT'
  | 'TRANSFERABLE'
  | 'ADJACENT'
  | 'WEAK'
  | 'GAP';

export type UpdraftGapSeverity = 'critical' | 'major' | 'minor';

export interface UpdraftTargetRole {
  role_title: string;
  company: string;
  industry: string | null;
  seniority: string | null;
  location: string | null;
  compensation_range: string | null;
  jd_text: string;
}

export interface UpdraftSkillMatch {
  skill: string;
  match: boolean;
  evidence: string | null;
}

export interface UpdraftRedFlag {
  type: string;
  description: string;
}

export interface UpdraftGap {
  requirement: string;
  severity: UpdraftGapSeverity;
}

export interface UpdraftExtractedTarget {
  role_title: string | null;
  company: string | null;
  industry: string | null;
  seniority: string | null;
  location: string | null;
  compensation_range: string | null;
}

// --- Stage 03: Master Overview Document ----------------------------------

export type UpdraftBulletSource = 'extracted' | 'rewritten' | 'new';

export interface UpdraftBullet {
  text: string;
  metric_present: boolean;
  source: UpdraftBulletSource;
  tags: string[];
}

export interface UpdraftStarStory {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface UpdraftRoleInMod {
  company: string;
  title: string;
  start_date: string;          // YYYY-MM
  end_date: string;            // YYYY-MM | "Present"
  location: string | null;
  context: string;
  bullets: UpdraftBullet[];
  star_stories?: UpdraftStarStory[];   // Tier 3+ deepening, deferred in v0.1
}

export interface UpdraftEarlierCareerEntry {
  company: string;
  title: string;
  dates: string;
}

export interface UpdraftSurfacedSkill {
  skill: string;
  evidence: string;
  confirmed: boolean;
}

export interface UpdraftValueAlignment {
  cause: string;
  narrative: string;
}

export interface UpdraftMod {
  identity: ParsedResumeIdentity;
  summary?: string;
  summary_seed?: string;
  experience: UpdraftRoleInMod[];
  earlier_career: UpdraftEarlierCareerEntry[];
  education: ParsedResumeEducation[];
  skills: string[];
  surfaced_skills?: UpdraftSurfacedSkill[];
  values_alignment?: UpdraftValueAlignment[];
  leadership_brand?: string;
  transformation_arc?: string;
  interview_objections?: string[];
  /** Tier 2 cross-role pattern statement (single sentence). */
  through_line?: string;
  /** Tier 2 tools / stack — free-form text, comma-separated tools. */
  tools_stack?: string;
}

export type UpdraftModMode = 'full' | 'lightweight';

// --- Stage 04: generation ----------------------------------------------------

export type UpdraftExportKind =
  | 'mod_docx'
  | 'mod_pdf'
  | 'mod_md'
  | 'resume_docx'
  | 'resume_pdf'
  | 'cl_docx'
  | 'cl_pdf';

export interface UpdraftExportFile {
  id: string;
  kind: UpdraftExportKind;
  filename: string;
  storagePath: string;
  mime: string;
  bytes: number;
  generatedAt: string;
}

export type UpdraftLintCategory =
  | 'generic_opener'
  | 'weak_verb'
  | 'keyword_stuffing'
  | 'ai_tell'
  | 'over_condensation'
  | 'filler_adjective'
  | 'vague_quantifier'
  | 'unsupported_superlative';

export interface UpdraftLintFlag {
  category: UpdraftLintCategory;
  location: string;        // e.g. "experience[0].bullets[2]" or "summary"
  excerpt: string;         // the matched snippet (capped at ~80 chars)
  pattern: string;         // human-readable description of what tripped
}

export type UpdraftTemplate = 'classic' | 'modern' | 'structured' | 'creative';
export type UpdraftDensity = 'compact' | 'regular' | 'comfy';

/** Output shape of SYS_MATCH_ANALYZER. */
export interface UpdraftMatchAnalysis {
  overall_match_pct: number | null;
  required_skills: UpdraftSkillMatch[];
  preferred_skills: UpdraftSkillMatch[];
  soft_skills: string[];
  industry_terms: string[];
  red_flags: UpdraftRedFlag[];
  gaps: UpdraftGap[];
  strengths_to_emphasize: string[];
  confidence_band: UpdraftConfidenceBand | null;
  /**
   * Target role metadata extracted from the JD by the analyzer in the same
   * call. Lets the user paste a JD (or fuzzy description) without having to
   * also retype the role title, company, industry, etc. by hand. Optional for
   * read-back compatibility with sessions persisted before this field landed.
   */
  extracted_target?: UpdraftExtractedTarget | null;
}
