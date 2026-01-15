'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { skills } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

// Animated skill chip with hover effects
function SkillChip({
  skill,
  delay,
  isInView,
  categoryIndex,
}: {
  skill: string;
  delay: number;
  isInView: boolean;
  categoryIndex: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Proficiency simulation based on string length (just for visual effect)
  const proficiency = Math.min(100, 60 + (skill.length % 5) * 10);

  return (
    <motion.li
      initial={{ opacity: 0, x: -20, filter: 'blur(5px)' }}
      animate={isInView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group"
    >
      <motion.div
        className="relative font-mono text-xs sm:text-sm 2xl:text-base text-[#94A3B8] flex items-start gap-2 py-1 px-2 -mx-2 rounded cursor-default"
        whileHover={{
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          x: 5,
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Status indicator */}
        <motion.span
          className="text-[#7C3AED] flex-shrink-0 relative"
          animate={{
            color: isHovered ? '#10B981' : '#7C3AED',
          }}
        >
          <span className="relative z-10">-</span>
          {isHovered && (
            <motion.span
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <span className="w-1 h-1 rounded-full bg-[#10B981]" />
            </motion.span>
          )}
        </motion.span>

        <span className="relative">
          {skill}

          {/* Proficiency bar on hover */}
          <motion.div
            className="absolute -bottom-0.5 left-0 h-px bg-gradient-to-r from-[#7C3AED] to-[#10B981]"
            initial={{ width: 0, opacity: 0 }}
            animate={{
              width: isHovered ? `${proficiency}%` : 0,
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </span>

        {/* Glow effect */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded bg-[#7C3AED]/5 -z-10"
            layoutId={`glow-${skill}`}
          />
        )}
      </motion.div>
    </motion.li>
  );
}

// Category card with neural network styling
function CategoryCard({
  skillGroup,
  index,
  isInView,
}: {
  skillGroup: { category: string; items: string[] };
  index: number;
  isInView: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group"
    >
      {/* Card border with gradient */}
      <motion.div
        className="absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, #7C3AED/30, transparent, #7C3AED/30)',
        }}
      />

      {/* Card content */}
      <div className="relative bg-[#111111] rounded-lg p-4 sm:p-6 border border-[#1F1F1F] group-hover:border-[#7C3AED]/30 transition-colors duration-300">
        {/* Status light */}
        <motion.div
          className="absolute top-4 right-4 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: index * 0.15 + 0.3 }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-[#10B981]"
            animate={{
              scale: [1, 1.2, 1],
              boxShadow: [
                '0 0 0 0 rgba(16, 185, 129, 0)',
                '0 0 0 4px rgba(16, 185, 129, 0.3)',
                '0 0 0 0 rgba(16, 185, 129, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-mono text-[10px] text-[#10B981]/60 hidden sm:inline">
            ACTIVE
          </span>
        </motion.div>

        {/* Category header with icon effect */}
        <motion.div
          className="flex items-center gap-3 mb-4 sm:mb-5"
          initial={{ opacity: 0, x: -10 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: index * 0.15 + 0.1 }}
        >
          {/* Module icon */}
          <motion.div
            className="w-8 h-8 rounded border border-[#7C3AED]/30 flex items-center justify-center"
            animate={{
              borderColor: isHovered ? 'rgba(124, 58, 237, 0.5)' : 'rgba(124, 58, 237, 0.3)',
            }}
          >
            <motion.div
              className="w-3 h-3 rounded-sm bg-[#7C3AED]/50"
              animate={{
                rotate: isHovered ? 45 : 0,
                scale: isHovered ? 1.1 : 1,
              }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>

          <h3 className="font-mono text-xs sm:text-sm 2xl:text-base text-white font-semibold tracking-wider">
            {skillGroup.category}
            <motion.span
              className="ml-2 text-[#94A3B8]/50 font-normal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.15 + 0.4 }}
            >
              [{skillGroup.items.length}]
            </motion.span>
          </h3>
        </motion.div>

        {/* Skills list */}
        <ul className="space-y-1">
          {skillGroup.items.map((item, itemIndex) => (
            <SkillChip
              key={item}
              skill={item}
              delay={index * 0.15 + 0.2 + itemIndex * 0.05}
              isInView={isInView}
              categoryIndex={index}
            />
          ))}
        </ul>

        {/* Connection lines (decorative) */}
        {index < 2 && (
          <motion.div
            className="absolute -right-4 sm:-right-6 md:-right-8 top-1/2 w-4 sm:w-6 md:w-8 h-px bg-gradient-to-r from-[#7C3AED]/30 to-transparent hidden sm:block"
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ delay: index * 0.15 + 0.5, duration: 0.5 }}
            style={{ transformOrigin: 'left' }}
          />
        )}
      </div>
    </motion.div>
  );
}

export default function SystemKernel() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useTrackSectionWithRef(ref, 'SystemKernel_Skills');

  return (
    <section className="relative py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 border-t border-[#1F1F1F] overflow-hidden">
      {/* Background circuit pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, #7C3AED 1px, transparent 1px),
            linear-gradient(#7C3AED 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating nodes (decorative) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full border border-[#7C3AED]/20"
            style={{
              left: `${20 + i * 20}%`,
              top: `${30 + (i % 2) * 40}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl 2xl:max-w-6xl mx-auto relative">
        <motion.div ref={ref}>
          {/* Section header */}
          <motion.div
            className="font-mono text-xs sm:text-sm 2xl:text-base text-[#7C3AED] mb-8 sm:mb-10 tracking-wider"
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="text-white/50">$</span> {'>'} SYSTEM_CONFIG{' '}
            <span className="text-[#94A3B8]">// SKILL_MODULES</span>
            <motion.span
              className="inline-block w-2 h-4 bg-[#7C3AED] ml-2 align-middle"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>

          {/* Skills grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 md:gap-8 2xl:gap-12">
            {skills.map((skillGroup, index) => (
              <CategoryCard
                key={skillGroup.category}
                skillGroup={skillGroup}
                index={index}
                isInView={isInView}
              />
            ))}
          </div>

          {/* Bottom status bar */}
          <motion.div
            className="mt-8 sm:mt-12 pt-4 border-t border-[#1F1F1F] flex justify-between items-center font-mono text-[10px] sm:text-xs text-[#94A3B8]/50"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8 }}
          >
            <span>
              MODULES_LOADED: {skills.reduce((acc, s) => acc + s.items.length, 0)}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              ALL_SYSTEMS_OPERATIONAL
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
