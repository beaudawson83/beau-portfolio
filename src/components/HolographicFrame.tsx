'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface HolographicFrameProps {
  src: string;
  alt: string;
  className?: string;
}

export default function HolographicFrame({ src, alt, className = '' }: HolographicFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);
  const [scanLineY, setScanLineY] = useState(0);

  // Scan line animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanLineY((prev) => (prev + 1) % 100);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  // Mouse tracking for interference effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute -inset-4 rounded-lg opacity-50"
        animate={{
          boxShadow: isHovered
            ? [
                '0 0 30px rgba(124, 58, 237, 0.4)',
                '0 0 50px rgba(124, 58, 237, 0.6)',
                '0 0 30px rgba(124, 58, 237, 0.4)',
              ]
            : '0 0 20px rgba(124, 58, 237, 0.2)',
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Frame border with animated corners */}
      <div className="absolute -inset-2 pointer-events-none">
        {/* Top left corner */}
        <motion.div
          className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#7C3AED]"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Top right corner */}
        <motion.div
          className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#7C3AED]"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        {/* Bottom left corner */}
        <motion.div
          className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#7C3AED]"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Bottom right corner */}
        <motion.div
          className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#7C3AED]"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
      </div>

      {/* Main image container */}
      <div className="relative w-full h-full overflow-hidden rounded-sm">
        {/* Base image */}
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover grayscale contrast-125"
          priority
        />

        {/* Holographic overlay layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              ${180 + (mousePos.x - 0.5) * 30}deg,
              rgba(124, 58, 237, 0) 0%,
              rgba(124, 58, 237, ${isHovered ? 0.15 : 0.05}) 50%,
              rgba(124, 58, 237, 0) 100%
            )`,
          }}
        />

        {/* Interference pattern on hover */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: `radial-gradient(
                circle at ${mousePos.x * 100}% ${mousePos.y * 100}%,
                rgba(124, 58, 237, 0.3) 0%,
                rgba(124, 58, 237, 0.1) 30%,
                transparent 50%
              )`,
            }}
          />
        )}

        {/* Scan lines overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.1) 0px,
              rgba(0, 0, 0, 0.1) 1px,
              transparent 1px,
              transparent 2px
            )`,
          }}
        />

        {/* Moving scan line */}
        <motion.div
          className="absolute left-0 right-0 h-1 pointer-events-none"
          style={{
            top: `${scanLineY}%`,
            background: 'linear-gradient(180deg, transparent, rgba(124, 58, 237, 0.3), transparent)',
          }}
        />

        {/* Edge particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[#7C3AED]"
              style={{
                left: i < 6 ? 0 : 'auto',
                right: i >= 6 ? 0 : 'auto',
                top: `${(i % 6) * 20}%`,
              }}
              animate={{
                x: i < 6 ? [-5, 5, -5] : [5, -5, 5],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* RGB shift on hover edges */}
        {isHovered && (
          <>
            <div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{
                background: 'linear-gradient(90deg, rgba(255, 0, 0, 0.05) 0%, transparent 5%)',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{
                background: 'linear-gradient(270deg, rgba(0, 255, 255, 0.05) 0%, transparent 5%)',
              }}
            />
          </>
        )}
      </div>

      {/* Status indicator */}
      <motion.div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <motion.div
          className="w-2 h-2 rounded-full bg-[#10B981]"
          animate={{
            scale: [1, 1.2, 1],
            boxShadow: [
              '0 0 0 0 rgba(16, 185, 129, 0.7)',
              '0 0 0 4px rgba(16, 185, 129, 0)',
              '0 0 0 0 rgba(16, 185, 129, 0.7)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-xs font-mono text-[#94A3B8] tracking-wider">ACTIVE</span>
      </motion.div>

      {/* Floating Y-axis animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </motion.div>
  );
}
