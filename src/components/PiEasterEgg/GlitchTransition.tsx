'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GlitchTransitionProps {
  isActive: boolean;
  onComplete: () => void;
  duration?: number;
}

export default function GlitchTransition({
  isActive,
  onComplete,
  duration = 150,
}: GlitchTransitionProps) {
  const [staticNoise, setStaticNoise] = useState<string[]>([]);

  useEffect(() => {
    if (!isActive) return;

    // Generate static noise characters
    const chars = '░▒▓█▄▀■□▪▫';
    const generateNoise = () => {
      const lines: string[] = [];
      for (let i = 0; i < 30; i++) {
        let line = '';
        for (let j = 0; j < 80; j++) {
          line += chars[Math.floor(Math.random() * chars.length)];
        }
        lines.push(line);
      }
      setStaticNoise(lines);
    };

    generateNoise();
    const interval = setInterval(generateNoise, 50);

    const timeout = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isActive, onComplete, duration]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.05 }}
      className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
    >
      {/* RGB Split / Chromatic aberration layer */}
      <div className="absolute inset-0 glitch-chromatic" />

      {/* Static noise overlay */}
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center overflow-hidden">
        <pre className="text-green-500/30 text-[8px] leading-none font-mono whitespace-pre select-none">
          {staticNoise.join('\n')}
        </pre>
      </div>

      {/* Horizontal tear lines */}
      <div className="absolute inset-0">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0 h-[2px] bg-white/20"
            style={{ top: `${15 + i * 20}%` }}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{
              x: ['100%', '-100%'],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 0.1,
              delay: i * 0.02,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Screen shake effect via CSS */}
      <motion.div
        className="absolute inset-0"
        animate={{
          x: [0, -5, 5, -3, 3, 0],
          y: [0, 2, -2, 1, -1, 0],
        }}
        transition={{ duration: 0.15 }}
      />
    </motion.div>
  );
}
