'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { experiences } from '@/lib/data';

export default function ChangeLog() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [showLegacy, setShowLegacy] = useState(false);

  const mainExperiences = experiences.filter((exp) => !exp.isLegacy);
  const legacyExperiences = experiences.filter((exp) => exp.isLegacy);

  return (
    <section id="experience" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Section header */}
          <div className="font-mono text-sm text-[#7C3AED] mb-10 tracking-wider">
            {'>'} CHANGE_LOG // EXPERIENCE_TIMELINE
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-0 sm:left-4 top-0 bottom-0 w-px bg-[#1F1F1F]" />

            {/* Main experiences */}
            {mainExperiences.map((exp, index) => (
              <motion.div
                key={`${exp.company}-${exp.yearRange}`}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative pl-8 sm:pl-14 pb-10 last:pb-0"
              >
                {/* Commit dot */}
                <div className="absolute left-0 sm:left-4 top-1 w-2 h-2 -translate-x-1/2 rounded-full bg-[#7C3AED] border-2 border-[#111111]" />

                {/* Year & Company */}
                <div className="font-mono text-sm mb-2">
                  <span className="text-[#94A3B8]">[{exp.yearRange}]</span>{' '}
                  <span className="text-white font-semibold">{exp.company}</span>{' '}
                  <span className="text-[#94A3B8]">// {exp.role}</span>
                </div>

                {/* Impacts */}
                {exp.impacts.map((impact, i) => (
                  <div key={i} className="font-mono text-sm text-[#94A3B8] ml-2 mb-1">
                    <span className="text-[#7C3AED]">{'>'}</span>{' '}
                    <span className="text-white">IMPACT:</span> {impact}
                  </div>
                ))}

                {/* Tech */}
                {exp.tech?.map((tech, i) => (
                  <div key={i} className="font-mono text-sm text-[#94A3B8] ml-2 mb-1">
                    <span className="text-[#7C3AED]">{'>'}</span>{' '}
                    <span className="text-white">TECH:</span> {tech}
                  </div>
                ))}
              </motion.div>
            ))}

            {/* Legacy toggle */}
            {legacyExperiences.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: mainExperiences.length * 0.1 }}
                className="relative pl-8 sm:pl-14 pt-4"
              >
                {/* Connector dot */}
                <div className="absolute left-0 sm:left-4 top-5 w-2 h-2 -translate-x-1/2 rounded-full bg-[#1F1F1F] border border-[#94A3B8]" />

                <button
                  onClick={() => setShowLegacy(!showLegacy)}
                  className="flex items-center gap-2 font-mono text-sm text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                >
                  {showLegacy ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Legacy_Data ({legacyExperiences.length} entries)
                </button>

                {/* Legacy entries */}
                {showLegacy && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                  >
                    {legacyExperiences.map((exp, index) => (
                      <motion.div
                        key={`${exp.company}-${exp.yearRange}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="relative pb-6 last:pb-0"
                      >
                        {/* Year & Company */}
                        <div className="font-mono text-sm mb-2">
                          <span className="text-[#94A3B8]/60">[{exp.yearRange}]</span>{' '}
                          <span className="text-[#94A3B8]">{exp.company}</span>{' '}
                          <span className="text-[#94A3B8]/60">// {exp.role}</span>
                        </div>

                        {/* Impacts */}
                        {exp.impacts.map((impact, i) => (
                          <div
                            key={i}
                            className="font-mono text-sm text-[#94A3B8]/60 ml-2 mb-1"
                          >
                            <span className="text-[#7C3AED]/50">{'>'}</span> {impact}
                          </div>
                        ))}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
