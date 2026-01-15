'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnergyButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  className?: string;
}

interface RippleEffect {
  id: number;
  x: number;
  y: number;
}

export default function EnergyButton({
  children,
  variant = 'primary',
  onClick,
  className = '',
}: EnergyButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const [energyRings, setEnergyRings] = useState<number[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add ripple effect
    const newRipple: RippleEffect = {
      id: Date.now(),
      x,
      y,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    onClick?.();
  };

  const handleHoverStart = () => {
    setIsHovered(true);
    // Trigger energy ring expansion
    const ringId = Date.now();
    setEnergyRings((prev) => [...prev, ringId]);

    setTimeout(() => {
      setEnergyRings((prev) => prev.filter((r) => r !== ringId));
    }, 800);
  };

  const handleHoverEnd = () => {
    setIsHovered(false);
  };

  const isPrimary = variant === 'primary';

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      className={`
        relative overflow-hidden px-6 py-3 font-mono text-sm tracking-wider uppercase
        transition-colors duration-300
        ${
          isPrimary
            ? 'bg-[#7C3AED] text-white border border-[#7C3AED]'
            : 'bg-transparent text-[#7C3AED] border border-[#7C3AED]'
        }
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background glow on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: isHovered
            ? isPrimary
              ? 'radial-gradient(circle at center, rgba(167, 139, 250, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(124, 58, 237, 0.2) 0%, transparent 70%)'
            : 'none',
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Expanding energy rings on hover */}
      <AnimatePresence>
        {energyRings.map((ringId) => (
          <motion.div
            key={ringId}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`rounded-full border ${
                isPrimary ? 'border-white/30' : 'border-[#7C3AED]/50'
              }`}
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{ width: 200, height: 200, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Click ripple effects */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            className="absolute pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div
              className={`w-10 h-10 -ml-5 -mt-5 rounded-full ${
                isPrimary ? 'bg-white' : 'bg-[#7C3AED]'
              }`}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Breathing glow border */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          boxShadow: isHovered
            ? [
                `0 0 10px ${isPrimary ? 'rgba(124, 58, 237, 0.5)' : 'rgba(124, 58, 237, 0.3)'}`,
                `0 0 20px ${isPrimary ? 'rgba(124, 58, 237, 0.7)' : 'rgba(124, 58, 237, 0.5)'}`,
                `0 0 10px ${isPrimary ? 'rgba(124, 58, 237, 0.5)' : 'rgba(124, 58, 237, 0.3)'}`,
              ]
            : '0 0 0 transparent',
        }}
        transition={{
          duration: 1.5,
          repeat: isHovered ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />

      {/* Animated border (pseudo scanning effect) */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
