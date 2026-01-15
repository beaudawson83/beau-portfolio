'use client';

import { useRef, useEffect, useState } from 'react';

interface MatrixRainProps {
  isInView: boolean;
  onComplete?: () => void;
}

const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*(){}[]|;:,.<>?/~`';

export default function MatrixRain({ isInView, onComplete }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!isInView || completed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context = ctx;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    context.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);

    // Initialize drops at random positions above canvas
    const drops: number[] = [];
    const dropSpeeds: number[] = [];
    const dropChars: string[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = -Math.random() * 50;
      dropSpeeds[i] = 0.5 + Math.random() * 1.5;
      dropChars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    }

    let frameCount = 0;
    const duration = 120; // frames until complete
    let animationId: number;

    function draw() {
      // Fade trail effect
      context.fillStyle = 'rgba(31, 31, 31, 0.1)';
      context.fillRect(0, 0, width, height);

      context.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Randomly change character
        if (Math.random() > 0.95) {
          dropChars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        }

        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Leading character is bright
        context.fillStyle = '#7C3AED';
        context.shadowBlur = 10;
        context.shadowColor = '#7C3AED';
        context.fillText(dropChars[i], x, y);

        // Trail characters fade
        for (let j = 1; j < 8; j++) {
          const trailY = y - j * fontSize;
          const alpha = (8 - j) / 10;
          const trailChar = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

          context.fillStyle = `rgba(124, 58, 237, ${alpha * 0.5})`;
          context.shadowBlur = 0;
          context.fillText(trailChar, x, trailY);
        }

        // Reset shadow
        context.shadowBlur = 0;

        // Move drop down
        drops[i] += dropSpeeds[i];

        // Reset drop when it reaches bottom or randomly
        if (drops[i] * fontSize > height && Math.random() > 0.99) {
          drops[i] = 0;
        }
      }

      frameCount++;

      // Gradually slow down and fade out
      if (frameCount > duration) {
        const fadeProgress = (frameCount - duration) / 30;

        if (fadeProgress >= 1) {
          setCompleted(true);
          onComplete?.();
          return;
        }

        // Stronger fade
        context.fillStyle = `rgba(31, 31, 31, ${0.1 + fadeProgress * 0.3})`;
        context.fillRect(0, 0, width, height);
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isInView, completed, onComplete]);

  if (completed) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ background: 'transparent' }}
    />
  );
}
