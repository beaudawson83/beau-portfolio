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
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="ui-card p-6"
    >
      <h3 className="text-base font-semibold tracking-[-0.01em] text-ink mb-5">
        {skillGroup.category}
      </h3>

      <ul className="flex flex-wrap gap-2">
        {skillGroup.items.map((item) => (
          <li
            key={item}
            className="rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs sm:text-sm text-muted transition-colors hover:border-accent-bright/40 hover:text-ink"
          >
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
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto" ref={ref}>
        {/* Section header — eyebrow / H2 / tagline pattern. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 sm:mb-12"
        >
          <p className="ui-eyebrow mb-4">
            What I Use
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink mb-3">
            Tools & Platforms
          </h2>
          <p className="text-base sm:text-lg text-muted">
            {skills.reduce((acc, s) => acc + s.items.length, 0)} tools across {skills.length} domains.
          </p>
        </motion.div>

        {/* Skills grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
