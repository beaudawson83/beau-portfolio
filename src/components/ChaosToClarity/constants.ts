import { StructuredNode, Connection } from './types';

// Timing (in milliseconds)
export const TIMING = {
  CHAOS_DURATION: 4000,
  CRITICAL_MASS_START: 4000,
  TRANSITION_START: 5000,
  CLARITY_START: 5800,
  CYCLE_DURATION: 12000,
};

// Colors
export const COLORS = {
  // Chaos phase
  CHAOS_NODE: '#EF4444',
  CHAOS_NODE_RANGE: { h: [0, 30], s: 70, l: 50 }, // red-orange
  CHAOS_CONNECTION: 'rgba(153, 27, 27, 0.25)',

  // Transition
  TRANSITION_NODE: '#94A3B8',

  // Clarity phase
  CLARITY_NODE: '#7C3AED',
  CLARITY_CONNECTION: 'rgba(124, 58, 237, 0.6)',
  CLARITY_PULSE: '#A78BFA',
  CLARITY_GLOW: 'rgba(124, 58, 237, 0.4)',

  // Background
  BACKGROUND: '#0D0D0D',
};

// Physics
export const PHYSICS = {
  TURBULENCE_STRENGTH: 1000,
  SPRING_STIFFNESS: 180,
  SPRING_DAMPING: 14,
  TRAIL_LENGTH: 8,
  TRAIL_DECAY: 0.85,
};

// Particle counts
export const PARTICLE_COUNTS = {
  DESKTOP: 70,
  TABLET: 50,
  MOBILE: 35,
  REDUCED_MOTION: 15,
};

// Final node count after consolidation
export const CLARITY_NODE_COUNT = 12;

// Output endpoint indices (right side nodes that receive data)
export const OUTPUT_ENDPOINT_INDICES = [9, 10, 11];

// Chaos pulse settings - frantic energy to endpoints
export const CHAOS_PULSE_CONFIG = {
  PULSE_COUNT: 15,           // Many pulses showing wasted energy
  MIN_SPEED: 0.8,            // Fast - frantic pace
  MAX_SPEED: 1.5,            // Very fast
  CONNECTION_BRIGHTNESS: 0.45, // Brighter than normal chaos connections
  PULSE_BRIGHTNESS: 0.8,     // Bright pulses
};

// Structured positions for clarity state (percentage-based)
// Forms a clean processing pipeline: inputs -> processing -> hub -> outputs
export const STRUCTURED_POSITIONS: StructuredNode[] = [
  // Column 1 - Input nodes (3)
  { x: 12, y: 20 },
  { x: 12, y: 50 },
  { x: 12, y: 80 },

  // Column 2 - First processing layer (2)
  { x: 32, y: 35 },
  { x: 32, y: 65 },

  // Column 3 - Central hub (2)
  { x: 52, y: 40 },
  { x: 52, y: 60 },

  // Column 4 - Second processing layer (2)
  { x: 72, y: 35 },
  { x: 72, y: 65 },

  // Column 5 - Output nodes (3)
  { x: 92, y: 20 },
  { x: 92, y: 50 },
  { x: 92, y: 80 },
];

// Connections for clarity state (clean flowchart)
export const STRUCTURED_CONNECTIONS: Connection[] = [
  // Input to first processing
  { from: 0, to: 3 },
  { from: 1, to: 3 },
  { from: 1, to: 4 },
  { from: 2, to: 4 },

  // First processing to hub
  { from: 3, to: 5 },
  { from: 3, to: 6 },
  { from: 4, to: 5 },
  { from: 4, to: 6 },

  // Hub to second processing
  { from: 5, to: 7 },
  { from: 6, to: 7 },
  { from: 5, to: 8 },
  { from: 6, to: 8 },

  // Second processing to output
  { from: 7, to: 9 },
  { from: 7, to: 10 },
  { from: 8, to: 10 },
  { from: 8, to: 11 },
];

// Utility to get adaptive particle count
export function getOptimalParticleCount(): number {
  if (typeof window === 'undefined') return PARTICLE_COUNTS.TABLET;

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return PARTICLE_COUNTS.REDUCED_MOTION;
  }

  const width = window.innerWidth;
  if (width < 768) return PARTICLE_COUNTS.MOBILE;
  if (width < 1024) return PARTICLE_COUNTS.TABLET;

  return PARTICLE_COUNTS.DESKTOP;
}

// Interpolate between two hex colors
export function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Generate random HSL color in chaos range
export function getChaosColor(): string {
  const { h, s, l } = COLORS.CHAOS_NODE_RANGE;
  const hue = h[0] + Math.random() * (h[1] - h[0]);
  return `hsl(${hue}, ${s}%, ${l}%)`;
}
