'use client';

import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';
import MatrixRain from './MatrixRain';

// Code line type
interface CodeLine {
  type: 'comment' | 'class' | 'function' | 'property' | 'string' | 'bracket' | 'empty' | 'return';
  content: React.ReactNode | string;
  rawText: string;
}

// Typing cursor component
function TypingCursor({ isActive }: { isActive: boolean }) {
  return (
    <motion.span
      className="inline-block w-2 h-4 bg-[#7C3AED] ml-0.5 align-middle"
      animate={{ opacity: isActive ? [1, 0, 1] : 0 }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  );
}

// Animated code line with typing effect
function AnimatedCodeLine({
  line,
  index,
  isInView,
  matrixComplete,
  onTypeComplete,
}: {
  line: CodeLine;
  index: number;
  isInView: boolean;
  matrixComplete: boolean;
  onTypeComplete: () => void;
}) {
  const [displayedChars, setDisplayedChars] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typeComplete, setTypeComplete] = useState(false);
  const [syntaxHighlighted, setSyntaxHighlighted] = useState(false);

  const typeDelay = 100 + index * 150; // Stagger start time
  const charDelay = 15; // ms per character

  useEffect(() => {
    if (!matrixComplete || !isInView) return;

    // Start typing after delay
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, typeDelay);

    return () => clearTimeout(startTimer);
  }, [matrixComplete, isInView, typeDelay]);

  useEffect(() => {
    if (!isTyping || typeComplete) return;

    const totalChars = line.rawText.length;

    if (displayedChars < totalChars) {
      const timer = setTimeout(() => {
        setDisplayedChars((prev) => prev + 1);
      }, charDelay);
      return () => clearTimeout(timer);
    } else {
      setTypeComplete(true);
      // Syntax highlighting sweeps after typing
      setTimeout(() => {
        setSyntaxHighlighted(true);
        onTypeComplete();
      }, 100);
    }
  }, [isTyping, displayedChars, line.rawText, typeComplete, onTypeComplete]);

  // Pre-typing: hidden or scrambled
  if (!matrixComplete) {
    return (
      <motion.div
        className="flex h-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
      >
        <span className="w-8 text-right text-[#94A3B8]/20 select-none mr-4 flex-shrink-0">
          {index + 1}
        </span>
        <span className="text-[#94A3B8]/20">
          {line.rawText.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 0.5,
                delay: i * 0.02,
                repeat: Infinity,
              }}
            >
              {Math.random() > 0.5 ? char : String.fromCharCode(33 + Math.floor(Math.random() * 90))}
            </motion.span>
          ))}
        </span>
      </motion.div>
    );
  }

  // During/after typing
  return (
    <motion.div
      className="flex"
      initial={{ opacity: 0.3 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Line number */}
      <motion.span
        className="w-8 text-right select-none mr-4 flex-shrink-0"
        animate={{
          color: syntaxHighlighted ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.2)',
        }}
        transition={{ duration: 0.3 }}
      >
        {index + 1}
      </motion.span>

      {/* Line content */}
      <span className={line.type === 'comment' ? 'syntax-comment' : 'text-white'}>
        {typeComplete ? (
          // Full content with syntax highlighting
          <motion.span
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
          >
            {syntaxHighlighted ? line.content : line.rawText}
          </motion.span>
        ) : (
          // Typing animation
          <>
            <span className={syntaxHighlighted ? '' : 'text-[#94A3B8]'}>
              {line.rawText.slice(0, displayedChars)}
            </span>
            {isTyping && !typeComplete && <TypingCursor isActive={true} />}
          </>
        )}
      </span>
    </motion.div>
  );
}

export default function ArchitectureShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [matrixComplete, setMatrixComplete] = useState(false);
  const [typingProgress, setTypingProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Track when this section becomes visible
  useTrackSectionWithRef(ref, 'ArchitectureShowcase_BADLabs');

  // 3D perspective on scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [5, 0, -5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);

  // Define code lines with raw text for typing
  const codeLines: CodeLine[] = [
    {
      type: 'comment',
      content: <span className="syntax-comment">// BAD LABS // Founder & Principal Architect</span>,
      rawText: '// BAD LABS // Founder & Principal Architect',
    },
    {
      type: 'comment',
      content: <span className="syntax-comment">// EST: June 2025 // LAUNCH: Jan 2026</span>,
      rawText: '// EST: June 2025 // LAUNCH: Jan 2026',
    },
    { type: 'empty', content: '', rawText: '' },
    {
      type: 'class',
      content: (
        <>
          <span className="syntax-keyword">class</span>{' '}
          <span className="syntax-class">BADLabsConsole</span>{' '}
          <span className="syntax-keyword">extends</span>{' '}
          <span className="syntax-class">Agentic_CRM</span> {'{'}
        </>
      ),
      rawText: 'class BADLabsConsole extends Agentic_CRM {',
    },
    {
      type: 'function',
      content: (
        <>
          {'  '}
          <span className="syntax-function">constructor</span>() {'{'}
        </>
      ),
      rawText: '  constructor() {',
    },
    {
      type: 'property',
      content: (
        <>
          {'    '}
          <span className="syntax-keyword">this</span>.
          <span className="syntax-property">capabilities</span> = [
        </>
      ),
      rawText: '    this.capabilities = [',
    },
    {
      type: 'string',
      content: (
        <>
          {'      '}
          <span className="syntax-string">&quot;Autonomous Agentic Workflows&quot;</span>,
        </>
      ),
      rawText: '      "Autonomous Agentic Workflows",',
    },
    {
      type: 'string',
      content: (
        <>
          {'      '}
          <span className="syntax-string">&quot;Automated Data Entry&quot;</span>,
        </>
      ),
      rawText: '      "Automated Data Entry",',
    },
    {
      type: 'string',
      content: (
        <>
          {'      '}
          <span className="syntax-string">&quot;LLM Integration&quot;</span>
        </>
      ),
      rawText: '      "LLM Integration"',
    },
    { type: 'bracket', content: '    ];', rawText: '    ];' },
    { type: 'bracket', content: '  }', rawText: '  }' },
    { type: 'empty', content: '', rawText: '' },
    {
      type: 'function',
      content: (
        <>
          {'  '}
          <span className="syntax-keyword">function</span>{' '}
          <span className="syntax-function">fractionalDeployment</span>() {'{'}
        </>
      ),
      rawText: '  function fractionalDeployment() {',
    },
    {
      type: 'comment',
      content: (
        <span className="syntax-comment">
          {'    '}// Deploying technical pods to overhaul client tooling
        </span>
      ),
      rawText: '    // Deploying technical pods to overhaul client tooling',
    },
    {
      type: 'return',
      content: (
        <>
          {'    '}
          <span className="syntax-keyword">return</span>{' '}
          <span className="syntax-string">&quot;Operational Bottlenecks Solved&quot;</span>;
        </>
      ),
      rawText: '    return "Operational Bottlenecks Solved";',
    },
    { type: 'bracket', content: '  }', rawText: '  }' },
    { type: 'bracket', content: '}', rawText: '}' },
  ];

  const handleLineComplete = () => {
    setTypingProgress((prev) => prev + 1);
  };

  return (
    <section className="py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden">
      <div className="max-w-4xl 2xl:max-w-5xl mx-auto" ref={containerRef}>
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Section header with glitch effect */}
          <motion.div
            className="font-mono text-xs sm:text-sm 2xl:text-base text-[#7C3AED] mb-4 sm:mb-6 tracking-wider"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="text-white/50">$</span> {'>'} PROJECT: BAD_LABS_CONSOLE{' '}
            <span className="text-[#94A3B8]">(v1.0)</span>
            <motion.span
              className="inline-block w-2 h-4 bg-[#7C3AED] ml-2 align-middle"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>

          {/* Code editor window with 3D effect */}
          <motion.div
            className="relative"
            style={{
              rotateX,
              scale,
              transformPerspective: 1000,
              transformStyle: 'preserve-3d',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Glow effect on hover */}
            <motion.div
              className="absolute -inset-4 rounded-xl bg-[#7C3AED]/10 blur-xl"
              animate={{
                opacity: isHovered ? 0.6 : 0,
              }}
              transition={{ duration: 0.3 }}
            />

            <div className="relative bg-[#1F1F1F] rounded-lg overflow-hidden border border-[#2A2A2A] shadow-2xl">
              {/* Matrix rain overlay */}
              {isInView && !matrixComplete && (
                <MatrixRain
                  isInView={isInView}
                  onComplete={() => setMatrixComplete(true)}
                />
              )}

              {/* Window chrome */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#171717] border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="flex gap-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div
                      className="w-3 h-3 rounded-full bg-[#FF5F57]"
                      whileHover={{ scale: 1.2 }}
                    />
                    <motion.div
                      className="w-3 h-3 rounded-full bg-[#FEBC2E]"
                      whileHover={{ scale: 1.2 }}
                    />
                    <motion.div
                      className="w-3 h-3 rounded-full bg-[#28C840]"
                      whileHover={{ scale: 1.2 }}
                    />
                  </motion.div>
                  <span className="ml-4 font-mono text-xs text-[#94A3B8]">
                    bad-labs-console.ts
                  </span>
                </div>

                {/* Compilation status */}
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: matrixComplete ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    animate={{
                      backgroundColor:
                        typingProgress >= codeLines.length
                          ? '#10B981'
                          : typingProgress > 0
                            ? '#F59E0B'
                            : '#94A3B8',
                      boxShadow:
                        typingProgress >= codeLines.length
                          ? '0 0 8px rgba(16, 185, 129, 0.6)'
                          : 'none',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                  <span className="font-mono text-[10px] text-[#94A3B8] hidden sm:inline">
                    {typingProgress >= codeLines.length
                      ? 'COMPILED'
                      : typingProgress > 0
                        ? 'COMPILING...'
                        : 'READY'}
                  </span>
                </motion.div>
              </div>

              {/* Code block with glass reflection */}
              <div className="relative">
                {/* Scan line effect during compilation */}
                {matrixComplete && typingProgress < codeLines.length && (
                  <motion.div
                    className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent z-20"
                    initial={{ top: 0 }}
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                )}

                <div className="p-3 sm:p-4 lg:p-6 2xl:p-8 overflow-x-auto">
                  <pre className="font-mono text-xs sm:text-sm 2xl:text-base leading-relaxed">
                    <code>
                      {codeLines.map((line, index) => (
                        <AnimatedCodeLine
                          key={index}
                          line={line}
                          index={index}
                          isInView={isInView}
                          matrixComplete={matrixComplete}
                          onTypeComplete={handleLineComplete}
                        />
                      ))}
                    </code>
                  </pre>
                </div>

                {/* Glass reflection */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, transparent 100%)',
                  }}
                />
              </div>

              {/* Terminal output bar */}
              <motion.div
                className="px-4 py-2 bg-[#171717] border-t border-[#2A2A2A] font-mono text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: typingProgress >= codeLines.length ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-[#10B981]">✓</span>{' '}
                <span className="text-[#94A3B8]">Build successful.</span>{' '}
                <span className="text-[#94A3B8]/50">Ready for deployment.</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
