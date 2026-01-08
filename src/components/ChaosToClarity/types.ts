export type Phase = 'chaos' | 'transition' | 'clarity';

export interface Particle {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  targetX: number;
  targetY: number;
  radius: number;
  baseRadius: number;
  color: string;
  trail: TrailPoint[];
  group: number;
  merged: boolean;
  opacity: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Connection {
  from: number;
  to: number;
}

export interface StructuredNode {
  x: number;
  y: number;
  label?: string;
}

export interface ParticleSystemConfig {
  particleCount: number;
  width: number;
  height: number;
  turbulenceStrength: number;
  springStiffness: number;
  springDamping: number;
}

export interface DataPulse {
  connectionIndex: number;
  progress: number;
  speed: number;
}
