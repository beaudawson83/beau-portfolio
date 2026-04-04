'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { badLabsContent } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

export default function BadLabsShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useTrackSectionWithRef(ref, 'BadLabsShowcase');

  return (
    <section className="py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto" ref={ref}>
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            {badLabsContent.headline}
          </h2>
          <p className="font-mono text-xs sm:text-sm text-[#94A3B8]">
            {badLabsContent.subheadline}
          </p>
          <p className="text-[#94A3B8] mt-4 max-w-3xl leading-relaxed">
            {badLabsContent.description}
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {badLabsContent.features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="group relative bg-[#1F1F1F] border border-[#2A2A2A] rounded-lg p-5 sm:p-6 hover:border-[#7C3AED]/30 transition-colors duration-300"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <h3 className="font-mono text-sm sm:text-base font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Live link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 font-mono text-xs text-[#94A3B8]/60"
        >
          <span className="text-[#10B981]">LIVE</span>{' '}
          <a
            href={badLabsContent.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#7C3AED] transition-colors underline underline-offset-2"
          >
            {badLabsContent.liveUrl.replace('https://', '')}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
