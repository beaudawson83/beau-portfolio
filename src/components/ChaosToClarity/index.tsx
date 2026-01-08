'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Phase } from './types';
import { useParticleSystem } from './useParticleSystem';

export default function ChaosToClarity() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: '-100px' });

  const [phase, setPhase] = useState<Phase>('chaos');
  const [isActivating, setIsActivating] = useState(false);

  // Use particle system
  const { resetParticles } = useParticleSystem(canvasRef, {
    particleCount: 12,
    phase,
    isInView,
  });

  // Handle button click - trigger the transformation
  const handleActivate = useCallback(() => {
    if (phase !== 'chaos' || isActivating) return;

    setIsActivating(true);
    setPhase('transition');

    // Transition to clarity after animation
    setTimeout(() => {
      setPhase('clarity');
      setIsActivating(false);
    }, 1800);
  }, [phase, isActivating]);

  // Reset to chaos
  const handleReset = useCallback(() => {
    setPhase('chaos');
    resetParticles();
  }, [resetParticles]);

  // Stats based on phase
  const stats = {
    efficiency: phase === 'chaos' ? '23%' : phase === 'clarity' ? '94%' : '...',
    bottlenecks: phase === 'chaos' ? '12' : phase === 'clarity' ? '0' : '...',
    automation: phase === 'chaos' ? '0%' : phase === 'clarity' ? '100%' : '...',
  };

  const statColor =
    phase === 'chaos' ? '#EF4444' : phase === 'clarity' ? '#10B981' : '#94A3B8';

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-mono text-[#94A3B8] text-sm sm:text-base mb-4">
            // PROCESS_OPTIMIZATION
          </h2>
          <p className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">
            From Manual Chaos to Automated Clarity
          </p>
          <p className="text-[#94A3B8] text-sm sm:text-base max-w-xl mx-auto">
            See how inefficient workflows transform into streamlined, automated processes
          </p>
        </motion.div>

        {/* Animation Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                  <span className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                  <span className="w-3 h-3 rounded-full bg-[#10B981]/60" />
                </div>
                <span className="font-mono text-sm text-white uppercase tracking-wider">
                  Workflow_Transform
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.span
                  className={`font-mono text-xs uppercase px-2 py-1 rounded transition-colors duration-300 ${
                    phase === 'chaos'
                      ? 'bg-red-900/50 text-red-400'
                      : phase === 'transition'
                        ? 'bg-yellow-900/50 text-yellow-400'
                        : 'bg-emerald-900/50 text-emerald-400'
                  }`}
                >
                  {phase === 'chaos'
                    ? 'INEFFICIENT'
                    : phase === 'transition'
                      ? 'OPTIMIZING...'
                      : 'OPTIMIZED'}
                </motion.span>
              </div>
            </div>

            {/* Canvas Animation Area */}
            <div className="relative aspect-[2/1] min-h-[300px]">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ background: '#0D0D0D' }}
              />

              {/* Center Status (transition only) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                  {phase === 'transition' && (
                    <motion.div
                      key="transitioning"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex flex-col items-center gap-3"
                    >
                      {/* Spinning ring */}
                      <motion.div
                        className="w-16 h-16 rounded-full border-2 border-violet-500/30 border-t-violet-500"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <span className="font-mono text-sm text-violet-400 uppercase tracking-wider">
                        Optimizing...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Phase Labels */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none">
                <motion.div
                  animate={{ opacity: phase === 'chaos' ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-xs text-red-400 flex items-center"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2" />
                  CHAOS
                </motion.div>
                <motion.div
                  animate={{ opacity: phase === 'clarity' ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-xs text-emerald-400 flex items-center"
                >
                  CLARITY
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 ml-2" />
                </motion.div>
              </div>
            </div>

            {/* Control Bar */}
            <div className="px-4 py-3 bg-[#1A1A1A] border-t border-[#2A2A2A] flex items-center justify-center gap-3">
              <AnimatePresence mode="wait">
                {phase === 'chaos' && (
                  <motion.button
                    key="activate-btn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleActivate}
                    disabled={isActivating}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 border border-violet-400/50 rounded font-mono text-xs uppercase tracking-wider text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Activate Beau Protocol
                  </motion.button>
                )}

                {phase === 'transition' && (
                  <motion.div
                    key="transition-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded font-mono text-xs uppercase tracking-wider text-[#94A3B8]"
                  >
                    <motion.div
                      className="w-3 h-3 border-2 border-violet-400/30 border-t-violet-400 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Processing...
                  </motion.div>
                )}

                {phase === 'clarity' && (
                  <motion.button
                    key="reset-btn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-[#4A4A4A] rounded font-mono text-xs uppercase tracking-wider text-[#94A3B8] hover:text-white transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Demo
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Stats */}
            <div className="px-4 py-3 bg-[#1A1A1A] border-t border-[#2A2A2A] grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-mono text-xs text-[#666] uppercase mb-1">
                  Efficiency
                </div>
                <motion.div
                  className="font-mono text-sm font-medium"
                  animate={{ color: statColor }}
                  transition={{ duration: 0.3 }}
                >
                  {stats.efficiency}
                </motion.div>
              </div>
              <div>
                <div className="font-mono text-xs text-[#666] uppercase mb-1">
                  Bottlenecks
                </div>
                <motion.div
                  className="font-mono text-sm font-medium"
                  animate={{ color: statColor }}
                  transition={{ duration: 0.3 }}
                >
                  {stats.bottlenecks}
                </motion.div>
              </div>
              <div>
                <div className="font-mono text-xs text-[#666] uppercase mb-1">
                  Automation
                </div>
                <motion.div
                  className="font-mono text-sm font-medium"
                  animate={{ color: statColor }}
                  transition={{ duration: 0.3 }}
                >
                  {stats.automation}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
