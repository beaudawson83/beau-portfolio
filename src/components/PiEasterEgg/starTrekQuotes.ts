import { StarTrekQuote } from './types';

export const STAR_TREK_QUOTES: StarTrekQuote[] = [
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

export function getRandomQuote(excludeIds: string[] = []): StarTrekQuote {
  const available = STAR_TREK_QUOTES.filter(q => !excludeIds.includes(q.id));
  const pool = available.length > 0 ? available : STAR_TREK_QUOTES;
  return pool[Math.floor(Math.random() * pool.length)];
}
