// Block catalog used by the slash menu + ⌘K palette + sample-content map.

import type { BlogBlockType } from '@/types';

export interface BlockKind {
  type: BlogBlockType;
  label: string;
  desc: string;
  icon: string;
  cat: 'text' | 'media' | 'rich';
}

export const BLOCK_KINDS: BlockKind[] = [
  { type: 'h1', label: 'Heading 1', desc: 'Big section title', icon: 'H1', cat: 'text' },
  { type: 'h2', label: 'Heading 2', desc: 'Medium section title', icon: 'H2', cat: 'text' },
  { type: 'h3', label: 'Heading 3', desc: 'Small section title', icon: 'H3', cat: 'text' },
  { type: 'p', label: 'Paragraph', desc: 'Plain body text', icon: '¶', cat: 'text' },
  { type: 'ul', label: 'Bulleted list', desc: '• one, two, three', icon: '•', cat: 'text' },
  { type: 'ol', label: 'Numbered list', desc: '1. ordered', icon: '1.', cat: 'text' },
  { type: 'pullquote', label: 'Pull quote', desc: 'Highlighted quote', icon: '"', cat: 'text' },
  { type: 'callout', label: 'Callout', desc: 'Info / warn / success', icon: 'i', cat: 'text' },
  { type: 'divider', label: 'Divider', desc: 'Section break', icon: '—', cat: 'text' },
  { type: 'image', label: 'Image', desc: 'Single image w/ caption', icon: '⌘', cat: 'media' },
  { type: 'gallery', label: 'Gallery', desc: 'Image carousel', icon: '⊞', cat: 'media' },
  { type: 'video', label: 'Video', desc: 'YouTube / Vimeo / upload', icon: '▶', cat: 'media' },
  { type: 'audio', label: 'Audio', desc: 'Audio note / podcast', icon: '♪', cat: 'media' },
  { type: 'code', label: 'Code block', desc: 'Syntax-highlighted', icon: '<>', cat: 'rich' },
  { type: 'table', label: 'Table', desc: 'Rows and columns', icon: '⊟', cat: 'rich' },
  { type: 'chart', label: 'Chart', desc: 'Bar / data viz', icon: '▎', cat: 'rich' },
  { type: 'wordart', label: 'Word art', desc: 'Stylized big text', icon: 'A', cat: 'rich' },
  { type: 'embed', label: 'Embed', desc: 'Tweet / link / iframe', icon: '⎘', cat: 'rich' },
  { type: 'button', label: 'CTA button', desc: 'Call-to-action', icon: '⏵', cat: 'rich' },
  { type: 'twocol', label: 'Two columns', desc: 'Side-by-side layout', icon: '⫴', cat: 'rich' },
];

// Stable id generator for new blocks.
export function makeBlockId(): string {
  return 'b_' + Math.random().toString(36).slice(2, 10);
}

// Default content per block type — used when inserting a new block.
import type { BlogBlock } from '@/types';

export function makeBlock(type: BlogBlockType): BlogBlock {
  const id = makeBlockId();
  switch (type) {
    case 'h1': return { id, type: 'h1', content: 'New section' };
    case 'h2': return { id, type: 'h2', content: 'New heading' };
    case 'h3': return { id, type: 'h3', content: 'Sub-heading' };
    case 'p':  return { id, type: 'p',  content: '' };
    case 'ul': return { id, type: 'ul', content: ['First item', 'Second item', 'Third item'] };
    case 'ol': return { id, type: 'ol', content: ['First step', 'Second step', 'Third step'] };
    case 'pullquote':
      return { id, type: 'pullquote', content: { text: 'A quote that matters.', attr: 'source' } };
    case 'callout':
      return { id, type: 'callout', content: { kind: 'info', title: 'Note', text: 'Something important to know.' } };
    case 'divider': return { id, type: 'divider', content: 'line' };
    case 'image':   return { id, type: 'image', content: { caption: 'Caption goes here', label: 'image' } };
    case 'gallery': return { id, type: 'gallery', content: { items: ['shot 01', 'shot 02', 'shot 03'], caption: '' } };
    case 'video':   return { id, type: 'video', content: { caption: '', label: 'video' } };
    case 'audio':   return { id, type: 'audio', content: { title: 'Audio note', duration: '03:24' } };
    case 'code':
      return { id, type: 'code', content: { language: 'typescript', filename: 'example.ts', body: '// your code here\nconst x = 42;' } };
    case 'table':
      return { id, type: 'table', content: { headers: ['Col A', 'Col B', 'Col C'], rows: [['1', '2', '3'], ['4', '5', '6']] } };
    case 'chart':
      return {
        id,
        type: 'chart',
        content: {
          title: 'Sample data',
          unit: '',
          data: [
            { label: 'Q1', value: 40 },
            { label: 'Q2', value: 65, highlight: true },
            { label: 'Q3', value: 80, highlight: true },
            { label: 'Q4', value: 55 },
          ],
        },
      };
    case 'wordart':
      return { id, type: 'wordart', content: { text: 'BIG IDEA', variant: 'gradient' } };
    case 'embed':
      return { id, type: 'embed', content: { kind: 'tweet', author: 'Beau Dawson', handle: 'beaudaw', content: 'Your tweet here.' } };
    case 'button':  return { id, type: 'button', content: 'Click me' };
    case 'twocol':  return { id, type: 'twocol', content: { left: 'Left column.', right: 'Right column.' } };
  }
}
