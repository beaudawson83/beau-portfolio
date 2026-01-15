'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
  const [displayText, setDisplayText] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lockedCharsRef = useRef<boolean[]>([]);

  const characters = useMemo(() => text.split(''), [text]);

  // Get random glitch char - memoized
  const getRandomChar = useCallback(() => {
    return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
  }, []);

  useEffect(() => {
    // Initialize with random characters
    const initial = characters.map((char) =>
      char === ' ' ? ' ' : getRandomChar()
    );
    setDisplayText(initial);
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

  return (
    <Tag className={className}>
      {displayText.map((char, index) => {
        const isLocked = char === characters[index];
        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              minWidth: char === ' ' ? '0.3em' : undefined,
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
    </Tag>
  );
}
