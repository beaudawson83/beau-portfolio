'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { hookQuote } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

export default function HookSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Track when this section becomes visible
  useTrackSectionWithRef(ref, 'HookSection_Quote');

  // Split the quote to highlight "complexity tax"
  const parts = hookQuote.split("'complexity tax'");

  return (
    <section className="py-16 sm:py-20 lg:py-24 2xl:py-28 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-4xl 2xl:max-w-5xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center"
        >
          <blockquote className="text-base sm:text-xl lg:text-2xl 2xl:text-3xl leading-relaxed text-[#94A3B8] font-light">
            &ldquo;{parts[0]}
            <span className="text-[#7C3AED] font-medium">
              &apos;complexity tax&apos;
            </span>
            {parts[1]}&rdquo;
          </blockquote>
        </motion.div>
      </div>
    </section>
  );
}
