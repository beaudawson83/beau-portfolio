'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface DashboardProps {
  onClose: () => void;
}

export default function Dashboard({ onClose }: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-green-500/30 hover:text-green-500/60
                   transition-colors font-mono text-sm"
      >
        [ESC]
      </button>

      {/* Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-center font-mono"
      >
        <motion.div
          animate={{
            textShadow: ['0 0 10px #22c55e', '0 0 20px #22c55e', '0 0 10px #22c55e']
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-green-500 text-6xl md:text-8xl tracking-wider mb-8"
        >
          {formatTime(currentTime)}
        </motion.div>

        <div className="text-green-500/60 text-xl md:text-2xl tracking-wide">
          {formatDate(currentTime)}
        </div>

        <div className="text-green-500/30 text-xs mt-12">
          [OPERATOR DASHBOARD - ACTIVE]
        </div>

        {/* System Links */}
        <div className="mt-16 space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link
              href="/system-logs"
              className="block text-green-500/60 hover:text-green-500 font-mono text-sm transition-colors"
            >
              {'>'} ACCESS_SYSTEM_LOGS
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Link
              href="/system-logs/create"
              className="block text-green-500/40 hover:text-green-500/80 font-mono text-sm transition-colors"
            >
              {'>'} LOG_CREATOR <span className="text-yellow-500/60">[RESTRICTED]</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
