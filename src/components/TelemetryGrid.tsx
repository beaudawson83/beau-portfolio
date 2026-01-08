'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { metrics } from '@/lib/data';

function AnimatedValue({ value, inView }: { value: string; inView: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);
  const hasNumber = /[\d,]+/.test(value);

  useEffect(() => {
    if (!inView || !hasNumber) return;

    // Extract the numeric part
    const numericMatch = value.match(/([\d,]+)/);
    if (!numericMatch) return;

    const numericString = numericMatch[1].replace(/,/g, '');
    const targetNumber = parseInt(numericString, 10);
    const prefix = value.substring(0, value.indexOf(numericMatch[1]));
    const suffix = value.substring(
      value.indexOf(numericMatch[1]) + numericMatch[1].length
    );

    let startTime: number;
    const duration = 1500;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentNumber = Math.floor(targetNumber * easeOutQuart);

      // Format with commas
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

  return <>{displayValue}</>;
}

export default function TelemetryGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-12 sm:py-16 2xl:py-20 px-4 sm:px-6 lg:px-8 2xl:px-16 border-y border-[#1F1F1F]">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-0 lg:divide-x lg:divide-[#1F1F1F]"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="lg:px-8 2xl:px-12 first:lg:pl-0 last:lg:pr-0 text-center lg:text-left"
            >
              {/* Label */}
              <div className="font-mono text-[10px] sm:text-xs 2xl:text-sm tracking-wider text-[#94A3B8] mb-1 sm:mb-2">
                {metric.label}
              </div>

              {/* Value */}
              <div className="font-mono text-xl sm:text-2xl lg:text-3xl 2xl:text-4xl font-bold text-[#7C3AED] mb-1 sm:mb-2">
                <AnimatedValue value={metric.value} inView={isInView} />
              </div>

              {/* Context */}
              <div className="text-xs sm:text-sm 2xl:text-base text-[#94A3B8] mb-1">{metric.context}</div>

              {/* Source */}
              <div className="font-mono text-[10px] sm:text-xs text-[#94A3B8]/60">
                // {metric.source}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
