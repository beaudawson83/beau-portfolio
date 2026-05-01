'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function makeScrambledChars(text: string): string[] {
  return text.split('').map((char) =>
    char === ' ' ? ' ' : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
  );
}

interface GlitchTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export default function GlitchText({
  text,
  className = '',
  delay = 0,
  duration = 1500, // Reduced from 2000
  as: Tag = 'span',
}: GlitchTextProps) {
  const [displayText, setDisplayText] = useState<string[]>(() => makeScrambledChars(text));
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lockedCharsRef = useRef<boolean[]>([]);

  // Reset state when text prop changes (render-phase pattern, not effect)
  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setDisplayText(makeScrambledChars(text));
    setIsComplete(false);
  }

  const characters = useMemo(() => text.split(''), [text]);

  // Get random glitch char - memoized
  const getRandomChar = useCallback(() => {
    return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
  }, []);

  useEffect(() => {
    lockedCharsRef.current = characters.map(() => false);

    // Start animation after delay using single rAF loop
    const startTimeout = setTimeout(() => {
      startTimeRef.current = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Batch update all characters at once
        setDisplayText(prev => {
          const newText = [...prev];
          let hasChanges = false;

          characters.forEach((targetChar, index) => {
            if (targetChar === ' ' || lockedCharsRef.current[index]) return;

            // Each character locks in sequence based on progress
            const charProgress = progress * characters.length;
            const shouldLock = index < charProgress;

            if (shouldLock) {
              if (newText[index] !== targetChar) {
                newText[index] = targetChar;
                lockedCharsRef.current[index] = true;
                hasChanges = true;
              }
            } else if (Math.random() > 0.7) {
              // Only scramble ~30% of chars per frame for performance
              newText[index] = getRandomChar();
              hasChanges = true;
            }
          });

          return hasChanges ? newText : prev;
        });

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayText(characters);
          setIsComplete(true);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [characters, delay, duration, getRandomChar]);

  // Occasional glitch after completion - reduced frequency
  useEffect(() => {
    if (!isComplete) return;

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.97) { // Reduced from 0.95
        const glitchIndex = Math.floor(Math.random() * characters.length);
        if (characters[glitchIndex] !== ' ') {
          setDisplayText((prev) => {
            const newText = [...prev];
            newText[glitchIndex] = getRandomChar();
            return newText;
          });

          setTimeout(() => {
            setDisplayText((prev) => {
              const newText = [...prev];
              newText[glitchIndex] = characters[glitchIndex];
              return newText;
            });
          }, 50);
        }
      }
    }, 200); // Reduced from 100ms

    return () => clearInterval(glitchInterval);
  }, [isComplete, characters, getRandomChar]);

  // Group characters into words so the browser wraps at word boundaries,
  // not between individual letter spans
  const words: { startIndex: number; chars: string[] }[] = [];
  let currentWord: { startIndex: number; chars: string[] } = { startIndex: 0, chars: [] };

  displayText.forEach((char, index) => {
    if (char === ' ' || characters[index] === ' ') {
      if (currentWord.chars.length > 0) {
        words.push(currentWord);
      }
      words.push({ startIndex: index, chars: [' '] });
      currentWord = { startIndex: index + 1, chars: [] };
    } else {
      if (currentWord.chars.length === 0) {
        currentWord.startIndex = index;
      }
      currentWord.chars.push(char);
    }
  });
  if (currentWord.chars.length > 0) {
    words.push(currentWord);
  }

  return (
    <Tag className={className}>
      {words.map((word) => {
        if (word.chars.length === 1 && word.chars[0] === ' ') {
          return <span key={`space-${word.startIndex}`}>{' '}</span>;
        }
        return (
          <span key={`word-${word.startIndex}`} style={{ whiteSpace: 'nowrap' }}>
            {word.chars.map((char, charIdx) => {
              const globalIndex = word.startIndex + charIdx;
              const isLocked = char === characters[globalIndex];
              return (
                <span
                  key={globalIndex}
                  style={{
                    display: 'inline-block',
                    color: isLocked ? undefined : '#7C3AED',
                    textShadow: !isLocked
                      ? '0 0 10px rgba(124, 58, 237, 0.8), 2px 0 rgba(255, 0, 0, 0.3), -2px 0 rgba(0, 255, 255, 0.3)'
                      : undefined,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}
