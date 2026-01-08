import { useRef, useEffect, useCallback } from 'react';
import { Particle, Phase, DataPulse, ChaosPulse } from './types';
import {
  COLORS,
  STRUCTURED_POSITIONS,
  STRUCTURED_CONNECTIONS,
  CLARITY_NODE_COUNT,
  OUTPUT_ENDPOINT_INDICES,
  CHAOS_PULSE_CONFIG,
  interpolateColor,
} from './constants';

interface UseParticleSystemOptions {
  particleCount: number;
  phase: Phase;
  isInView: boolean;
}

// More particles for visual density in chaos
const CHAOS_PARTICLE_COUNT = 40;

export function useParticleSystem(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UseParticleSystemOptions
) {
  const particlesRef = useRef<Particle[]>([]);
  const dataPulsesRef = useRef<DataPulse[]>([]);
  const chaosPulsesRef = useRef<ChaosPulse[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const phaseStartTimeRef = useRef<number>(Date.now());
  const prevPhaseRef = useRef<Phase>(options.phase);
  const chaosPositionsRef = useRef<{x: number, y: number}[]>([]);

  // Initialize particles for chaos state - more particles, scattered
  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];

    for (let i = 0; i < CHAOS_PARTICLE_COUNT; i++) {
      // Assign to a final node group (for transition)
      const groupIndex = i % CLARITY_NODE_COUNT;
      const target = STRUCTURED_POSITIONS[groupIndex];

      const startX = Math.random() * width;
      const startY = Math.random() * height;

      particles.push({
        id: i,
        x: startX,
        y: startY,
        prevX: startX + (Math.random() - 0.5) * 10,
        prevY: startY + (Math.random() - 0.5) * 10,
        targetX: (target.x / 100) * width,
        targetY: (target.y / 100) * height,
        radius: 2.5 + Math.random() * 2,
        baseRadius: 2.5 + Math.random() * 2,
        color: '#EF4444',
        trail: [],
        group: groupIndex,
        merged: false,
        opacity: 1,
      });
    }

    return particles;
  }, []);

  // Initialize data pulses - more pulses, faster speeds for robust energy
  const initDataPulses = useCallback(() => {
    const pulses: DataPulse[] = [];
    STRUCTURED_CONNECTIONS.forEach((_, i) => {
      // 4 pulses per connection for dense energy flow
      for (let j = 0; j < 4; j++) {
        pulses.push({
          connectionIndex: i,
          progress: j * 0.25,
          speed: 0.6 + Math.random() * 0.4, // Faster: 0.6-1.0 vs old 0.35-0.5
        });
      }
    });
    return pulses;
  }, []);

  // Initialize chaos pulses - frantic energy racing to endpoints
  const initChaosPulses = useCallback(() => {
    const pulses: ChaosPulse[] = [];
    for (let i = 0; i < CHAOS_PULSE_CONFIG.PULSE_COUNT; i++) {
      pulses.push({
        fromParticleIndex: Math.floor(Math.random() * CHAOS_PARTICLE_COUNT),
        toEndpointIndex: OUTPUT_ENDPOINT_INDICES[Math.floor(Math.random() * OUTPUT_ENDPOINT_INDICES.length)],
        progress: Math.random(), // Stagger start positions
        speed: CHAOS_PULSE_CONFIG.MIN_SPEED + Math.random() * (CHAOS_PULSE_CONFIG.MAX_SPEED - CHAOS_PULSE_CONFIG.MIN_SPEED),
        opacity: 0.5 + Math.random() * 0.5,
      });
    }
    return pulses;
  }, []);

  // Update particles
  const updateParticles = useCallback(
    (particles: Particle[], phase: Phase, dt: number, width: number, height: number) => {
      const phaseTime = Date.now() - phaseStartTimeRef.current;

      particles.forEach((p, idx) => {
        if (phase === 'chaos') {
          // Organic drifting motion with noise-like behavior
          const time = Date.now() * 0.001;
          const uniqueOffset = p.id * 0.7;

          // Multiple sine waves for organic movement
          const driftX = Math.sin(time * 0.8 + uniqueOffset) * 2 +
                        Math.sin(time * 1.3 + uniqueOffset * 2) * 1.5 +
                        Math.cos(time * 0.5 + uniqueOffset * 0.5) * 1;

          const driftY = Math.cos(time * 0.9 + uniqueOffset) * 2 +
                        Math.sin(time * 1.1 + uniqueOffset * 1.5) * 1.5 +
                        Math.sin(time * 0.6 + uniqueOffset * 0.8) * 1;

          // Base position that slowly wanders
          const wanderX = Math.sin(time * 0.2 + p.id) * width * 0.3;
          const wanderY = Math.cos(time * 0.15 + p.id * 0.8) * height * 0.3;

          // Center bias with wandering
          const centerX = width * 0.5 + wanderX;
          const centerY = height * 0.5 + wanderY;

          // Spread particles in an organic cluster
          const angle = (p.id / CHAOS_PARTICLE_COUNT) * Math.PI * 2 + time * 0.3;
          const radius = 80 + Math.sin(time + p.id) * 40;

          let baseX = centerX + Math.cos(angle) * radius + driftX * 15;
          let baseY = centerY + Math.sin(angle) * radius + driftY * 15;

          // Subtle gravity: smaller particles pulled slightly toward larger ones
          // Only apply to smaller particles (baseRadius < 3.5)
          if (p.baseRadius < 3.5) {
            particles.forEach((other, otherIdx) => {
              if (otherIdx === idx || other.baseRadius < 4) return;
              const dx = other.x - baseX;
              const dy = other.y - baseY;
              const dist = Math.hypot(dx, dy);
              if (dist > 20 && dist < 100) {
                // Gentle pull - larger particles have more gravity
                const pull = (other.baseRadius / 5) * 0.15 * (1 - dist / 100);
                baseX += dx * pull;
                baseY += dy * pull;
              }
            });
          }

          p.x = baseX;
          p.y = baseY;

          // Keep in bounds with soft margins
          const margin = 40;
          p.x = Math.max(margin, Math.min(width - margin, p.x));
          p.y = Math.max(margin, Math.min(height - margin, p.y));

          // Pulsing size
          p.radius = p.baseRadius * (0.8 + Math.sin(time * 3 + p.id) * 0.3);

          // Color variation in red/orange spectrum
          const hue = 0 + Math.sin(time * 2 + p.id) * 15;
          p.color = `hsl(${hue}, 70%, 55%)`;
          p.opacity = 0.7 + Math.sin(time * 2 + p.id * 0.5) * 0.3;

        } else if (phase === 'transition') {
          // Store starting position at beginning of transition
          if (phaseTime < 50) {
            chaosPositionsRef.current[idx] = { x: p.x, y: p.y };
          }

          const startPos = chaosPositionsRef.current[idx] || { x: p.x, y: p.y };
          const transitionDuration = 1500;
          const progress = Math.min(1, phaseTime / transitionDuration);

          // Ease out expo for dramatic deceleration
          const eased = 1 - Math.pow(1 - progress, 4);

          // Particles converge to their group's target position
          // Multiple particles per group converge to same point
          p.x = startPos.x + (p.targetX - startPos.x) * eased;
          p.y = startPos.y + (p.targetY - startPos.y) * eased;

          // Color transition
          p.color = interpolateColor('#EF4444', COLORS.CLARITY_NODE, eased);

          // Size: converge to uniform
          p.radius = p.baseRadius + (5 - p.baseRadius) * eased;

          // Fade out duplicate particles in same group (keep only first 12)
          if (idx >= CLARITY_NODE_COUNT) {
            p.opacity = Math.max(0, 1 - eased * 1.5);
          } else {
            p.opacity = 1;
          }

        } else {
          // Clarity - only show first 12 particles (one per node)
          if (idx >= CLARITY_NODE_COUNT) {
            p.opacity = 0;
            return;
          }

          const time = Date.now() * 0.001;

          // Dynamic breathing with multiple frequencies for organic feel
          const breathePrimary = Math.sin(time * 3 + p.id * 0.8) * 0.15;
          const breatheSecondary = Math.sin(time * 5 + p.id * 1.2) * 0.08;
          const breathe = breathePrimary + breatheSecondary;

          // Output nodes (right side) pulse more dramatically to show receiving data
          const isOutputNode = OUTPUT_ENDPOINT_INDICES.includes(idx);
          const baseRadius = isOutputNode ? 7 : 6;
          const pulseIntensity = isOutputNode ? 1.4 : 1;

          p.radius = baseRadius * (1 + breathe * pulseIntensity);

          // Subtle micro-movement
          p.x = p.targetX + Math.sin(time + p.id * 0.5) * 1.5;
          p.y = p.targetY + Math.cos(time * 1.1 + p.id * 0.7) * 1.5;

          // Pulsing opacity for energy effect
          p.opacity = 0.85 + Math.sin(time * 4 + p.id) * 0.15;
          p.color = COLORS.CLARITY_NODE;
        }
      });
    },
    []
  );

  // Update data pulses
  const updateDataPulses = useCallback((pulses: DataPulse[], dt: number, phase: Phase) => {
    pulses.forEach((pulse) => {
      if (phase === 'clarity') {
        pulse.progress += pulse.speed * dt;
        if (pulse.progress > 1) {
          pulse.progress = 0;
        }
      }
    });
  }, []);

  // Update chaos pulses - frantic pulses to endpoints during chaos
  const updateChaosPulses = useCallback((pulses: ChaosPulse[], particles: Particle[], dt: number, phase: Phase) => {
    if (phase !== 'chaos') return;

    pulses.forEach((pulse) => {
      pulse.progress += pulse.speed * dt;
      if (pulse.progress > 1) {
        // Reset with new random source particle
        pulse.progress = 0;
        pulse.fromParticleIndex = Math.floor(Math.random() * Math.min(particles.length, CHAOS_PARTICLE_COUNT));
        pulse.toEndpointIndex = OUTPUT_ENDPOINT_INDICES[Math.floor(Math.random() * OUTPUT_ENDPOINT_INDICES.length)];
        pulse.speed = CHAOS_PULSE_CONFIG.MIN_SPEED + Math.random() * (CHAOS_PULSE_CONFIG.MAX_SPEED - CHAOS_PULSE_CONFIG.MIN_SPEED);
        pulse.opacity = 0.5 + Math.random() * 0.5;
      }
    });
  }, []);

  // Render
  const render = useCallback(
    (ctx: CanvasRenderingContext2D, particles: Particle[], pulses: DataPulse[], chaosPulses: ChaosPulse[], phase: Phase, width: number, height: number) => {
      // Clear
      ctx.fillStyle = COLORS.BACKGROUND;
      ctx.fillRect(0, 0, width, height);

      // Get endpoint target positions (right side)
      const endpointPositions = OUTPUT_ENDPOINT_INDICES.map(idx => ({
        x: (STRUCTURED_POSITIONS[idx].x / 100) * width,
        y: (STRUCTURED_POSITIONS[idx].y / 100) * height,
      }));

      if (phase === 'chaos') {
        const time = Date.now() * 0.001;

        // Draw chaotic connections - tangled web between ALL particles
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.lineWidth = 1;

        // Connect nearby particles with curved lines (the messy network)
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            if (dist < 100 && dist > 15) {
              const opacity = (1 - dist / 100) * 0.12;
              ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const curveOffset = Math.sin(time * 2 + i + j) * 15;
              ctx.quadraticCurveTo(midX + curveOffset, midY + curveOffset, p2.x, p2.y);
              ctx.stroke();
            }
          }
        }

        // WASTED ENERGY: Pulses going between random particles (not to outputs)
        // This represents the 77% wasted effort - energy going nowhere useful
        for (let i = 0; i < 25; i++) {
          const pulseTime = (time * 0.8 + i * 0.15) % 1;
          const fromIdx = Math.floor((i * 7) % particles.length);
          const toIdx = Math.floor((i * 11 + 5) % particles.length);

          if (fromIdx === toIdx) continue;

          const from = particles[fromIdx];
          const to = particles[toIdx];
          if (!from || !to) continue;

          // Only draw if not going to output nodes (wasted energy)
          if (OUTPUT_ENDPOINT_INDICES.includes(toIdx % CLARITY_NODE_COUNT)) continue;

          const x = from.x + (to.x - from.x) * pulseTime;
          const y = from.y + (to.y - from.y) * pulseTime;

          // Dim wasted pulse
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + Math.sin(time * 3 + i) * 0.2})`;
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // THE 23% THAT REACHES OUTPUTS: Fewer pulses actually reaching the buckets
        // Only a fraction of chaosPulses are shown going to endpoints
        chaosPulses.slice(0, 5).forEach((pulse) => {
          const fromParticle = particles[pulse.fromParticleIndex];
          if (!fromParticle) return;

          const endpointIdx = OUTPUT_ENDPOINT_INDICES.indexOf(pulse.toEndpointIndex);
          const toPos = endpointPositions[endpointIdx];
          if (!toPos) return;

          // Connection line to output
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 * pulse.opacity})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(fromParticle.x, fromParticle.y);
          const midX = (fromParticle.x + toPos.x) / 2;
          const midY = (fromParticle.y + toPos.y) / 2;
          const curveOffset = Math.sin(time * 3 + pulse.fromParticleIndex) * 25;
          ctx.quadraticCurveTo(midX, midY + curveOffset, toPos.x, toPos.y);
          ctx.stroke();

          // Pulse traveling to output
          const t = pulse.progress;
          const x = (1-t)*(1-t)*fromParticle.x + 2*(1-t)*t*midX + t*t*toPos.x;
          const y = (1-t)*(1-t)*fromParticle.y + 2*(1-t)*t*(midY + curveOffset) + t*t*toPos.y;

          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.8 * pulse.opacity})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
          ctx.fill();

          // Trail
          for (let tr = 1; tr <= 2; tr++) {
            const trailT = Math.max(0, t - tr * 0.06);
            const tx = (1-trailT)*(1-trailT)*fromParticle.x + 2*(1-trailT)*trailT*midX + trailT*trailT*toPos.x;
            const ty = (1-trailT)*(1-trailT)*fromParticle.y + 2*(1-trailT)*trailT*(midY + curveOffset) + trailT*trailT*toPos.y;
            ctx.beginPath();
            ctx.arc(tx, ty, 2.5 - tr * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(239, 68, 68, ${0.35 - tr * 0.12})`;
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        });

        // Draw the 3 output receivers (customer expectations - distinct from worker bubbles)
        endpointPositions.forEach((pos, idx) => {
          const pulse = Math.sin(time * 4 + idx) * 0.15 + 0.85;

          // Receiver dish shape - concave arc facing left (receiving from the system)
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 * pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x + 8, pos.y, 12, Math.PI * 0.6, Math.PI * 1.4);
          ctx.stroke();

          // Inner receiver arc
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 * pulse})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pos.x + 5, pos.y, 8, Math.PI * 0.65, Math.PI * 1.35);
          ctx.stroke();

          // Collection point (where energy lands)
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.6 * pulse})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
          ctx.fill();
          ctx.shadowBlur = 0;

          // Small indicator light (dim - not receiving much)
          ctx.beginPath();
          ctx.arc(pos.x + 10, pos.y - 8, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.3 + Math.sin(time * 6 + idx) * 0.2})`;
          ctx.fill();
        });

        // Scattered energy dissipating into nothing (wasted energy fading out)
        for (let i = 0; i < 20; i++) {
          const fadePhase = (time * 1.5 + i * 0.3) % 1;
          const fade = 1 - fadePhase;

          // Random positions across the canvas
          const baseX = ((i * 137) % 100) / 100 * width;
          const baseY = ((i * 89) % 100) / 100 * height;
          const driftX = Math.sin(time + i) * 30 * fadePhase;
          const driftY = -fadePhase * 40 + Math.cos(time * 1.3 + i) * 15;

          ctx.beginPath();
          ctx.arc(baseX + driftX, baseY + driftY, 2 * fade, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.35 * fade})`;
          ctx.fill();
        }

      } else if (phase === 'transition') {
        // Fading chaos connections
        const phaseTime = Date.now() - phaseStartTimeRef.current;
        const fadeOut = Math.max(0, 1 - phaseTime / 600);

        if (fadeOut > 0) {
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.08 * fadeOut})`;
          ctx.lineWidth = 1;

          for (let i = 0; i < particles.length; i += 3) {
            for (let j = i + 1; j < particles.length; j += 3) {
              const p1 = particles[i];
              const p2 = particles[j];
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }

        // Forming structured connections
        const fadeIn = Math.min(1, (phaseTime - 400) / 800);
        if (fadeIn > 0) {
          ctx.strokeStyle = `rgba(124, 58, 237, ${0.5 * fadeIn})`;
          ctx.lineWidth = 1.5;

          STRUCTURED_CONNECTIONS.forEach((conn) => {
            const from = particles[conn.from];
            const to = particles[conn.to];
            if (!from || !to || from.opacity < 0.3 || to.opacity < 0.3) return;

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
          });
        }

      } else {
        // Clarity - same bubbles, but organized with logical energy flow
        const time = Date.now() * 0.001;

        // Draw structured connections between nodes (subtle lines)
        ctx.strokeStyle = 'rgba(124, 58, 237, 0.25)';
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

        // Draw energy pulses flowing along connections (left to right, logical flow)
        // These are the main energy - 95% reaches outputs
        pulses.forEach((pulse) => {
          const conn = STRUCTURED_CONNECTIONS[pulse.connectionIndex];
          if (!conn) return;

          const from = particles[conn.from];
          const to = particles[conn.to];
          if (!from || !to) return;

          const x = from.x + (to.x - from.x) * pulse.progress;
          const y = from.y + (to.y - from.y) * pulse.progress;

          // Glowing energy pulse (circular, same style as chaos)
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#A78BFA';
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(167, 139, 250, 0.8)';
          ctx.fill();

          // Bright core
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#DDD6FE';
          ctx.fill();

          // Trail
          for (let t = 1; t <= 3; t++) {
            const trailProgress = Math.max(0, pulse.progress - t * 0.05);
            const tx = from.x + (to.x - from.x) * trailProgress;
            const ty = from.y + (to.y - from.y) * trailProgress;
            ctx.beginPath();
            ctx.arc(tx, ty, 3 - t * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(167, 139, 250, ${0.5 - t * 0.12})`;
            ctx.fill();
          }

          ctx.shadowBlur = 0;
        });

        // Small amount of ambient energy between nearby nodes (the 5% inefficiency)
        for (let i = 0; i < 5; i++) {
          const sparkle = Math.sin(time * 4 + i * 2.5) * 0.5 + 0.5;
          // Random positions near the nodes but not on the main paths
          const nodeIdx = Math.floor((time * 0.5 + i) % CLARITY_NODE_COUNT);
          const node = particles[nodeIdx];
          if (!node) continue;

          const offsetX = Math.sin(time * 3 + i * 1.7) * 25;
          const offsetY = Math.cos(time * 2.5 + i * 2.1) * 25;

          ctx.beginPath();
          ctx.arc(node.x + offsetX, node.y + offsetY, 1.5 * sparkle, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(167, 139, 250, ${0.25 * sparkle})`;
          ctx.fill();
        }
      }

      // Draw particles/nodes - same circular bubbles for all phases
      particles.forEach((p, idx) => {
        if (p.opacity < 0.05) return;

        if (phase === 'clarity') {
          // Clarity - bubbles for workers, receivers for outputs
          if (idx >= CLARITY_NODE_COUNT) return;

          const isOutputNode = OUTPUT_ENDPOINT_INDICES.includes(idx);
          const time = Date.now() * 0.001;
          const pulseGlow = Math.sin(time * 3 + idx) * 0.2 + 0.8;

          if (isOutputNode) {
            // Output nodes: Draw as receivers (customer expectations)
            // Receiver dish shape - concave arc facing left
            ctx.strokeStyle = `rgba(34, 197, 94, ${0.7 * pulseGlow})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(p.x + 10, p.y, 14, Math.PI * 0.6, Math.PI * 1.4);
            ctx.stroke();

            // Inner receiver arc
            ctx.strokeStyle = `rgba(34, 197, 94, ${0.5 * pulseGlow})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x + 6, p.y, 9, Math.PI * 0.65, Math.PI * 1.35);
            ctx.stroke();

            // Collection point (brightly lit - receiving lots of energy)
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(34, 197, 94, ${0.9 * pulseGlow})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(34, 197, 94, 0.7)';
            ctx.fill();

            // Bright core
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(187, 247, 208, 0.9)';
            ctx.fill();

            // Indicator light (bright - receiving well)
            ctx.beginPath();
            ctx.arc(p.x + 12, p.y - 10, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(34, 197, 94, ${0.7 + Math.sin(time * 5 + idx) * 0.3})`;
            ctx.fill();

            ctx.shadowBlur = 0;
          } else {
            // Worker nodes: circular bubbles
            // Outer glow ring
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(124, 58, 237, ${0.15 * pulseGlow})`;
            ctx.fill();

            // Main bubble with glow
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(124, 58, 237, 0.6)';

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.fill();

            // Bright center highlight
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(237, 233, 254, 0.7)';
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }

        } else if (phase === 'chaos') {
          // Chaos - same circular bubbles, scattered
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;

        } else {
          // Transition
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
      });
    },
    []
  );

  // Phase change handler
  useEffect(() => {
    if (prevPhaseRef.current !== options.phase) {
      phaseStartTimeRef.current = Date.now();
      prevPhaseRef.current = options.phase;

      if (dataPulsesRef.current.length === 0) {
        dataPulsesRef.current = initDataPulses();
      }
    }
  }, [options.phase, initDataPulses]);

  // Main animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      dimensionsRef.current = { width: rect.width, height: rect.height };
      particlesRef.current = initParticles(rect.width, rect.height);
      dataPulsesRef.current = initDataPulses();
      chaosPulsesRef.current = initChaosPulses();
      chaosPositionsRef.current = [];
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const animate = (currentTime: number) => {
      if (!options.isInView) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = currentTime;

      const { width, height } = dimensionsRef.current;

      updateParticles(particlesRef.current, options.phase, dt, width, height);
      updateDataPulses(dataPulsesRef.current, dt, options.phase);
      updateChaosPulses(chaosPulsesRef.current, particlesRef.current, dt, options.phase);
      render(ctx, particlesRef.current, dataPulsesRef.current, chaosPulsesRef.current, options.phase, width, height);

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
  }, [canvasRef, options.phase, options.isInView, initParticles, initDataPulses, initChaosPulses, updateParticles, updateDataPulses, updateChaosPulses, render]);

  const resetParticles = useCallback(() => {
    const { width, height } = dimensionsRef.current;
    if (width && height) {
      particlesRef.current = initParticles(width, height);
      chaosPulsesRef.current = initChaosPulses();
      chaosPositionsRef.current = [];
    }
  }, [initParticles, initChaosPulses]);

  return { resetParticles };
}
