'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { experiences } from '@/lib/data';

export default function Timeline() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto">
        {/* Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 mb-6 group cursor-pointer"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-white group-hover:text-[#7C3AED] transition-colors">
            Full Career Timeline
          </h2>
          <span className="font-mono text-xs text-[#94A3B8]/50">
            {expanded ? '- collapse' : `+ ${experiences.length} roles`}
          </span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="relative pl-6 border-l border-[#2A2A2A]">
                {experiences.map((exp, index) => (
                  <motion.div
                    key={`${exp.company}-${exp.yearRange}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`relative pb-6 last:pb-0 ${exp.isLegacy ? 'opacity-50' : ''}`}
                  >
                    {/* Dot */}
                    <div
                      className={`absolute -left-[25px] top-1.5 w-2 h-2 rounded-full ${
                        exp.isLegacy ? 'bg-[#2A2A2A] border border-[#94A3B8]/30' : 'bg-[#7C3AED]'
                      }`}
                    />

                    {/* Content */}
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                      <span className="font-mono text-xs text-[#94A3B8]/50">
                        {exp.yearRange}
                      </span>
                      <span className="font-semibold text-sm text-white">
                        {exp.company}
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        {exp.role}
                      </span>
                    </div>

                    {!exp.isLegacy && exp.context && (
                      <p className="text-xs text-[#94A3B8]/60 mb-1.5 max-w-2xl">
                        {exp.context}
                      </p>
                    )}

                    {exp.impacts.length > 0 && (
                      <ul className="space-y-0.5">
                        {exp.impacts.map((impact, i) => (
                          <li key={i} className="text-xs text-[#94A3B8] flex items-start gap-1.5">
                            <span className="text-[#7C3AED]/40 mt-px">-</span>
                            <span>{impact}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
