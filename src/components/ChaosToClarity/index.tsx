'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { Phase } from './types';
import { TIMING, getOptimalParticleCount } from './constants';
import { useParticleSystem } from './useParticleSystem';

export default function ChaosToClarity() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: '-100px' });

  const [phase, setPhase] = useState<Phase>('chaos');
  const [particleCount, setParticleCount] = useState(50);

  // Get optimal particle count on mount
  useEffect(() => {
    setParticleCount(getOptimalParticleCount());
  }, []);

  // Use particle system
  const { resetParticles } = useParticleSystem(canvasRef, {
    particleCount,
    phase,
    isInView,
  });

  // Phase cycling
  useEffect(() => {
    if (!isInView) {
      setPhase('chaos');
      return;
    }

    const transitionTimer = setTimeout(() => {
      setPhase('transition');
    }, TIMING.TRANSITION_START);

    const clarityTimer = setTimeout(() => {
      setPhase('clarity');
    }, TIMING.CLARITY_START);

    const resetTimer = setTimeout(() => {
      setPhase('chaos');
      resetParticles();
    }, TIMING.CYCLE_DURATION);

    return () => {
      clearTimeout(transitionTimer);
      clearTimeout(clarityTimer);
      clearTimeout(resetTimer);
    };
  }, [isInView, resetParticles]);

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
            Watch inefficient workflows transform into streamlined, automated processes
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
                  initial={{ scale: 1 }}
                  animate={{
                    scale: phase === 'transition' ? [1, 1.05, 1] : 1,
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: phase === 'transition' ? Infinity : 0,
                  }}
                >
                  {phase === 'chaos'
                    ? 'ANALYZING'
                    : phase === 'transition'
                      ? 'OPTIMIZING'
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
