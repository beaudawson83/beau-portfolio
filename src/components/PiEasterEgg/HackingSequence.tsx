'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FakePage } from './types';
import { getShuffledPages } from './fakePages';

interface HackingSequenceProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function HackingSequence({ isActive, onComplete }: HackingSequenceProps) {
  const [currentPage, setCurrentPage] = useState<FakePage | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [pages] = useState<FakePage[]>(() => getShuffledPages());

  const startSequence = useCallback(() => {
    let currentIndex = 0;
    const cycleTime = 250;
    const totalDuration = 4500;
    const finalMessageTime = 500;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % pages.length;
      setCurrentPage(pages[currentIndex]);
    }, cycleTime);

    const showFinalTimeout = setTimeout(() => {
      clearInterval(interval);
      setShowFinal(true);
    }, totalDuration - finalMessageTime);

    const completeTimeout = setTimeout(() => {
      onComplete();
    }, totalDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(showFinalTimeout);
      clearTimeout(completeTimeout);
    };
  }, [pages, onComplete]);

  useEffect(() => {
    if (!isActive) {
      setCurrentPage(null);
      setShowFinal(false);
      return;
    }

    setCurrentPage(pages[0]);
    const cleanup = startSequence();
    return cleanup;
  }, [isActive, pages, startSequence]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
    >
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none scanlines opacity-30" />

      {/* CRT flicker effect */}
      <div className="absolute inset-0 crt-flicker">
        <AnimatePresence mode="wait">
          {!showFinal && currentPage && (
            <motion.div
              key={currentPage.id}
              initial={{ opacity: 0, x: Math.random() * 10 - 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: Math.random() * 10 - 5 }}
              transition={{ duration: 0.05 }}
              className="h-full flex flex-col"
            >
              {/* Header bar */}
              <div
                className="py-2 px-4 border-b border-white/20"
                style={{ backgroundColor: currentPage.accentColor }}
              >
                <div className="font-mono text-white text-xs tracking-wider opacity-90">
                  {currentPage.agency}
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 p-6 font-mono">
                <div className="text-white/60 text-xs mb-4 tracking-widest">
                  {currentPage.headerText}
                </div>

                <div className="space-y-2">
                  {currentPage.content.map((line, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="text-green-400 text-sm glitch-text"
                    >
                      {'>'} {line}
                    </motion.div>
                  ))}
                </div>

                {/* Fake progress/status indicators */}
                <div className="mt-8 space-y-1">
                  <div className="h-1 bg-white/10 rounded overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <div className="text-white/40 text-xs">
                    ACCESSING... {Math.floor(Math.random() * 100)}%
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="py-2 px-4 border-t border-white/10 bg-black/50">
                <div className="flex justify-between text-xs font-mono text-white/40">
                  <span>IP: {generateFakeIP()}</span>
                  <span>PING: {Math.floor(Math.random() * 50) + 10}ms</span>
                  <span>ENCRYPTED</span>
                </div>
              </div>
            </motion.div>
          )}

          {showFinal && (
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.5, 1] }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-green-400 text-2xl md:text-4xl tracking-widest mb-4"
                >
                  CONNECTION ESTABLISHED
                </motion.div>
                <div className="font-mono text-white/40 text-sm">
                  INITIALIZING SECURE TERMINAL...
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Random data stream effect on sides */}
      <div className="absolute left-0 top-0 bottom-0 w-8 overflow-hidden opacity-20">
        <DataStream />
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 overflow-hidden opacity-20">
        <DataStream />
      </div>
    </motion.div>
  );
}

function generateFakeIP(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function DataStream() {
  const [chars, setChars] = useState<string[]>([]);

  useEffect(() => {
    const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const generateChars = () => {
      const newChars: string[] = [];
      for (let i = 0; i < 50; i++) {
        newChars.push(characters[Math.floor(Math.random() * characters.length)]);
      }
      setChars(newChars);
    };

    generateChars();
    const interval = setInterval(generateChars, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-green-500 text-xs leading-tight whitespace-pre">
      {chars.map((char, i) => (
        <div key={i} style={{ opacity: Math.random() * 0.5 + 0.5 }}>
          {char}
        </div>
      ))}
    </div>
  );
}
