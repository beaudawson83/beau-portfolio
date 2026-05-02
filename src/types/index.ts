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
