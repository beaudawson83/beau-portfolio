// Pure helpers for the blog — block traversal, slugification, derived metrics.

import type { BlogBlock, BlogHeading, BlogPostStatus } from '@/types';

const WORDS_PER_MINUTE = 220;

/** Walk every text-bearing field in a block and yield each string. */
function* blockText(b: BlogBlock): Generator<string> {
  switch (b.type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'p':
    case 'button':
      yield b.content;
      return;
    case 'ul':
    case 'ol':
      for (const item of b.content) yield item;
      return;
    case 'pullquote':
      yield b.content.text;
      if (b.content.attr) yield b.content.attr;
      return;
    case 'callout':
      if (b.content.title) yield b.content.title;
      yield b.content.text;
      return;
    case 'image':
    case 'video':
      if (b.content.caption) yield b.content.caption;
      return;
    case 'gallery':
      if (b.content.caption) yield b.content.caption;
      for (const item of b.content.items) yield item;
      return;
    case 'audio':
      if (b.content.title) yield b.content.title;
      return;
    case 'code':
      yield b.content.body;
      return;
    case 'table':
      for (const h of b.content.headers) yield h;
      for (const row of b.content.rows) for (const c of row) yield c;
      return;
    case 'chart':
      if (b.content.title) yield b.content.title;
      for (const d of b.content.data) yield d.label;
      return;
    case 'wordart':
      yield b.content.text;
      return;
    case 'embed':
      if (b.content.content) yield b.content.content;
      return;
    case 'twocol':
      if (b.content.left) yield b.content.left;
      if (b.content.right) yield b.content.right;
      return;
    case 'divider':
      return;
  }
}

export function computeWordCount(blocks: BlogBlock[], title = '', dek = ''): number {
  const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
  let total = count(title) + count(dek);
  for (const b of blocks) for (const s of blockText(b)) total += count(s);
  return total;
}

export function computeReadTime(blocks: BlogBlock[], title = '', dek = ''): number {
  const words = computeWordCount(blocks, title, dek);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Derive a TOC from h2/h3 blocks. The id is stable across renders so
 * scrollspy and anchor links match.
 */
export function deriveHeadings(blocks: BlogBlock[]): BlogHeading[] {
  const headings: BlogHeading[] = [];
  for (const b of blocks) {
    if (b.type === 'h2' || b.type === 'h3') {
      headings.push({
        id: slugifyHeading(b.id, b.content),
        label: b.content || (b.type === 'h2' ? 'Untitled section' : 'Untitled subsection'),
        depth: b.type === 'h2' ? 2 : 3,
      });
    }
  }
  return headings;
}

/** Stable id for a heading anchor: prefer slug of label; fall back to block id. */
export function slugifyHeading(blockId: string, label: string): string {
  const fromLabel = slugify(label);
  return fromLabel || blockId;
}

/** URL-safe slug: lowercase, ascii-ish, hyphen-separated. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const STATUS_VALUES: ReadonlySet<BlogPostStatus> = new Set([
  'draft',
  'scheduled',
  'published',
]);

export function isBlogPostStatus(s: unknown): s is BlogPostStatus {
  return typeof s === 'string' && STATUS_VALUES.has(s as BlogPostStatus);
}

/**
 * Generate a fresh placeholder slug for a brand-new post. The user can
 * change it in the editor sidebar before publishing.
 */
export function newPlaceholderSlug(): string {
  // 6-char alphanumeric — collisions are unlikely at our scale and the
  // unique constraint on slug catches any anyway.
  const rand = Math.random().toString(36).slice(2, 8);
  return `untitled-${rand}`;
}
