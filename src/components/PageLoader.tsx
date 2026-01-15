'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_MESSAGES = [
  { text: 'INITIALIZING SYSTEM...', delay: 0 },
  { text: 'LOADING NEURAL NETWORKS...', delay: 400 },
  { text: 'CALIBRATING PARTICLE SYSTEMS...', delay: 800 },
  { text: 'ESTABLISHING SECURE CONNECTION...', delay: 1200 },
  { text: 'MOUNTING EXPERIENCE MODULES...', delay: 1600 },
  { text: 'SYSTEM READY', delay: 2000 },
];

export default function PageLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Matrix rain effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const columns = Math.floor(canvas.width / 20);
    const drops: number[] = Array(columns).fill(1);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]|;:<>?/~`';
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const context = ctx; // Capture for closure

    function draw() {
      context.fillStyle = 'rgba(17, 17, 17, 0.05)';
      context.fillRect(0, 0, canvasWidth, canvasHeight);

      context.fillStyle = '#7C3AED';
      context.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 20;
        const y = drops[i] * 20;

        context.globalAlpha = Math.random() * 0.5 + 0.5;
        context.fillText(char, x, y);

        if (y > canvasHeight && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      context.globalAlpha = 1;
    }

    const interval = setInterval(draw, 33);

    return () => clearInterval(interval);
  }, []);

  // Progress and message updates
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 100);

    // Message updates
    BOOT_MESSAGES.forEach((msg, index) => {
      setTimeout(() => {
        setCurrentMessage(index);
        if (index === BOOT_MESSAGES.length - 1) {
          // Final message - trigger glitch and exit
          setGlitchActive(true);
          setTimeout(() => {
            setIsLoading(false);
          }, 800);
        }
      }, msg.delay);
    });

    return () => clearInterval(progressInterval);
  }, []);

  // Random glitch flickers
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 100);
      }
    }, 200);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-[#111111] flex items-center justify-center overflow-hidden"
        >
          {/* Matrix rain background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 opacity-30"
          />

          {/* Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
              }}
            />
          </div>

          {/* Glitch overlay */}
          {glitchActive && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute inset-0 bg-[#7C3AED] mix-blend-overlay opacity-20"
                style={{
                  transform: `translateX(${Math.random() * 10 - 5}px)`,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255,0,0,0.1), transparent 33%, transparent 66%, rgba(0,255,255,0.1))',
                }}
              />
            </div>
          )}

          {/* Main content */}
          <div className="relative z-10 text-center">
            {/* Logo / Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1
                className={`font-mono text-4xl md:text-6xl font-bold tracking-wider ${
                  glitchActive ? 'glitch-text' : ''
                }`}
                style={{
                  color: glitchActive ? '#fff' : '#7C3AED',
                  textShadow: '0 0 20px rgba(124, 58, 237, 0.5)',
                }}
              >
                BEAU.SYS
              </h1>
              <div className="h-0.5 w-32 mx-auto mt-4 bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent" />
            </motion.div>

            {/* Boot messages */}
            <div className="h-8 mb-8">
              <motion.p
                key={currentMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="font-mono text-sm md:text-base text-[#94A3B8] tracking-widest"
              >
                {BOOT_MESSAGES[currentMessage]?.text}
                <span className="typing-cursor">_</span>
              </motion.p>
            </div>

            {/* Progress bar */}
            <div className="w-64 md:w-80 mx-auto">
              <div className="relative h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-y-0 left-0 bg-[#7C3AED] blur-sm"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.1 }}
                  style={{ opacity: 0.5 }}
                />
              </div>
              <p className="font-mono text-xs text-[#94A3B8] mt-2 tracking-wider">
                {Math.min(Math.round(progress), 100)}%
              </p>
            </div>

            {/* Decorative elements */}
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)',
                }}
              />
            </div>
          </div>

          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-[#7C3AED]/30" />
          <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-[#7C3AED]/30" />
          <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-[#7C3AED]/30" />
          <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-[#7C3AED]/30" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
