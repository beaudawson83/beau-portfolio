'use client';

import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { hookQuote } from '@/lib/data';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

// Individual floating word component
function FloatingWord({
  word,
  index,
  totalWords,
  isInView,
  isHighlight,
}: {
  word: string;
  index: number;
  totalWords: number;
  isInView: boolean;
  isHighlight: boolean;
}) {
  // Calculate delay based on position for wave effect
  const delay = index * 0.05;

  // Random subtle offset for depth
  const yOffset = Math.sin(index * 0.5) * 10;
  const xOffset = Math.cos(index * 0.7) * 5;

  return (
    <motion.span
      className={`inline-block relative ${isHighlight ? 'text-[#7C3AED] font-medium' : ''}`}
      initial={{
        opacity: 0,
        y: 30 + yOffset,
        x: xOffset,
        filter: 'blur(4px)',
      }}
      animate={
        isInView
          ? {
              opacity: 1,
              y: 0,
              x: 0,
              filter: 'blur(0px)',
            }
          : {}
      }
      transition={{
        duration: 0.6,
        delay: 0.3 + delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{
        y: -5,
        color: isHighlight ? '#A78BFA' : '#E2E8F0',
        transition: { duration: 0.2 },
      }}
    >
      {word}
      {isHighlight && (
        <motion.span
          className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 + delay }}
        />
      )}
    </motion.span>
  );
}

// Flowing background lines
function FlowingLines({ isInView }: { isInView: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px w-full"
          style={{
            top: `${20 + i * 15}%`,
            background: `linear-gradient(90deg, transparent 0%, rgba(124, 58, 237, 0.1) 50%, transparent 100%)`,
          }}
          initial={{ x: '-100%', opacity: 0 }}
          animate={
            isInView
              ? {
                  x: ['100%', '-100%'],
                  opacity: [0, 0.3, 0],
                }
              : {}
          }
          transition={{
            duration: 8 + i * 2,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// Floating particles for ambient effect
function FloatingParticles({ isInView }: { isInView: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#7C3AED]/30"
          style={{
            left: `${10 + (i * 12)}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={
            isInView
              ? {
                  opacity: [0.2, 0.5, 0.2],
                  scale: [1, 1.5, 1],
                  y: [0, -20, 0],
                }
              : {}
          }
          transition={{
            duration: 3 + i * 0.5,
            delay: i * 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function HookSection() {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });

  // Track when this section becomes visible
  useTrackSectionWithRef(ref, 'HookSection_Quote');

  // Parallax effect on scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.5, 1, 1, 0.5]);

  // Handle mouse movement for subtle parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  // Split the quote to identify words and highlight phrase
  const highlightPhrase = "'complexity tax'";
  const words = hookQuote.split(' ');
  const highlightStart = hookQuote.indexOf(highlightPhrase);

  // Build word array with highlight info
  interface WordInfo {
    word: string;
    isHighlight: boolean;
  }

  const wordInfos: WordInfo[] = [];
  let currentIndex = 0;

  words.forEach((word) => {
    const wordStart = hookQuote.indexOf(word, currentIndex);
    const wordEnd = wordStart + word.length;
    const isHighlight =
      wordStart >= highlightStart && wordEnd <= highlightStart + highlightPhrase.length;

    wordInfos.push({ word, isHighlight });
    currentIndex = wordEnd;
  });

  return (
    <section
      ref={containerRef}
      className="relative py-16 sm:py-20 lg:py-24 2xl:py-28 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background effects */}
      <FlowingLines isInView={isInView} />
      <FloatingParticles isInView={isInView} />

      {/* Gradient background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(124, 58, 237, 0.05) 0%, transparent 50%)`,
        }}
      />

      <div className="max-w-4xl 2xl:max-w-5xl mx-auto relative">
        <motion.div
          ref={ref}
          style={{ y, opacity }}
          className="text-center"
        >
          {/* Quote marks */}
          <motion.div
            className="absolute -top-4 sm:-top-8 left-0 sm:left-4 text-6xl sm:text-8xl text-[#7C3AED]/10 font-serif select-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
          >
            &ldquo;
          </motion.div>

          <motion.div
            className="absolute -bottom-8 sm:-bottom-12 right-0 sm:right-4 text-6xl sm:text-8xl text-[#7C3AED]/10 font-serif select-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            &rdquo;
          </motion.div>

          {/* Main quote with floating words */}
          <blockquote className="text-base sm:text-xl lg:text-2xl 2xl:text-3xl leading-relaxed text-[#94A3B8] font-light relative z-10">
            {wordInfos.map((info, index) => (
              <span key={index}>
                <FloatingWord
                  word={info.word}
                  index={index}
                  totalWords={wordInfos.length}
                  isInView={isInView}
                  isHighlight={info.isHighlight}
                />
                {index < wordInfos.length - 1 && ' '}
              </span>
            ))}
          </blockquote>

          {/* Subtle attribution line */}
          <motion.div
            className="mt-8 flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1.5 }}
          >
            <motion.div
              className="h-px w-12 bg-gradient-to-r from-transparent to-[#7C3AED]/50"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.5, delay: 1.6 }}
            />
            <span className="font-mono text-xs text-[#94A3B8]/50 tracking-wider uppercase">
              Operational Philosophy
            </span>
            <motion.div
              className="h-px w-12 bg-gradient-to-l from-transparent to-[#7C3AED]/50"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.5, delay: 1.6 }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
