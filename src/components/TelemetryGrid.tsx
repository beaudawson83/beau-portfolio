'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { metrics } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

// Particle stream effect for numbers
function ParticleStream({ isActive }: { isActive: boolean }) {
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number }[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: i * 0.1,
    }));
    setParticles(newParticles);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 rounded-full bg-[#7C3AED]"
          style={{ left: `${p.x}%` }}
          initial={{ top: '100%', opacity: 0 }}
          animate={{ top: '0%', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 0.8,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Scanline reveal effect
function ScanlineReveal({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      {children}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-[#7C3AED]/20 to-transparent"
            initial={{ top: '-100%' }}
            animate={{ top: '100%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimatedValue({ value, inView }: { value: string; inView: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [showParticles, setShowParticles] = useState(false);
  const hasNumber = /[\d,]+/.test(value);

  useEffect(() => {
    if (!inView || !hasNumber) return;

    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 1000);

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

      // Elastic easing for overshoot effect
      const easeOutElastic = (t: number) => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
      };

      const eased = progress < 1 ? easeOutElastic(progress) : 1;
      const currentNumber = Math.floor(targetNumber * Math.min(eased, 1.1)); // Allow slight overshoot

      const formatted = Math.min(currentNumber, targetNumber * 1.05).toLocaleString();
      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [inView, value, hasNumber]);

  return (
    <div className="relative">
      <ParticleStream isActive={showParticles} />
      <motion.span
        initial={{ filter: 'blur(10px)' }}
        animate={inView ? { filter: 'blur(0px)' } : {}}
        transition={{ duration: 0.5 }}
      >
        {displayValue}
      </motion.span>
    </div>
  );
}

// Individual metric card with materialization effect
function MetricCard({
  metric,
  index,
  isInView,
}: {
  metric: { label: string; value: string; context: string; source: string };
  index: number;
  isInView: boolean;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showScanline, setShowScanline] = useState(false);

  useEffect(() => {
    if (!isInView) return;

    const revealDelay = index * 150;
    const scanlineDelay = revealDelay + 100;

    const revealTimer = setTimeout(() => setIsRevealed(true), revealDelay);
    const scanlineTimer = setTimeout(() => {
      setShowScanline(true);
      setTimeout(() => setShowScanline(false), 600);
    }, scanlineDelay);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(scanlineTimer);
    };
  }, [isInView, index]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={isRevealed ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1], // Custom spring-like easing
      }}
      className="relative md:px-6 lg:px-8 2xl:px-12 first:md:pl-0 last:md:pr-0 text-center md:text-left group"
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-[#7C3AED]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -mx-4 md:mx-0"
        style={{ borderRadius: '4px' }}
      />

      {/* Wireframe to solid transition */}
      <motion.div
        className="absolute inset-0 border border-[#7C3AED]/20 -mx-4 md:mx-0"
        initial={{ opacity: 1 }}
        animate={isRevealed ? { opacity: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
        style={{ borderRadius: '4px' }}
      />

      <ScanlineReveal isActive={showScanline}>
        {/* Label with typing effect */}
        <motion.div
          className="font-mono text-[9px] sm:text-[10px] md:text-xs 2xl:text-sm tracking-wider text-[#94A3B8] mb-1 sm:mb-2"
          initial={{ opacity: 0, x: -10 }}
          animate={isRevealed ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <span className="text-[#7C3AED]/50">&gt; </span>
          {metric.label}
        </motion.div>

        {/* Value with particle effect */}
        <div className="font-mono text-lg sm:text-xl md:text-2xl lg:text-3xl 2xl:text-4xl font-bold text-[#7C3AED] mb-1 sm:mb-2 relative">
          <AnimatedValue value={metric.value} inView={isRevealed} />

          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 blur-lg bg-[#7C3AED]/20 -z-10"
            initial={{ opacity: 0 }}
            animate={isRevealed ? { opacity: [0, 0.5, 0.3] } : {}}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>

        {/* Context */}
        <motion.div
          className="text-[11px] sm:text-xs md:text-sm 2xl:text-base text-[#94A3B8] mb-1 leading-snug"
          initial={{ opacity: 0 }}
          animate={isRevealed ? { opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          {metric.context}
        </motion.div>

        {/* Source with terminal style */}
        <motion.div
          className="font-mono text-[9px] sm:text-[10px] md:text-xs text-[#94A3B8]/60"
          initial={{ opacity: 0 }}
          animate={isRevealed ? { opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <span className="text-[#10B981]/50">// </span>
          {metric.source}
        </motion.div>
      </ScanlineReveal>

      {/* Corner accents */}
      <motion.div
        className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#7C3AED]/30 hidden md:block"
        initial={{ opacity: 0, scale: 0 }}
        animate={isRevealed ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.3, delay: 0.6 }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#7C3AED]/30 hidden md:block"
        initial={{ opacity: 0, scale: 0 }}
        animate={isRevealed ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.3, delay: 0.6 }}
      />
    </motion.div>
  );
}

export default function TelemetryGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useTrackSectionWithRef(ref, 'TelemetryGrid');

  return (
    <section className="relative py-8 sm:py-12 md:py-16 2xl:py-20 px-4 sm:px-6 lg:px-8 2xl:px-16 border-y border-[#1F1F1F] overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Ambient floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#7C3AED]/30"
            style={{
              left: `${20 + i * 15}%`,
              top: '50%',
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl 2xl:max-w-[1600px] mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-0 md:divide-x md:divide-[#1F1F1F]"
        >
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

      {/* Bottom scanline sweep */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 1, delay: 0.8 }}
      />
    </section>
  );
}
