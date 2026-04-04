'use client';

import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-sm border-b border-[#1F1F1F]"
    >
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 2xl:px-16">
        <div className="flex items-center justify-between h-10 sm:h-12 text-xs sm:text-sm tracking-wide">
          {/* Left */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">BEAU DAWSON</span>
            <span className="text-[#94A3B8]/60 hidden md:inline font-mono text-xs">
              Operations + AI
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 sm:gap-4 text-[#94A3B8]/60 font-mono text-xs">
            <span className="hidden sm:inline">Austin, TX</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
              </span>
              <span className="text-[#10B981]">Available</span>
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
