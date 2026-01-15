'use client';

import { useState, useEffect, useMemo } from 'react';
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
  duration = 2000,
  as: Tag = 'span',
}: GlitchTextProps) {
  const [displayText, setDisplayText] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const characters = useMemo(() => text.split(''), [text]);

  useEffect(() => {
    // Initialize with random characters
    setDisplayText(
      characters.map((char) =>
        char === ' ' ? ' ' : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      )
    );

    // Start animation after delay
    const startTimeout = setTimeout(() => {
      setIsAnimating(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [characters, delay]);

  useEffect(() => {
    if (!isAnimating) return;

    const charDelay = duration / characters.length;
    const intervals: NodeJS.Timeout[] = [];

    characters.forEach((targetChar, index) => {
      if (targetChar === ' ') {
        // Skip spaces
        return;
      }

      // Each character goes through scramble phase then locks
      const lockTime = index * charDelay;
      const scrambleIterations = 8 + Math.floor(Math.random() * 5);
      const scrambleInterval = lockTime / scrambleIterations;

      for (let i = 0; i < scrambleIterations; i++) {
        const timeout = setTimeout(() => {
          setDisplayText((prev) => {
            const newText = [...prev];
            if (i < scrambleIterations - 1) {
              // Random character
              newText[index] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            } else {
              // Final character
              newText[index] = targetChar;
            }
            return newText;
          });
        }, i * scrambleInterval + index * 20);

        intervals.push(timeout);
      }
    });

    // Mark complete
    const completeTimeout = setTimeout(() => {
      setIsComplete(true);
      setDisplayText(characters);
    }, duration + characters.length * 20);

    intervals.push(completeTimeout);

    return () => {
      intervals.forEach(clearTimeout);
    };
  }, [isAnimating, characters, duration]);

  // Occasional glitch after completion
  useEffect(() => {
    if (!isComplete) return;

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        // Brief glitch on random character
        const glitchIndex = Math.floor(Math.random() * characters.length);
        if (characters[glitchIndex] !== ' ') {
          setDisplayText((prev) => {
            const newText = [...prev];
            newText[glitchIndex] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
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
    }, 100);

    return () => clearInterval(glitchInterval);
  }, [isComplete, characters]);

  return (
    <Tag className={className}>
      {displayText.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            color: char === characters[index] ? undefined : '#7C3AED',
          }}
          transition={{ duration: 0.1 }}
          style={{
            display: 'inline-block',
            minWidth: char === ' ' ? '0.3em' : undefined,
            textShadow:
              char !== characters[index]
                ? '0 0 10px rgba(124, 58, 237, 0.8), 2px 0 rgba(255, 0, 0, 0.3), -2px 0 rgba(0, 255, 255, 0.3)'
                : undefined,
          }}
        >
          {char}
        </motion.span>
      ))}
    </Tag>
  );
}
