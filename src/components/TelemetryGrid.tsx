'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { metrics } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

function AnimatedValue({ value, inView }: { value: string; inView: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);
  const hasNumber = /[\d,]+/.test(value);

  useEffect(() => {
    if (!inView || !hasNumber) return;

    const numericMatch = value.match(/([\d,]+)/);
    if (!numericMatch) return;

    const numericString = numericMatch[1].replace(/,/g, '');
    const targetNumber = parseInt(numericString, 10);
    const prefix = value.substring(0, value.indexOf(numericMatch[1]));
    const suffix = value.substring(
      value.indexOf(numericMatch[1]) + numericMatch[1].length
    );

    let startTime: number;
    const duration = 1200;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const currentNumber = Math.floor(targetNumber * eased);
      const formatted = currentNumber.toLocaleString();
      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [inView, value, hasNumber]);

  return <span>{displayValue}</span>;
}

function MetricCard({
  metric,
  index,
  isInView,
}: {
  metric: { label: string; value: string; context: string; source: string };
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="text-center md:text-left px-2 py-3"
    >
      {/* Value */}
      <div className="font-mono text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#7C3AED] mb-1 whitespace-nowrap">
        <AnimatedValue value={metric.value} inView={isInView} />
      </div>

      {/* Context */}
      <div className="text-[11px] sm:text-xs md:text-sm text-[#94A3B8] leading-snug mb-1">
        {metric.context}
      </div>

      {/* Source */}
      <div className="font-mono text-[9px] sm:text-[10px] md:text-xs text-[#94A3B8]/40">
        {metric.source}
      </div>
    </motion.div>
  );
}

export default function TelemetryGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useTrackSectionWithRef(ref, 'TelemetryGrid');

  return (
    <section className="relative py-10 sm:py-14 md:py-16 2xl:py-20 px-4 sm:px-6 lg:px-8 2xl:px-16 border-y border-[#1F1F1F]">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto" ref={ref}>
        {/* Section header — sets up the "Where I've Done It" section below
            so the page reads as a what → where progression. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="mb-8 sm:mb-10"
        >
          <p className="font-mono text-xs text-[#94A3B8] tracking-[0.12em] uppercase mb-2">
            What I&apos;ve Done
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            By the Numbers
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            Twenty years of operating, building, and removing zeros from problems.
          </p>
        </motion.div>

        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {metrics.map((metric, index) => (
            <MetricCard
              key={metric.label}
              metric={metric}
              index={index}
              isInView={isInView}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
