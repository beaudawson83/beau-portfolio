import 'server-only';

export type PublicStarTrekQuote = {
  id: string;
  partial: string;
  options: Array<{ label: string; text: string }>;
  character: string;
  source: string;
};

type FullStarTrekQuote = PublicStarTrekQuote & { correctAnswer: string };

const QUOTES: FullStarTrekQuote[] = [
  {
    id: 'spock-needs',
    partial: 'The needs of the many...',
    options: [
      { label: 'A', text: '...outweigh the needs of the few.' },
      { label: 'B', text: '...must be considered first.' },
      { label: 'C', text: '...are logical.' },
      { label: 'D', text: '...come before the one.' },
    ],
    correctAnswer: 'A',
    character: 'Spock',
    source: 'Star Trek II: The Wrath of Khan',
  },
  {
    id: 'picard-make-it',
    partial: 'Make it...',
    options: [
      { label: 'A', text: '...happen.' },
      { label: 'B', text: '...so.' },
      { label: 'C', text: '...done.' },
      { label: 'D', text: '...work.' },
    ],
    correctAnswer: 'B',
    character: 'Picard',
    source: 'Star Trek: The Next Generation',
  },
  {
    id: 'khan-revenge',
    partial: 'Revenge is a dish best served...',
    options: [
      { label: 'A', text: '...swift.' },
      { label: 'B', text: '...cold.' },
      { label: 'C', text: '...alone.' },
      { label: 'D', text: '...in darkness.' },
    ],
    correctAnswer: 'B',
    character: 'Khan',
    source: 'Star Trek II: The Wrath of Khan',
  },
  {
    id: 'borg-resistance',
    partial: 'Resistance is...',
    options: [
      { label: 'A', text: '...illogical.' },
      { label: 'B', text: '...expected.' },
      { label: 'C', text: '...futile.' },
      { label: 'D', text: '...irrelevant.' },
    ],
    correctAnswer: 'C',
    character: 'Borg',
    source: 'Star Trek: The Next Generation',
  },
  {
    id: 'kirk-space',
    partial: 'Space: the final...',
    options: [
      { label: 'A', text: '...frontier.' },
      { label: 'B', text: '...unknown.' },
      { label: 'C', text: '...challenge.' },
      { label: 'D', text: '...horizon.' },
    ],
    correctAnswer: 'A',
    character: 'Kirk',
    source: 'Star Trek: The Original Series',
  },
];

export function pickQuote(excludeIds: string[] = []): FullStarTrekQuote {
  const available = QUOTES.filter(q => !excludeIds.includes(q.id));
  const pool = available.length > 0 ? available : QUOTES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function stripAnswer(q: FullStarTrekQuote): PublicStarTrekQuote {
  const { correctAnswer: _unused, ...publicFields } = q;
  void _unused;
  return publicFields;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';

function randomChar(chars: string): string {
  return chars[Math.floor(Math.random() * chars.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function generateCodeChallenge(): { prompt: string; answer: string } {
  const letters = [randomChar(LETTERS), randomChar(LETTERS)];
  const numbers = [
    randomChar(NUMBERS),
    randomChar(NUMBERS),
    randomChar(NUMBERS),
    randomChar(NUMBERS),
  ];
  const prompt = shuffle([...letters, ...numbers]).join('');
  const sortedLetters = [...letters].sort();
  const sortedNumbers = [...numbers].sort((a, b) => parseInt(a) - parseInt(b));
  const answer = [...sortedLetters, ...sortedNumbers].join('');
  return { prompt, answer };
}

export function normalizeCodeAnswer(input: string): string {
  return input.toUpperCase().trim();
}
