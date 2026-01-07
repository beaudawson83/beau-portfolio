'use client';

import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-sm border-b border-[#1F1F1F]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 font-mono text-xs sm:text-sm tracking-wider">
          {/* Left side */}
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">BEAU DAWSON</span>
            <span className="text-[#94A3B8] hidden sm:inline">
              [OPS_DIRECTOR_AI_ARCHITECT]
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 text-[#94A3B8]">
            <span className="hidden md:inline">[LOC: AUSTIN_TX]</span>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">[STATUS:</span>
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="status-pulse absolute inline-flex h-full w-full rounded-full bg-[#7C3AED] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7C3AED]"></span>
                </span>
                <span className="text-[#7C3AED] font-medium">DEPLOYABLE</span>
              </span>
              <span className="hidden sm:inline">]</span>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
