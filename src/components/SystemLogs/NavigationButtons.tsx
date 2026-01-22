'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface NavigationButtonsProps {
  variant: 'home' | 'back' | 'both';
}

export default function NavigationButtons({ variant }: NavigationButtonsProps) {
  return (
    <nav className="flex items-center gap-4 font-mono text-sm">
      {(variant === 'home' || variant === 'both') && (
        <motion.div whileHover={{ x: -2 }} transition={{ duration: 0.2 }}>
          <Link
            href="/"
            className="text-[#94A3B8] hover:text-[#7C3AED] transition-colors"
          >
            [ cd ~ ]
          </Link>
        </motion.div>
      )}

      {(variant === 'back' || variant === 'both') && (
        <motion.div whileHover={{ x: -2 }} transition={{ duration: 0.2 }}>
          <Link
            href="/system-logs"
            className="text-[#94A3B8] hover:text-[#7C3AED] transition-colors"
          >
            [ cd .. ]
          </Link>
        </motion.div>
      )}
    </nav>
  );
}
