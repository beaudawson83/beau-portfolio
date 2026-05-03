'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { skills } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

function CategoryCard({
  skillGroup,
  index,
  isInView,
}: {
  skillGroup: { category: string; items: string[] };
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5 sm:p-6"
    >
      <h3 className="font-mono text-xs sm:text-sm text-white font-semibold tracking-wider mb-4">
        {skillGroup.category}
      </h3>

      <ul className="space-y-2">
        {skillGroup.items.map((item) => (
          <li
            key={item}
            className="font-mono text-xs sm:text-sm text-[#94A3B8] flex items-center gap-2"
          >
            <span className="text-[#7C3AED]/50">-</span>
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function SystemKernel() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  useTrackSectionWithRef(ref, 'SystemKernel_Skills');

  return (
    <section className="py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 border-t border-[#1F1F1F]">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto" ref={ref}>
        {/* Section header — eyebrow / H2 / tagline pattern. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="mb-10 sm:mb-12"
        >
          <p className="font-mono text-xs text-[#94A3B8] tracking-[0.12em] uppercase mb-2">
            What I Use
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Tools & Platforms
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            {skills.reduce((acc, s) => acc + s.items.length, 0)} tools across {skills.length} domains.
          </p>
        </motion.div>

        {/* Skills grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {skills.map((skillGroup, index) => (
            <CategoryCard
              key={skillGroup.category}
              skillGroup={skillGroup}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
