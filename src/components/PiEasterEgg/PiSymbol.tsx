'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CornerPosition } from './types';

const CORNERS: CornerPosition[] = [
  { corner: 'top-left', className: 'top-20 left-4' },
  { corner: 'top-right', className: 'top-20 right-4' },
  { corner: 'bottom-left', className: 'bottom-4 left-4' },
  { corner: 'bottom-right', className: 'bottom-4 right-4' },
];

interface PiSymbolProps {
  onClick: () => void;
}

export default function PiSymbol({ onClick }: PiSymbolProps) {
  const [position, setPosition] = useState<CornerPosition | null>(null);

  useEffect(() => {
    const randomCorner = CORNERS[Math.floor(Math.random() * CORNERS.length)];
    setPosition(randomCorner);
  }, []);

  if (!position) return null;

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2, duration: 1.5 }}
      onClick={onClick}
      className={`fixed ${position.className} z-40 font-mono text-sm
                  text-[#94A3B8]/25 hover:text-[#94A3B8]/50
                  transition-colors duration-500 cursor-default
                  select-none p-2`}
      aria-label="Hidden feature"
    >
      π
    </motion.button>
  );
}
