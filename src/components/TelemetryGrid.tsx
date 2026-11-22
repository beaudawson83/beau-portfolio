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
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="ui-card ui-card-hover flex flex-col p-4 sm:p-6"
    >
      {/* Value */}
      <div className="ui-gradient-text text-[1.375rem] sm:text-3xl xl:text-4xl 2xl:text-5xl font-semibold tracking-[-0.04em] tabular-nums whitespace-nowrap mb-3 pb-1">
        <AnimatedValue value={metric.value} inView={isInView} />
      </div>

      {/* Context */}
      <div className="text-sm text-muted leading-snug mb-4">{metric.context}</div>

      {/* Source */}
      <div className="mt-auto text-xs font-medium text-faint">{metric.source}</div>
    </motion.div>
  );
}

export default function TelemetryGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useTrackSectionWithRef(ref, 'TelemetryGrid');

  return (
    <section className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto" ref={ref}>
        {/* Section header — sets up the "Where I've Done It" section below
            so the page reads as a what → where progression. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 sm:mb-12"
        >
          <p className="ui-eyebrow mb-4">What I&apos;ve Done</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink mb-3">
            By the Numbers
          </h2>
          <p className="text-base sm:text-lg text-muted max-w-2xl">
            Twenty years of operating, building, and removing zeros from problems.
          </p>
        </motion.div>

        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
