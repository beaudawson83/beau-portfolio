import { useRef, useEffect, useCallback } from 'react';
import { Particle, Phase, DataPulse } from './types';
import {
  COLORS,
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

  // Initialize particles - one per final node position
  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];

    // Create exactly CLARITY_NODE_COUNT particles (one per final position)
    for (let i = 0; i < CLARITY_NODE_COUNT; i++) {
      const target = STRUCTURED_POSITIONS[i];

      particles.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        prevX: Math.random() * width,
        prevY: Math.random() * height,
        targetX: (target.x / 100) * width,
        targetY: (target.y / 100) * height,
        radius: 3,
        baseRadius: 3,
        color: getChaosColor(),
        trail: [],
        group: i,
        merged: false,
        opacity: 1,
      });
    }

    return particles;
  }, []);

  // Initialize data pulses - these are the "energy" flowing through
  const initDataPulses = useCallback(() => {
    const pulses: DataPulse[] = [];
    // Create multiple pulses per connection for more visible energy flow
    STRUCTURED_CONNECTIONS.forEach((_, i) => {
      // 2-3 pulses per connection, staggered
      for (let j = 0; j < 2; j++) {
        pulses.push({
          connectionIndex: i,
          progress: j * 0.5, // Stagger them
          speed: 0.4 + Math.random() * 0.15,
        });
      }
    });
    return pulses;
  }, []);

  // Update particles based on current phase
  const updateParticles = useCallback(
    (particles: Particle[], phase: Phase, dt: number, width: number, height: number) => {
      const phaseTime = Date.now() - phaseStartTimeRef.current;

      particles.forEach((p) => {
        // Trail management
        if (phase === 'chaos') {
          p.trail.unshift({ x: p.x, y: p.y, alpha: 0.5 });
          if (p.trail.length > 6) p.trail.pop();
          p.trail.forEach((t) => (t.alpha *= 0.8));
        } else if (phase === 'transition') {
          // Keep trails during transition but let them fade
          p.trail.forEach((t) => (t.alpha *= 0.9));
          if (p.trail.length > 0 && p.trail[p.trail.length - 1].alpha < 0.05) {
            p.trail.pop();
          }
        } else {
          p.trail = [];
        }

        if (phase === 'chaos') {
          // Smooth turbulent motion using velocity
          const vx = p.x - p.prevX;
          const vy = p.y - p.prevY;

          // Add random acceleration
          const ax = (Math.random() - 0.5) * 400;
          const ay = (Math.random() - 0.5) * 400;

          p.prevX = p.x;
          p.prevY = p.y;

          // Apply velocity with damping + acceleration
          p.x += vx * 0.95 + ax * dt * dt;
          p.y += vy * 0.95 + ay * dt * dt;

          // Soft boundary bounce
          const margin = 20;
          if (p.x < margin) { p.x = margin; p.prevX = p.x + Math.abs(vx) * 0.3; }
          if (p.x > width - margin) { p.x = width - margin; p.prevX = p.x - Math.abs(vx) * 0.3; }
          if (p.y < margin) { p.y = margin; p.prevY = p.y + Math.abs(vy) * 0.3; }
          if (p.y > height - margin) { p.y = height - margin; p.prevY = p.y - Math.abs(vy) * 0.3; }

          // Pulsing size and color
          p.radius = 3 + Math.sin(Date.now() * 0.01 + p.id * 0.5) * 1;
          p.color = getChaosColor();
          p.opacity = 1;

        } else if (phase === 'transition') {
          // Smooth eased movement toward target
          const transitionDuration = 1500; // 1.5 seconds
          const progress = Math.min(1, phaseTime / transitionDuration);

          // Ease out cubic for smooth deceleration
          const eased = 1 - Math.pow(1 - progress, 3);

          // Store original chaos position on first frame of transition
          if (phaseTime < 50) {
            p.prevX = p.x;
            p.prevY = p.y;
          }

          // Interpolate from chaos position to target
          const startX = p.prevX;
          const startY = p.prevY;
          p.x = startX + (p.targetX - startX) * eased;
          p.y = startY + (p.targetY - startY) * eased;

          // Color transition
          p.color = interpolateColor(COLORS.CHAOS_NODE, COLORS.CLARITY_NODE, eased);

          // Size transition - grow slightly then settle
          const sizeProgress = Math.sin(progress * Math.PI);
          p.radius = 3 + sizeProgress * 2 + progress * 3; // End at 6

          p.opacity = 1;

        } else {
          // Clarity phase - stable positions with subtle breathing
          const breathe = Math.sin(Date.now() * 0.002) * 0.12;
          p.radius = 6 * (1 + breathe);

          // Very subtle position drift
          p.x = p.targetX + Math.sin(Date.now() * 0.0008 + p.id) * 1.5;
          p.y = p.targetY + Math.cos(Date.now() * 0.0008 + p.id * 1.3) * 1.5;

          p.color = COLORS.CLARITY_NODE;
          p.opacity = 1;
        }
      });
    },
    []
  );

  // Update data pulses - the "energy" flowing through connections
  const updateDataPulses = useCallback((pulses: DataPulse[], dt: number, phase: Phase) => {
    pulses.forEach((pulse) => {
      if (phase === 'clarity') {
        // Steady, coordinated flow
        pulse.progress += pulse.speed * dt;
        if (pulse.progress > 1) {
          pulse.progress = 0;
        }
      } else if (phase === 'chaos') {
        // Erratic, wasteful energy
        pulse.progress += (pulse.speed * 2 + Math.random() * 0.5) * dt;
        if (pulse.progress > 1 || Math.random() < 0.01) {
          pulse.progress = Math.random(); // Random reset - energy being lost
        }
      }
    });
  }, []);

  // Render everything to canvas
  const render = useCallback(
    (ctx: CanvasRenderingContext2D, particles: Particle[], pulses: DataPulse[], phase: Phase, width: number, height: number) => {
      // Clear canvas
      ctx.fillStyle = COLORS.BACKGROUND;
      ctx.fillRect(0, 0, width, height);

      // Draw connections first (behind particles)
      if (phase === 'chaos') {
        // Chaotic connections - random pairs, flickering
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.lineWidth = 1;

        for (let i = 0; i < 20; i++) {
          const p1 = particles[Math.floor(Math.random() * particles.length)];
          const p2 = particles[Math.floor(Math.random() * particles.length)];
          if (p1 === p2) continue;

          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo(
            midX + (Math.random() - 0.5) * 60,
            midY + (Math.random() - 0.5) * 60,
            p2.x,
            p2.y
          );
          ctx.stroke();
        }

        // Draw chaotic energy pulses - scattered, wasted
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        pulses.forEach((pulse) => {
          // Random positions - energy going nowhere
          const x = Math.random() * width;
          const y = Math.random() * height;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        });

      } else if (phase === 'transition') {
        // Fading chaotic connections
        const phaseTime = Date.now() - phaseStartTimeRef.current;
        const fadeOut = Math.max(0, 1 - phaseTime / 800);

        if (fadeOut > 0) {
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.1 * fadeOut})`;
          ctx.lineWidth = 1;
          for (let i = 0; i < 10; i++) {
            const p1 = particles[Math.floor(Math.random() * particles.length)];
            const p2 = particles[Math.floor(Math.random() * particles.length)];
            if (p1 === p2) continue;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Forming structured connections
        const fadeIn = Math.min(1, phaseTime / 1200);
        if (fadeIn > 0.2) {
          ctx.strokeStyle = `rgba(124, 58, 237, ${0.4 * (fadeIn - 0.2) / 0.8})`;
          ctx.lineWidth = 1.5;

          STRUCTURED_CONNECTIONS.forEach((conn) => {
            const from = particles[conn.from];
            const to = particles[conn.to];
            if (!from || !to) return;

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
          });
        }

      } else {
        // Clarity - clean structured connections
        ctx.strokeStyle = COLORS.CLARITY_CONNECTION;
        ctx.lineWidth = 2;

        STRUCTURED_CONNECTIONS.forEach((conn) => {
          const from = particles[conn.from];
          const to = particles[conn.to];
          if (!from || !to) return;

          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const arrowX = to.x - Math.cos(angle) * 10;
          const arrowY = to.y - Math.sin(angle) * 10;

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - 5 * Math.cos(angle - Math.PI / 6),
            arrowY - 5 * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - 5 * Math.cos(angle + Math.PI / 6),
            arrowY - 5 * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        });

        // HERO MOMENT: Data pulses flowing through - coordinated energy
        pulses.forEach((pulse) => {
          const conn = STRUCTURED_CONNECTIONS[pulse.connectionIndex];
          if (!conn) return;

          const from = particles[conn.from];
          const to = particles[conn.to];
          if (!from || !to) return;

          const x = from.x + (to.x - from.x) * pulse.progress;
          const y = from.y + (to.y - from.y) * pulse.progress;

          // Glowing energy pulse
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.CLARITY_PULSE;
          ctx.shadowBlur = 12;
          ctx.shadowColor = COLORS.CLARITY_PULSE;
          ctx.fill();

          // Trailing glow
          const trailX = from.x + (to.x - from.x) * Math.max(0, pulse.progress - 0.1);
          const trailY = from.y + (to.y - from.y) * Math.max(0, pulse.progress - 0.1);
          ctx.beginPath();
          ctx.arc(trailX, trailY, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(167, 139, 250, 0.4)';
          ctx.fill();

          ctx.shadowBlur = 0;
        });
      }

      // Draw particle trails (chaos phase)
      particles.forEach((p) => {
        p.trail.forEach((point) => {
          if (point.alpha < 0.05) return;
          ctx.beginPath();
          ctx.arc(point.x, point.y, p.radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${point.alpha * 0.4})`;
          ctx.fill();
        });
      });

      // Draw particles
      particles.forEach((p) => {
        // Glow effect
        if (phase === 'clarity') {
          ctx.shadowBlur = 12;
          ctx.shadowColor = COLORS.CLARITY_GLOW;
        } else if (phase === 'chaos') {
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
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

      // Initialize data pulses at start
      if (dataPulsesRef.current.length === 0) {
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

      // Initialize particles
      particlesRef.current = initParticles(rect.width, rect.height);
      dataPulsesRef.current = initDataPulses();
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
      updateDataPulses(dataPulsesRef.current, dt, options.phase);

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
    options.phase,
    options.isInView,
    initParticles,
    initDataPulses,
    updateParticles,
    updateDataPulses,
    render,
  ]);

  // Reinitialize on cycle reset
  const resetParticles = useCallback(() => {
    const { width, height } = dimensionsRef.current;
    if (width && height) {
      particlesRef.current = initParticles(width, height);
    }
  }, [initParticles]);

  return { resetParticles };
}
