'use client';

import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-3 sm:top-4 left-0 right-0 z-50 px-3 sm:px-6"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between h-12 pl-5 pr-3 rounded-full border border-line bg-canvas/70 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgb(0_0_0/0.8)]">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-sm tracking-tight text-ink whitespace-nowrap">
            Beau Dawson
          </span>
          <span className="hidden md:inline h-4 w-px bg-line-strong" />
          <span className="hidden md:inline text-sm text-muted">Operations + AI</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-muted">Austin, TX</span>
          <span className="flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
            </span>
            Available
          </span>
        </div>
      </div>
    </motion.header>
  );
}
