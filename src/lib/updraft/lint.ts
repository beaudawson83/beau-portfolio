// UpDraft anti-pattern lint pass — Phase 1 (regex detection).
//
// Scans assembled MOD / resume content for the 8 anti-pattern categories
// from skills/updraft/references/lib-anti-patterns.md. Pure deterministic;
// no model call. Returns a list of UpdraftLintFlag entries. The caller
// decides what to do with them — v0.1 surfaces them as warnings on the
// download page; v0.5 routes flagged items through SYS_ANTIPATTERN_REVIEWER
// (Phase 2) for AI rewriting before export.
//
// Phase 1 is deliberately conservative — it's better to under-flag than
// to false-positive on legitimate phrasing. Tightening happens in v0.5
// alongside the Phase 2 rewriter pass.

import type { UpdraftLintFlag, UpdraftMod } from '@/types';

const SNIPPET_MAX = 80;

function snippet(text: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 10);
  const end = Math.min(text.length, match.index + match[0].length + 10);
  let s = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (s.length > SNIPPET_MAX) s = s.slice(0, SNIPPET_MAX - 1) + '…';
  return s;
}

// 1. Generic openers
const GENERIC_OPENER_RE =
  /\b(Results-driven|Highly motivated|Detail-oriented|Self-starter|Goal-oriented|Hard-working|Dedicated|Passionate)\s+(professional|individual|team player|leader)\b/gi;

// 2. Weak verbs
const WEAK_VERBS_RE =
  /\b(Responsible for|Helped with|Helped to|Assisted in|Assisted with|Participated in|Involved in|Worked on|Was tasked with|Duties included|Tasked with)\b/gi;

// 4. AI-tells
const AI_TELL_RE =
  /\b(It['’]s worth noting that|Furthermore,|In today['’]s competitive landscape|Delve into|Leverage(?:d|s|ing)? my|Robust solutions|Cutting-edge|Innovative solutions|Synergize|Spearhead innovative)\b/gi;

// 6. Filler adjectives — adverb intensifiers + standalone banned adjectives
const ADVERB_INTENSIFIER_RE =
  /\b(very|really|quite|extremely|highly|truly|incredibly|fantastically|amazingly)\s+\w+\b/gi;
const FILLER_ADJECTIVE_STANDALONE_RE =
  /\b(innovative|dynamic|synergistic|cutting-edge|best-in-class)\b/gi;

// 7. Vague quantifiers
const VAGUE_QUANTIFIER_RE =
  /\b(many|several|various|multiple|numerous|countless|a number of|some)\s+(\w+)/gi;

// 8. Unsupported superlatives
const UNSUPPORTED_SUPERLATIVE_RE =
  /\b(best-in-class|world-class|industry-leading|top-tier|premier|elite|unparalleled|unmatched|exceptional|outstanding)\s+(\w+)/gi;

// Em-dash overuse (4. AI-tells, sub-pattern) — flag any text segment that
// contains 3+ em-dashes (— or --) within a single bullet/paragraph.
function emDashOveruseFlags(text: string, location: string): UpdraftLintFlag[] {
  const count = (text.match(/—|--/g) ?? []).length;
  if (count < 3) return [];
  return [
    {
      category: 'ai_tell',
      location,
      excerpt: text.slice(0, SNIPPET_MAX),
      pattern: `${count} em-dashes in one block — AI-tell pattern`,
    },
  ];
}

// 5. Over-condensation — heuristic: short bullets (< 6 words) that lack
// a verb in the first 4 tokens and contain banned noun-phrase patterns.
const OVER_CONDENSED_PATTERNS: RegExp[] = [
  /^stakeholder management/i,
  /^cross-functional collaboration/i,
  /^operational excellence/i,
  /^process optimization/i,
  /^continuous improvement/i,
  /^strategic alignment/i,
];

function overCondensationFlag(text: string, location: string): UpdraftLintFlag | null {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return null;
  if (words.length > 8) return null;
  for (const re of OVER_CONDENSED_PATTERNS) {
    if (re.test(text)) {
      return {
        category: 'over_condensation',
        location,
        excerpt: text.slice(0, SNIPPET_MAX),
        pattern: 'short bullet with no clear subject + verb',
      };
    }
  }
  return null;
}

// 3. Keyword stuffing — same noun phrase 3+ times in one section.
// Tokenizes into 1-2 word noun phrases (lowercased), counts, flags any
// at >= 3. Skips role titles / company names by design — caller passes
// the section text without titles.
function keywordStuffingFlags(
  sectionText: string,
  location: string,
): UpdraftLintFlag[] {
  // Lowercase, strip punctuation, split into tokens
  const tokens = sectionText
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"'`]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  // Count 1-word and 2-word phrases. Skip very common stopwords.
  const STOPWORDS = new Set([
    'a','an','and','as','at','be','by','for','from','in','is','it','of','on',
    'or','that','the','to','was','were','with','without','i','my','our','we',
    'their','they','this','these','those','which','who','whom','whose','his',
    'her','its','using','via','team','manager','engineer','analyst','company',
  ]);

  const counts = new Map<string, number>();
  const recordPhrase = (phrase: string) => {
    if (!phrase) return;
    if (phrase.split(' ').every((w) => STOPWORDS.has(w))) return;
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  };

  for (let i = 0; i < tokens.length; i++) {
    if (!STOPWORDS.has(tokens[i])) {
      recordPhrase(tokens[i]);
      if (i + 1 < tokens.length) {
        const two = `${tokens[i]} ${tokens[i + 1]}`;
        if (!STOPWORDS.has(tokens[i + 1])) recordPhrase(two);
      }
    }
  }

  const flags: UpdraftLintFlag[] = [];
  for (const [phrase, n] of counts.entries()) {
    if (n >= 3 && phrase.length >= 5) {
      flags.push({
        category: 'keyword_stuffing',
        location,
        excerpt: phrase,
        pattern: `phrase "${phrase}" appears ${n} times`,
      });
    }
  }
  return flags;
}

function regexFlags(
  text: string,
  location: string,
  re: RegExp,
  category: UpdraftLintFlag['category'],
  patternLabel: string,
): UpdraftLintFlag[] {
  if (!text) return [];
  re.lastIndex = 0;
  const flags: UpdraftLintFlag[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    flags.push({
      category,
      location,
      excerpt: snippet(text, m),
      pattern: `${patternLabel}: "${m[0]}"`,
    });
    if (re.lastIndex === m.index) re.lastIndex++;          // avoid zero-width loop
  }
  return flags;
}

function lintTextField(
  text: string,
  location: string,
): UpdraftLintFlag[] {
  if (!text) return [];
  const flags: UpdraftLintFlag[] = [];
  flags.push(...regexFlags(text, location, GENERIC_OPENER_RE,         'generic_opener',          'generic opener'));
  flags.push(...regexFlags(text, location, WEAK_VERBS_RE,             'weak_verb',               'weak verb'));
  flags.push(...regexFlags(text, location, AI_TELL_RE,                'ai_tell',                 'AI-tell phrase'));
  flags.push(...regexFlags(text, location, ADVERB_INTENSIFIER_RE,     'filler_adjective',        'adverb intensifier'));
  flags.push(...regexFlags(text, location, FILLER_ADJECTIVE_STANDALONE_RE, 'filler_adjective',   'standalone filler adjective'));
  flags.push(...regexFlags(text, location, VAGUE_QUANTIFIER_RE,       'vague_quantifier',        'vague quantifier'));
  flags.push(...regexFlags(text, location, UNSUPPORTED_SUPERLATIVE_RE,'unsupported_superlative', 'unsupported superlative'));
  flags.push(...emDashOveruseFlags(text, location));
  return flags;
}

// ---------------------------------------------------------------------------
// Top-level lint: walks a MOD and returns all flags found
// ---------------------------------------------------------------------------

export function lintMod(mod: UpdraftMod): UpdraftLintFlag[] {
  const flags: UpdraftLintFlag[] = [];

  // Summary — single text field
  if (mod.summary) flags.push(...lintTextField(mod.summary, 'summary'));

  // Per-role: context + each bullet, plus keyword-stuffing across the
  // role's combined content.
  mod.experience.forEach((role, i) => {
    if (role.context) {
      flags.push(...lintTextField(role.context, `experience[${i}].context`));
    }
    role.bullets.forEach((b, j) => {
      const loc = `experience[${i}].bullets[${j}]`;
      flags.push(...lintTextField(b.text, loc));
      const oc = overCondensationFlag(b.text, loc);
      if (oc) flags.push(oc);
    });
    // Keyword stuffing scoped per-role section: combine context + bullets
    const roleText = [
      role.context ?? '',
      ...role.bullets.map((b) => b.text),
    ].join('\n');
    flags.push(...keywordStuffingFlags(roleText, `experience[${i}]`));
  });

  // Skills section — only check for vague-quantifier + filler.
  // Most categories don't apply (they're prose-shaped).
  if (mod.skills.length > 0) {
    const skillsText = mod.skills.join(', ');
    flags.push(...regexFlags(
      skillsText,
      'skills',
      FILLER_ADJECTIVE_STANDALONE_RE,
      'filler_adjective',
      'standalone filler adjective',
    ));
  }

  return flags;
}
