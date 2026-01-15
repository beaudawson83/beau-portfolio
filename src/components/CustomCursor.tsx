'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const lastMoveTime = useRef(0);
  const lastHoverCheck = useRef(0);
  const cachedIsInteractive = useRef(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Optimized spring configs - reduced stiffness for smoother performance
  const springConfig = { damping: 30, stiffness: 300 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  // Outer ring with more lag
  const outerSpringConfig = { damping: 25, stiffness: 120 };
  const outerXSpring = useSpring(cursorX, outerSpringConfig);
  const outerYSpring = useSpring(cursorY, outerSpringConfig);

  // Memoized hover detection with throttling
  const checkInteractive = useCallback((target: HTMLElement): boolean => {
    return Boolean(
      target.tagName === 'A' ||
      target.tagName === 'BUTTON' ||
      target.closest('a') ||
      target.closest('button') ||
      target.getAttribute('role') === 'button'
    );
  }, []);

  useEffect(() => {
    // Check if device has pointer
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    if (!hasPointer) return;

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle to ~60fps
      const now = Date.now();
      if (now - lastMoveTime.current < 16) return;
      lastMoveTime.current = now;

      setIsVisible(true);
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      // Throttle hover detection to ~15fps (expensive DOM check)
      if (now - lastHoverCheck.current > 66) {
        lastHoverCheck.current = now;
        const target = e.target as HTMLElement;
        const isInteractive = checkInteractive(target);
        if (isInteractive !== cachedIsInteractive.current) {
          cachedIsInteractive.current = isInteractive;
          setIsHovering(isInteractive);
        }
      }
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    // Hide default cursor
    document.body.style.cursor = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'auto';
    };
  }, [cursorX, cursorY, checkInteractive]);

  // Don't render on mobile/touch devices
  if (typeof window !== 'undefined') {
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (!hasPointer || prefersReducedMotion) return null;
  }

  return (
    <>
      {/* Outer ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998] mix-blend-difference"
        style={{
          x: outerXSpring,
          y: outerYSpring,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovering ? 1.5 : isClicking ? 0.8 : 1,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.15 }}
      >
        <div
          className="w-10 h-10 rounded-full border border-white/50"
          style={{
            boxShadow: isHovering
              ? '0 0 20px rgba(124, 58, 237, 0.5)'
              : 'none',
          }}
        />
      </motion.div>

      {/* Inner dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998]"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isClicking ? 0.5 : 1,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.1 }}
      >
        <div
          className="w-2 h-2 rounded-full bg-[#7C3AED]"
          style={{
            boxShadow: '0 0 10px rgba(124, 58, 237, 0.8)',
          }}
        />
      </motion.div>

      {/* Click ripple effect */}
      {isClicking && (
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[9997]"
          style={{
            x: cursorX.get(),
            y: cursorY.get(),
            translateX: '-50%',
            translateY: '-50%',
          }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="w-10 h-10 rounded-full border-2 border-[#7C3AED]" />
        </motion.div>
      )}
    </>
  );
}
