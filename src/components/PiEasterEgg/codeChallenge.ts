import { CodeChallenge } from './types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';

function getRandomChar(chars: string): string {
  return chars[Math.floor(Math.random() * chars.length)];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateCodeChallenge(): CodeChallenge {
  // Generate 2 random letters and 4 random numbers
  const letters: string[] = [
    getRandomChar(LETTERS),
    getRandomChar(LETTERS),
  ];
  const numbers: string[] = [
    getRandomChar(NUMBERS),
    getRandomChar(NUMBERS),
    getRandomChar(NUMBERS),
    getRandomChar(NUMBERS),
  ];

  // Combine and shuffle for the prompt
  const combined = [...letters, ...numbers];
  const shuffled = shuffleArray(combined);
  const prompt = shuffled.join('');

  // Sort letters A-Z, then numbers 0-9 for the answer
  const sortedLetters = [...letters].sort();
  const sortedNumbers = [...numbers].sort((a, b) => parseInt(a) - parseInt(b));
  const answer = [...sortedLetters, ...sortedNumbers].join('');

  return { prompt, answer };
}

export function validateCodeResponse(userInput: string, answer: string): boolean {
  return userInput.toUpperCase().trim() === answer;
}
