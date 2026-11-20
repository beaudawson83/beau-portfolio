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
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto" ref={ref}>
        {/* Section header — matches TelemetryGrid / CaseStudies rhythm:
            eyebrow (role + date metadata) → H2 (venture name) → tagline. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 sm:mb-12"
        >
          <p className="ui-eyebrow mb-4">
            {badLabsContent.subheadline}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink mb-3">
            {badLabsContent.headline}
          </h2>
          <p className="text-base sm:text-lg text-muted max-w-3xl leading-relaxed">
            {badLabsContent.description}
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {badLabsContent.features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group ui-card ui-card-hover overflow-hidden p-6 sm:p-8"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent-bright/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-sm font-semibold tabular-nums text-accent-bright">
                {String(index + 1).padStart(2, '0')}
              </div>

              <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.02em] text-ink mb-3">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-[0.95rem] text-muted leading-relaxed">
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
          className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-white/[0.03] py-1.5 pl-1.5 pr-4 text-sm text-muted"
        >
          <span className="rounded-full bg-success/10 border border-success/25 px-2.5 py-0.5 text-xs font-medium text-success">Live</span>
          <a
            href={badLabsContent.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-bright transition-colors"
          >
            {badLabsContent.liveUrl.replace('https://', '')}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
