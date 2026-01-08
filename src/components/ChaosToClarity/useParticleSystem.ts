import { useRef, useEffect, useCallback } from 'react';
import { Particle, Phase, DataPulse } from './types';
import {
  COLORS,
  PHYSICS,
  STRUCTURED_POSITIONS,
  STRUCTURED_CONNECTIONS,
  CLARITY_NODE_COUNT,
  interpolateColor,
  getChaosColor,
} from './constants';

interface UseParticleSystemOptions {
  particleCount: number;
  phase: Phase;
  isInView: boolean;
}

export function useParticleSystem(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UseParticleSystemOptions
) {
  const particlesRef = useRef<Particle[]>([]);
  const dataPulsesRef = useRef<DataPulse[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const phaseStartTimeRef = useRef<number>(Date.now());
  const prevPhaseRef = useRef<Phase>(options.phase);

  // Initialize particles
  const initParticles = useCallback((count: number, width: number, height: number) => {
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const groupIndex = i % CLARITY_NODE_COUNT;
      const target = STRUCTURED_POSITIONS[groupIndex];

      particles.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        prevX: Math.random() * width,
        prevY: Math.random() * height,
        targetX: (target.x / 100) * width,
        targetY: (target.y / 100) * height,
        radius: 2 + Math.random() * 1.5,
        baseRadius: 2 + Math.random() * 1.5,
        color: getChaosColor(),
        trail: [],
        group: groupIndex,
        merged: false,
        opacity: 1,
      });
    }

    return particles;
  }, []);

  // Initialize data pulses for clarity phase
  const initDataPulses = useCallback(() => {
    return STRUCTURED_CONNECTIONS.map((_, i) => ({
      connectionIndex: i,
      progress: Math.random(),
      speed: 0.3 + Math.random() * 0.2,
    }));
  }, []);

  // Update particles based on current phase
  const updateParticles = useCallback(
    (particles: Particle[], phase: Phase, dt: number, width: number, height: number) => {
      const phaseTime = Date.now() - phaseStartTimeRef.current;

      particles.forEach((p, index) => {
        // Update trail
        if (phase === 'chaos' || phase === 'transition') {
          p.trail.unshift({ x: p.x, y: p.y, alpha: 0.6 });
          if (p.trail.length > PHYSICS.TRAIL_LENGTH) p.trail.pop();
          p.trail.forEach((t) => (t.alpha *= PHYSICS.TRAIL_DECAY));
        } else {
          p.trail = [];
        }

        if (phase === 'chaos') {
          // Verlet integration with turbulence
          const ax = (Math.random() - 0.5) * PHYSICS.TURBULENCE_STRENGTH;
          const ay = (Math.random() - 0.5) * PHYSICS.TURBULENCE_STRENGTH;

          const tempX = p.x;
          const tempY = p.y;

          // Verlet: x_new = 2*x - x_prev + a*dt^2
          p.x = 2 * p.x - p.prevX + ax * dt * dt;
          p.y = 2 * p.y - p.prevY + ay * dt * dt;

          p.prevX = tempX;
          p.prevY = tempY;

          // Boundary bounce with damping
          const margin = 10;
          if (p.x < margin) {
            p.x = margin;
            p.prevX = p.x + (p.x - p.prevX) * 0.5;
          }
          if (p.x > width - margin) {
            p.x = width - margin;
            p.prevX = p.x + (p.x - p.prevX) * 0.5;
          }
          if (p.y < margin) {
            p.y = margin;
            p.prevY = p.y + (p.y - p.prevY) * 0.5;
          }
          if (p.y > height - margin) {
            p.y = height - margin;
            p.prevY = p.y + (p.y - p.prevY) * 0.5;
          }

          // Pulsing size
          p.radius = p.baseRadius * (0.8 + Math.sin(Date.now() * 0.015 + p.id) * 0.4);
          p.color = getChaosColor();
          p.opacity = 1;
          p.merged = false;
        } else if (phase === 'transition') {
          // Calculate staggered delay based on group (center groups first)
          const groupOrder = [5, 6, 3, 4, 7, 8, 0, 1, 2, 9, 10, 11];
          const groupDelay = groupOrder.indexOf(p.group) * 80; // ms
          const effectiveTime = Math.max(0, phaseTime - groupDelay);

          if (effectiveTime > 0) {
            // Spring physics toward target
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const vx = p.x - p.prevX;
            const vy = p.y - p.prevY;

            const ax = dx * PHYSICS.SPRING_STIFFNESS - vx * PHYSICS.SPRING_DAMPING;
            const ay = dy * PHYSICS.SPRING_STIFFNESS - vy * PHYSICS.SPRING_DAMPING;

            p.prevX = p.x;
            p.prevY = p.y;
            p.x += vx + ax * dt * dt;
            p.y += vy + ay * dt * dt;

            // Determine if this particle should merge (only keep one per group)
            const particlesInGroup = particles.filter((other) => other.group === p.group);
            const shouldMerge = particlesInGroup.indexOf(p) !== 0;

            if (shouldMerge) {
              // Fade out particles that will merge
              const distance = Math.sqrt(dx * dx + dy * dy);
              const fadeProgress = Math.min(1, effectiveTime / 600);
              p.opacity = Math.max(0, 1 - fadeProgress);
              p.merged = fadeProgress > 0.8;
            }

            // Color transition
            const progress = Math.min(1, effectiveTime / 500);
            p.color = interpolateColor(COLORS.CHAOS_NODE, COLORS.CLARITY_NODE, progress);

            // Size transition toward uniform
            const targetRadius = 5;
            p.radius = p.baseRadius + (targetRadius - p.baseRadius) * progress;
          }
        } else {
          // Clarity phase - militant/functional
          // Only show non-merged particles (one per group)
          const particlesInGroup = particles.filter((other) => other.group === p.group);
          const isLeader = particlesInGroup.indexOf(p) === 0;

          if (!isLeader) {
            p.opacity = 0;
            p.merged = true;
          } else {
            p.opacity = 1;
            p.merged = false;

            // Subtle synchronized breathing (all nodes pulse together)
            const breathPhase = Math.sin(Date.now() * 0.003) * 0.15;
            p.radius = 5 * (1 + breathPhase);

            // Gentle position hold (minimal movement)
            p.x = p.targetX + Math.sin(Date.now() * 0.001) * 1;
            p.y = p.targetY + Math.cos(Date.now() * 0.001) * 1;

            p.color = COLORS.CLARITY_NODE;
          }
        }
      });
    },
    []
  );

  // Update data pulses
  const updateDataPulses = useCallback((pulses: DataPulse[], dt: number) => {
    pulses.forEach((pulse) => {
      pulse.progress += pulse.speed * dt;
      if (pulse.progress > 1) {
        pulse.progress = 0;
        pulse.speed = 0.3 + Math.random() * 0.2;
      }
    });
  }, []);

  // Render everything to canvas
  const render = useCallback(
    (ctx: CanvasRenderingContext2D, particles: Particle[], pulses: DataPulse[], phase: Phase, width: number, height: number) => {
      // Clear with motion blur for transition
      if (phase === 'transition') {
        ctx.fillStyle = 'rgba(13, 13, 13, 0.15)';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = COLORS.BACKGROUND;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw connections
      if (phase === 'chaos') {
        // Chaotic bezier connections
        ctx.strokeStyle = COLORS.CHAOS_CONNECTION;
        ctx.lineWidth = 0.5;

        const connectionCount = 25;
        for (let i = 0; i < connectionCount; i++) {
          const p1 = particles[Math.floor(Math.random() * particles.length)];
          const p2 = particles[Math.floor(Math.random() * particles.length)];
          if (p1 === p2 || p1.opacity < 0.5 || p2.opacity < 0.5) continue;

          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const offset = 40;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.bezierCurveTo(
            midX + (Math.random() - 0.5) * offset,
            midY + (Math.random() - 0.5) * offset,
            midX + (Math.random() - 0.5) * offset,
            midY + (Math.random() - 0.5) * offset,
            p2.x,
            p2.y
          );
          ctx.stroke();
        }
      } else if (phase === 'clarity') {
        // Clean structured connections with arrows
        ctx.strokeStyle = COLORS.CLARITY_CONNECTION;
        ctx.lineWidth = 1.5;

        const leaderParticles = particles.filter((p) => !p.merged && p.opacity > 0.5);

        STRUCTURED_CONNECTIONS.forEach((conn) => {
          const fromParticle = leaderParticles.find((p) => p.group === conn.from);
          const toParticle = leaderParticles.find((p) => p.group === conn.to);

          if (!fromParticle || !toParticle) return;

          ctx.beginPath();
          ctx.moveTo(fromParticle.x, fromParticle.y);
          ctx.lineTo(toParticle.x, toParticle.y);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(toParticle.y - fromParticle.y, toParticle.x - fromParticle.x);
          const arrowLength = 6;
          const arrowX = toParticle.x - Math.cos(angle) * 8;
          const arrowY = toParticle.y - Math.sin(angle) * 8;

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
            arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
            arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        });

        // Data pulses
        const leaderByGroup = new Map<number, Particle>();
        leaderParticles.forEach((p) => leaderByGroup.set(p.group, p));

        pulses.forEach((pulse) => {
          const conn = STRUCTURED_CONNECTIONS[pulse.connectionIndex];
          if (!conn) return;

          const from = leaderByGroup.get(conn.from);
          const to = leaderByGroup.get(conn.to);
          if (!from || !to) return;

          const x = from.x + (to.x - from.x) * pulse.progress;
          const y = from.y + (to.y - from.y) * pulse.progress;

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.CLARITY_PULSE;
          ctx.shadowBlur = 8;
          ctx.shadowColor = COLORS.CLARITY_PULSE;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // Draw particle trails
      particles.forEach((p) => {
        if (p.opacity < 0.1) return;

        p.trail.forEach((point) => {
          if (point.alpha < 0.05) return;
          ctx.beginPath();
          ctx.arc(point.x, point.y, p.radius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${point.alpha * 0.3 * p.opacity})`;
          ctx.fill();
        });
      });

      // Draw particles
      particles.forEach((p) => {
        if (p.opacity < 0.1) return;

        // Glow effect
        if (phase === 'clarity' && !p.merged) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = COLORS.CLARITY_GLOW;
        } else if (phase === 'chaos') {
          ctx.shadowBlur = 4;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });
    },
    []
  );

  // Handle phase changes
  useEffect(() => {
    if (prevPhaseRef.current !== options.phase) {
      phaseStartTimeRef.current = Date.now();
      prevPhaseRef.current = options.phase;

      // Initialize data pulses when entering clarity
      if (options.phase === 'clarity') {
        dataPulsesRef.current = initDataPulses();
      }
    }
  }, [options.phase, initDataPulses]);

  // Main animation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      dimensionsRef.current = { width: rect.width, height: rect.height };

      // Reinitialize particles with new dimensions
      particlesRef.current = initParticles(
        options.particleCount,
        rect.width,
        rect.height
      );

      // Update target positions for new dimensions
      particlesRef.current.forEach((p) => {
        const target = STRUCTURED_POSITIONS[p.group];
        p.targetX = (target.x / 100) * rect.width;
        p.targetY = (target.y / 100) * rect.height;
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Animation loop
    const animate = (currentTime: number) => {
      if (!options.isInView) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = currentTime;

      const { width, height } = dimensionsRef.current;

      // Update
      updateParticles(particlesRef.current, options.phase, dt, width, height);
      if (options.phase === 'clarity') {
        updateDataPulses(dataPulsesRef.current, dt);
      }

      // Render
      render(ctx, particlesRef.current, dataPulsesRef.current, options.phase, width, height);

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    canvasRef,
    options.particleCount,
    options.phase,
    options.isInView,
    initParticles,
    updateParticles,
    updateDataPulses,
    render,
  ]);

  // Reinitialize on cycle reset
  const resetParticles = useCallback(() => {
    const { width, height } = dimensionsRef.current;
    if (width && height) {
      particlesRef.current = initParticles(options.particleCount, width, height);
      particlesRef.current.forEach((p) => {
        const target = STRUCTURED_POSITIONS[p.group];
        p.targetX = (target.x / 100) * width;
        p.targetY = (target.y / 100) * height;
      });
    }
  }, [initParticles, options.particleCount]);

  return { resetParticles };
}
