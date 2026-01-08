'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { skills } from '@/lib/data';

export default function SystemKernel() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 border-t border-[#1F1F1F]">
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Section header */}
          <div className="font-mono text-xs sm:text-sm 2xl:text-base text-[#7C3AED] mb-8 sm:mb-10 tracking-wider">
            {'>'} SYSTEM_CONFIG
          </div>

          {/* Skills grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 md:gap-12 2xl:gap-16">
            {skills.map((skillGroup, groupIndex) => (
              <motion.div
                key={skillGroup.category}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
              >
                {/* Category header */}
                <h3 className="font-mono text-xs sm:text-sm 2xl:text-base text-white font-semibold mb-3 sm:mb-4 tracking-wider">
                  {skillGroup.category}
                </h3>

                {/* Skills list */}
                <ul className="space-y-1.5 sm:space-y-2">
                  {skillGroup.items.map((item, itemIndex) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{
                        duration: 0.3,
                        delay: groupIndex * 0.1 + itemIndex * 0.05,
                      }}
                      className="font-mono text-xs sm:text-sm 2xl:text-base text-[#94A3B8] flex items-start gap-2"
                    >
                      <span className="text-[#7C3AED] flex-shrink-0">-</span>
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
