'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { caseStudies } from '@/lib/data';
import type { CaseStudy } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

function CaseStudyCard({
  study,
  index,
  isInView,
}: {
  study: CaseStudy;
  index: number;
  isInView: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="ui-card overflow-hidden hover:border-accent-bright/30"
    >
      {/* Header — always visible */}
      <div className="p-6 sm:p-8 lg:p-10">
        {/* Company + Period */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
          <h3 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-ink">
            {study.company}
          </h3>
          <span className="self-start sm:self-auto rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-muted tabular-nums flex-shrink-0">
            {study.period}
          </span>
        </div>

        {/* Role */}
        <p className="text-sm sm:text-base font-medium text-accent-bright mb-6">
          {study.role}
        </p>

        {/* Highlight quote */}
        <p className="text-xl sm:text-2xl lg:text-3xl text-ink/90 font-medium tracking-[-0.02em] leading-snug mb-6 max-w-4xl">
          &ldquo;{study.highlight}&rdquo;
        </p>

        {/* Key results — always visible */}
        <div className="flex flex-wrap gap-2 mb-6">
          {study.results.slice(0, 3).map((result, i) => (
            <span
              key={i}
              className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-ink/80"
            >
              {result}
            </span>
          ))}
          {study.results.length > 3 && !expanded && (
            <span className="text-xs sm:text-sm px-3 py-1.5 text-faint">
              +{study.results.length - 3} more
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-full border border-line-strong bg-white/[0.04] px-4 py-2 text-sm font-medium text-ink hover:bg-white/[0.08] hover:border-accent-bright/50 transition-colors"
        >
          {expanded ? '- Collapse' : '+ Read full story'}
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 sm:px-8 lg:px-10 pb-8 lg:pb-10 pt-8 border-t border-line grid gap-8 lg:grid-cols-3">
              {/* The Problem */}
              <div>
                <h4 className="text-sm font-semibold text-ink mb-3">
                  The Problem
                </h4>
                <p className="text-sm sm:text-[0.95rem] text-muted leading-relaxed">
                  {study.problem}
                </p>
              </div>

              {/* What I Built */}
              <div>
                <h4 className="text-sm font-semibold text-ink mb-3">
                  What I Built
                </h4>
                <p className="text-sm sm:text-[0.95rem] text-muted leading-relaxed">
                  {study.built}
                </p>
              </div>

              {/* Full Results */}
              <div>
                <h4 className="text-sm font-semibold text-ink mb-3">
                  Results
                </h4>
                <ul className="space-y-2">
                  {study.results.map((result, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                      <span className="mt-[0.45rem] h-1.5 w-1.5 rounded-full bg-accent-bright flex-shrink-0" />
                      {result}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CaseStudies() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  useTrackSectionWithRef(ref, 'CaseStudies');

  return (
    <section id="case-studies" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto" ref={ref}>
        {/* Section header — matches TelemetryGrid's eyebrow / H2 / tagline
            rhythm so the page reads as a consistent what → where progression. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 sm:mb-12"
        >
          <p className="ui-eyebrow mb-4">
            Where I&apos;ve Done It
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink mb-3">
            Case Studies
          </h2>
          <p className="text-base sm:text-lg text-muted">
            Walk into chaos. Build systems. Leave it running.
          </p>
        </motion.div>

        {/* Case study cards */}
        <div className="space-y-4 sm:space-y-5">
          {caseStudies.map((study, index) => (
            <CaseStudyCard
              key={study.company}
              study={study}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
