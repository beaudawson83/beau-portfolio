'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LoginScreenProps } from '../types';

export default function UnknownDB({ onPhaseChange, onComplete }: LoginScreenProps) {
  const [phase, setPhase] = useState<'glitching' | 'revealed' | 'complete'>('glitching');
  const [glitchText, setGlitchText] = useState('████████████');

  useEffect(() => {
    // Glitch effect on the title
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let iterations = 0;
    const maxIterations = 15;

    const glitchInterval = setInterval(() => {
      if (iterations >= maxIterations) {
        setGlitchText('[UNKNOWN DATABASE]');
        setPhase('revealed');
        clearInterval(glitchInterval);
        return;
      }

      let result = '';
      for (let i = 0; i < 18; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      setGlitchText(result);
      iterations++;
    }, 50);

    return () => clearInterval(glitchInterval);
  }, []);

  useEffect(() => {
    if (phase === 'revealed') {
      onPhaseChange?.('authenticating');
      const timer = setTimeout(() => {
        setPhase('complete');
        onPhaseChange?.('granted');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (phase === 'complete') {
      const timer = setTimeout(() => {
        onComplete();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated red scanlines */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0 h-[1px] bg-red-500/20"
            style={{ top: `${i * 5}%` }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scaleX: [1, 1.02, 1],
            }}
            transition={{
              duration: 0.5,
              delay: i * 0.05,
              repeat: Infinity,
            }}
          />
        ))}
      </div>

      {/* Pulsing red border */}
      <motion.div
        className="absolute inset-4 border-2 border-red-500/50 pointer-events-none"
        animate={{
          borderColor: ['rgba(239,68,68,0.3)', 'rgba(239,68,68,0.7)', 'rgba(239,68,68,0.3)'],
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />

      {/* Corner decorations */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-8 h-8 border-red-500/50
          ${i < 2 ? 'border-t-2' : 'border-b-2'}
          ${i % 2 === 0 ? 'border-l-2' : 'border-r-2'}`}
        />
      ))}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center z-10"
      >
        {/* Glitching/revealed title */}
        <motion.div
          className={`font-mono text-2xl md:text-3xl tracking-wider mb-8
            ${phase === 'glitching' ? 'text-red-500 glitch-text' : 'text-red-400'}`}
          animate={phase === 'glitching' ? {
            x: [0, -2, 2, -1, 1, 0],
          } : {}}
          transition={{ duration: 0.1, repeat: phase === 'glitching' ? Infinity : 0 }}
        >
          {glitchText}
        </motion.div>

        {phase !== 'complete' ? (
          <>
            {/* Warning messages */}
            <div className="space-y-2 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-red-500/80 text-sm font-mono"
              >
                ⚠ UNAUTHORIZED ACCESS DETECTED ⚠
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-red-400/60 text-xs font-mono"
              >
                TRACING CONNECTION...
              </motion.div>
            </div>

            {/* Fake progress */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="w-64 mx-auto"
            >
              <div className="h-1 bg-red-900/50 rounded overflow-hidden">
                <motion.div
                  className="h-full bg-red-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.2, ease: 'linear' }}
                />
              </div>
              <div className="text-red-500/60 text-xs font-mono mt-2">
                BYPASSING FIREWALL...
              </div>
            </motion.div>
          </>
        ) : (
          /* Final "Connection Established" */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            <motion.div
              className="text-green-500 text-3xl md:text-4xl font-mono tracking-widest mb-4"
              animate={{
                textShadow: [
                  '0 0 10px rgba(34,197,94,0.5)',
                  '0 0 20px rgba(34,197,94,0.8)',
                  '0 0 10px rgba(34,197,94,0.5)',
                ],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              CONNECTION ESTABLISHED
            </motion.div>
            <div className="text-green-400/60 text-sm font-mono">
              INITIALIZING SECURE TERMINAL...
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom status */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <div className="text-red-500/40 text-xs font-mono">
          {phase !== 'complete' ? (
            <>NODE: ███-████-██ • ENCRYPTED • LOCATION: UNKNOWN</>
          ) : (
            <span className="text-green-500/60">
              SECURE CHANNEL ACTIVE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
