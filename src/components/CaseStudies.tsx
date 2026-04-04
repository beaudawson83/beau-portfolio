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
      transition={{ duration: 0.5, delay: index * 0.12 }}
      className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden hover:border-[#7C3AED]/20 transition-colors duration-300"
    >
      {/* Header — always visible */}
      <div className="p-5 sm:p-6 lg:p-8">
        {/* Company + Period */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-1 gap-1">
          <h3 className="text-base sm:text-xl font-bold text-white">
            {study.company}
          </h3>
          <span className="font-mono text-[11px] sm:text-xs text-[#94A3B8]/50 flex-shrink-0">
            {study.period}
          </span>
        </div>

        {/* Role */}
        <p className="font-mono text-xs sm:text-sm text-[#7C3AED] mb-4">
          {study.role}
        </p>

        {/* Highlight quote */}
        <p className="text-base sm:text-lg text-white/80 font-medium italic mb-4">
          &ldquo;{study.highlight}&rdquo;
        </p>

        {/* Key results — always visible */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
          {study.results.slice(0, 3).map((result, i) => (
            <span
              key={i}
              className="text-[11px] sm:text-sm px-2.5 sm:px-3 py-1 rounded-full bg-[#7C3AED]/8 border border-[#7C3AED]/15 text-[#94A3B8]"
            >
              {result}
            </span>
          ))}
          {study.results.length > 3 && !expanded && (
            <span className="text-xs sm:text-sm px-3 py-1 text-[#94A3B8]/40">
              +{study.results.length - 3} more
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="font-mono text-xs text-[#7C3AED] hover:text-[#A78BFA] transition-colors"
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
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 lg:px-8 pb-6 lg:pb-8 space-y-5 border-t border-[#2A2A2A] pt-5">
              {/* The Problem */}
              <div>
                <h4 className="font-mono text-xs text-[#94A3B8]/60 uppercase tracking-wider mb-2">
                  The Problem
                </h4>
                <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                  {study.problem}
                </p>
              </div>

              {/* What I Built */}
              <div>
                <h4 className="font-mono text-xs text-[#94A3B8]/60 uppercase tracking-wider mb-2">
                  What I Built
                </h4>
                <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                  {study.built}
                </p>
              </div>

              {/* Full Results */}
              <div>
                <h4 className="font-mono text-xs text-[#94A3B8]/60 uppercase tracking-wider mb-2">
                  Results
                </h4>
                <ul className="space-y-1.5">
                  {study.results.map((result, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#94A3B8]">
                      <span className="text-[#7C3AED] mt-0.5 flex-shrink-0">-</span>
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
    <section id="case-studies" className="py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="mb-10 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Where I&apos;ve Done It
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            Walk into chaos. Build systems. Leave it running.
          </p>
        </motion.div>

        {/* Case study cards */}
        <div className="space-y-4 sm:space-y-6">
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
