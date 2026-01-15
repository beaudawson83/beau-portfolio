'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { experiences } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';
import { trackLegacyToggle } from '@/lib/analytics';

// Timeline rail with energy pulses
function TimelineRail({ isInView }: { isInView: boolean }) {
  return (
    <div className="absolute left-0 sm:left-3 md:left-4 top-0 bottom-0 w-px">
      {/* Base line */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-[#7C3AED]/50 via-[#1F1F1F] to-[#1F1F1F]"
        initial={{ scaleY: 0 }}
        animate={isInView ? { scaleY: 1 } : {}}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{ transformOrigin: 'top' }}
      />

      {/* Energy pulses */}
      {isInView && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 w-1 h-8 -translate-x-1/2 rounded-full"
              style={{
                background: 'linear-gradient(180deg, transparent, #7C3AED, transparent)',
              }}
              initial={{ top: '0%', opacity: 0 }}
              animate={{
                top: ['0%', '100%'],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 3,
                delay: i * 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

// Experience card with holographic effect
function ExperienceCard({
  exp,
  index,
  isInView,
  isLegacy = false,
}: {
  exp: {
    yearRange: string;
    company: string;
    role: string;
    impacts: string[];
    tech?: string[];
  };
  index: number;
  isInView: boolean;
  isLegacy?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
      animate={isInView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative pl-6 sm:pl-10 md:pl-14 pb-8 sm:pb-10 last:pb-0 ${
        isLegacy ? 'opacity-60' : ''
      }`}
    >
      {/* Commit dot with pulse */}
      <motion.div
        className="absolute left-0 sm:left-3 md:left-4 top-1 -translate-x-1/2"
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ duration: 0.3, delay: index * 0.15 + 0.2 }}
      >
        <div className="relative">
          <div
            className={`w-3 h-3 rounded-full ${
              isLegacy
                ? 'bg-[#1F1F1F] border border-[#94A3B8]'
                : 'bg-[#7C3AED] border-2 border-[#111111]'
            }`}
          />
          {!isLegacy && isHovered && (
            <motion.div
              className="absolute inset-0 rounded-full bg-[#7C3AED]"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
      </motion.div>

      {/* Card content with hover glow */}
      <div className="relative group">
        {/* Hover glow */}
        <motion.div
          className="absolute -inset-4 rounded-lg bg-[#7C3AED]/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered && !isLegacy ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Holographic line on hover */}
        {isHovered && !isLegacy && (
          <motion.div
            className="absolute -left-4 top-0 bottom-0 w-px"
            style={{
              background: 'linear-gradient(180deg, transparent, #7C3AED, transparent)',
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Year & Company */}
        <div className="relative font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base mb-1.5 sm:mb-2">
          <motion.span
            className="text-[#94A3B8]"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: index * 0.15 + 0.1 }}
          >
            [{exp.yearRange}]
          </motion.span>{' '}
          <motion.span
            className={`font-semibold ${isLegacy ? 'text-[#94A3B8]' : 'text-white'}`}
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.15 + 0.2 }}
          >
            {exp.company}
          </motion.span>{' '}
          <motion.span
            className={`hidden md:inline ${isLegacy ? 'text-[#94A3B8]/60' : 'text-[#94A3B8]'}`}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: index * 0.15 + 0.3 }}
          >
            // {exp.role}
          </motion.span>
          <motion.div
            className={`md:hidden text-[9px] sm:text-[10px] mt-0.5 ${
              isLegacy ? 'text-[#94A3B8]/60' : 'text-[#94A3B8]'
            }`}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: index * 0.15 + 0.3 }}
          >
            // {exp.role}
          </motion.div>
        </div>

        {/* Impacts with stagger */}
        {exp.impacts.map((impact, i) => (
          <motion.div
            key={i}
            className={`font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base ml-1 sm:ml-2 mb-0.5 sm:mb-1 leading-relaxed ${
              isLegacy ? 'text-[#94A3B8]/60' : 'text-[#94A3B8]'
            }`}
            initial={{ opacity: 0, x: -15 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.15 + 0.3 + i * 0.05 }}
          >
            <span className={isLegacy ? 'text-[#7C3AED]/50' : 'text-[#7C3AED]'}>
              {'>'}
            </span>{' '}
            {!isLegacy && <span className="text-white">IMPACT:</span>} {impact}
          </motion.div>
        ))}

        {/* Tech tags */}
        {exp.tech?.map((tech, i) => (
          <motion.div
            key={i}
            className="font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base text-[#94A3B8] ml-1 sm:ml-2 mb-0.5 sm:mb-1 leading-relaxed"
            initial={{ opacity: 0, x: -15 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.15 + 0.4 + i * 0.05 }}
          >
            <span className="text-[#10B981]">{'>'}</span>{' '}
            <span className="text-[#10B981]">TECH:</span> {tech}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function ChangeLog() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [showLegacy, setShowLegacy] = useState(false);

  useTrackSectionWithRef(ref, 'ChangeLog_Experience');

  const mainExperiences = experiences.filter((exp) => !exp.isLegacy);
  const legacyExperiences = experiences.filter((exp) => exp.isLegacy);

  const handleLegacyToggle = () => {
    const newState = !showLegacy;
    setShowLegacy(newState);
    trackLegacyToggle(newState);
  };

  return (
    <section
      id="experience"
      className="relative py-12 sm:py-16 md:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden"
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #7C3AED 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-4xl 2xl:max-w-5xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Section header with decode effect */}
          <motion.div
            className="font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base text-[#7C3AED] mb-6 sm:mb-8 md:mb-10 tracking-wider"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="text-white/50">$</span> {'>'} CHANGE_LOG{' '}
            <span className="text-[#94A3B8]">// EXPERIENCE_TIMELINE</span>
            <motion.span
              className="inline-block w-2 h-4 bg-[#7C3AED] ml-1"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Enhanced timeline rail */}
            <TimelineRail isInView={isInView} />

            {/* Main experiences */}
            {mainExperiences.map((exp, index) => (
              <ExperienceCard
                key={`${exp.company}-${exp.yearRange}`}
                exp={exp}
                index={index}
                isInView={isInView}
              />
            ))}

            {/* Legacy toggle with animation */}
            {legacyExperiences.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: mainExperiences.length * 0.15 }}
                className="relative pl-6 sm:pl-10 md:pl-14 pt-3 sm:pt-4"
              >
                {/* Connector dot */}
                <motion.div
                  className="absolute left-0 sm:left-3 md:left-4 top-4 sm:top-5 -translate-x-1/2"
                  whileHover={{ scale: 1.2 }}
                >
                  <div className="w-2 h-2 rounded-full bg-[#1F1F1F] border border-[#94A3B8]" />
                </motion.div>

                <motion.button
                  onClick={handleLegacyToggle}
                  className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs sm:text-sm text-[#94A3B8] hover:text-white transition-colors cursor-pointer group"
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    animate={{ rotate: showLegacy ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </motion.div>
                  <span className="relative">
                    Legacy_Data ({legacyExperiences.length} entries)
                    <motion.span
                      className="absolute bottom-0 left-0 h-px bg-[#7C3AED]"
                      initial={{ width: 0 }}
                      whileHover={{ width: '100%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </span>
                  <span className="text-[#94A3B8]/50 group-hover:text-[#7C3AED] transition-colors text-[10px]">
                    // archived
                  </span>
                </motion.button>

                {/* Legacy entries with CRT effect */}
                <AnimatePresence>
                  {showLegacy && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="mt-4 sm:mt-6 overflow-hidden"
                    >
                      {/* CRT overlay for vintage feel */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-20"
                        style={{
                          background:
                            'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
                        }}
                      />

                      {legacyExperiences.map((exp, index) => (
                        <ExperienceCard
                          key={`${exp.company}-${exp.yearRange}`}
                          exp={exp}
                          index={index}
                          isInView={showLegacy}
                          isLegacy
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Decorative corner elements */}
      <motion.div
        className="absolute top-8 right-8 w-20 h-20 border-t border-r border-[#7C3AED]/10 hidden lg:block"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.5 }}
      />
      <motion.div
        className="absolute bottom-8 left-8 w-20 h-20 border-b border-l border-[#7C3AED]/10 hidden lg:block"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.5 }}
      />
    </section>
  );
}
