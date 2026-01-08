'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TerminalLine {
  type: 'command' | 'output' | 'empty';
  text: string;
  delay?: number;
}

const terminalSequence: TerminalLine[] = [
  { type: 'command', text: '$ beau --status' },
  { type: 'output', text: '> ROLE: Operations Director & AI Architect' },
  { type: 'output', text: '> LOCATION: Austin, TX' },
  { type: 'output', text: '> STATUS: Deployable' },
  { type: 'empty', text: '' },
  { type: 'command', text: '$ beau --impact', delay: 1500 },
  { type: 'output', text: '> REV_RECOVERED: $1,000,000+' },
  { type: 'output', text: '> ADMIN_OVERHEAD: -90%' },
  { type: 'output', text: '> WORKFLOWS_AUTOMATED: 47' },
  { type: 'empty', text: '' },
  { type: 'command', text: '$ beau --run optimize', delay: 1500 },
  { type: 'output', text: '> Analyzing workflows...' },
  { type: 'output', text: '> [████████████████░░░░] 80%' },
  { type: 'output', text: '> Bottleneck detected: manual_process_x' },
  { type: 'output', text: '> Deploying automation...' },
  { type: 'output', text: '> Status: COMPLETE' },
  { type: 'output', text: '> Efficiency gain: +340%' },
];

export default function TerminalAnimation() {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  const resetAnimation = useCallback(() => {
    setDisplayedLines([]);
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);
    setIsTyping(true);
  }, []);

  useEffect(() => {
    if (currentLineIndex >= terminalSequence.length) {
      // All lines typed, wait then reset
      const resetTimeout = setTimeout(() => {
        resetAnimation();
      }, 4000);
      return () => clearTimeout(resetTimeout);
    }

    const currentLine = terminalSequence[currentLineIndex];
    const text = currentLine.text;

    // Handle delay before starting new command
    if (currentCharIndex === 0 && currentLine.delay) {
      const delayTimeout = setTimeout(() => {
        setCurrentCharIndex(0);
        // Force re-render to continue
        setIsTyping(true);
      }, currentLine.delay);

      // Add a placeholder to track we're waiting
      if (!displayedLines[currentLineIndex]) {
        setDisplayedLines(prev => [...prev, '']);
      }
      return () => clearTimeout(delayTimeout);
    }

    if (currentCharIndex < text.length) {
      // Still typing current line
      const typingSpeed = currentLine.type === 'command'
        ? 50 + Math.random() * 50 // Commands: 50-100ms per char
        : 15 + Math.random() * 25; // Output: faster, 15-40ms

      const typingTimeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          newLines[currentLineIndex] = text.substring(0, currentCharIndex + 1);
          return newLines;
        });
        setCurrentCharIndex(prev => prev + 1);
      }, typingSpeed);

      return () => clearTimeout(typingTimeout);
    } else {
      // Finished current line, move to next
      const lineDelay = currentLine.type === 'command' ? 400 : 150;
      const nextLineTimeout = setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, lineDelay);

      return () => clearTimeout(nextLineTimeout);
    }
  }, [currentLineIndex, currentCharIndex, displayedLines, resetAnimation]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="w-full max-w-lg"
    >
      {/* Terminal window */}
      <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden shadow-2xl">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27CA40]" />
          </div>
          <span className="text-xs text-[#666] font-mono ml-2">beau@system ~ </span>
        </div>

        {/* Terminal content */}
        <div className="p-4 font-mono text-sm min-h-[280px] max-h-[320px] overflow-hidden">
          {displayedLines.map((line, index) => {
            const lineData = terminalSequence[index];
            const isCurrentLine = index === currentLineIndex;
            const isCommand = lineData?.type === 'command';

            return (
              <div
                key={index}
                className={`leading-relaxed ${
                  isCommand
                    ? 'text-[#7C3AED]'
                    : lineData?.type === 'empty'
                      ? 'h-4'
                      : 'text-[#94A3B8]'
                }`}
              >
                {line}
                {isCurrentLine && showCursor && (
                  <span className="inline-block w-2 h-4 bg-[#7C3AED] ml-0.5 align-middle" />
                )}
              </div>
            );
          })}

          {/* Show cursor on empty state */}
          {displayedLines.length === 0 && showCursor && (
            <span className="inline-block w-2 h-4 bg-[#7C3AED]" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
