'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Phase } from './types';

// Configuration
const EFFORT_PARTICLES = 120;      // Total "effort" particles
const STORM_COUNT = 4;             // Number of chaos storm centers
const PULSE_COUNT = 60;            // Energy pulses for both phases

// Business flow structure for clarity phase
const BUSINESS_NODES = {
  // Customer journey - left to right flow
  inputs: [
    { x: -4.5, y: 2, label: 'LEADS' },
    { x: -4.5, y: 0, label: 'REQUESTS' },
    { x: -4.5, y: -2, label: 'DATA' },
  ],
  processing: [
    { x: -1.5, y: 1, label: 'QUALIFY' },
    { x: -1.5, y: -1, label: 'PROCESS' },
  ],
  core: [
    { x: 1.5, y: 0, label: 'BEAU_PROTOCOL' },
  ],
  outputs: [
    { x: 4.5, y: 1.5, label: 'REVENUE' },
    { x: 4.5, y: 0, label: 'CUSTOMER' },
    { x: 4.5, y: -1.5, label: 'VALUE' },
  ],
};

// Connections for clarity flow
const FLOW_CONNECTIONS = [
  // Inputs to processing
  { from: { x: -4.5, y: 2 }, to: { x: -1.5, y: 1 } },
  { from: { x: -4.5, y: 0 }, to: { x: -1.5, y: 1 } },
  { from: { x: -4.5, y: 0 }, to: { x: -1.5, y: -1 } },
  { from: { x: -4.5, y: -2 }, to: { x: -1.5, y: -1 } },
  // Processing to core
  { from: { x: -1.5, y: 1 }, to: { x: 1.5, y: 0 } },
  { from: { x: -1.5, y: -1 }, to: { x: 1.5, y: 0 } },
  // Core to outputs
  { from: { x: 1.5, y: 0 }, to: { x: 4.5, y: 1.5 } },
  { from: { x: 1.5, y: 0 }, to: { x: 4.5, y: 0 } },
  { from: { x: 1.5, y: 0 }, to: { x: 4.5, y: -1.5 } },
];

// Particle shaders
const particleVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float alpha;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = customColor;
    vAlpha = alpha;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

// Storm effect shader for chaos background
const stormFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Softer, more diffuse glow for storms
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 2.0);

    gl_FragColor = vec4(vColor, vAlpha * glow * 0.6);
  }
`;

interface ParticleSystemProps {
  phase: Phase;
  mousePosition: { x: number; y: number };
}

function BusinessChaosSystem({ phase, mousePosition }: ParticleSystemProps) {
  const effortRef = useRef<THREE.Points>(null);
  const pulsesRef = useRef<THREE.Points>(null);
  const stormsRef = useRef<THREE.Points>(null);

  const phaseRef = useRef(phase);
  const phaseStartTime = useRef(Date.now());
  const chaosPositions = useRef<Float32Array | null>(null);

  // Storm centers that create turbulence
  const stormCenters = useRef([
    { x: -3, y: 1.5, intensity: 1, phase: 0 },
    { x: 2, y: -1, intensity: 0.8, phase: Math.PI * 0.5 },
    { x: -1, y: -2, intensity: 0.9, phase: Math.PI },
    { x: 3, y: 2, intensity: 0.7, phase: Math.PI * 1.5 },
  ]);

  // Track phase changes
  useEffect(() => {
    if (phaseRef.current !== phase) {
      phaseRef.current = phase;
      phaseStartTime.current = Date.now();

      if (phase === 'transition' && effortRef.current) {
        const positions = effortRef.current.geometry.attributes.position.array as Float32Array;
        chaosPositions.current = new Float32Array(positions);
      }
    }
  }, [phase]);

  // Clarity target positions (all nodes flattened)
  const clarityTargets = useMemo(() => {
    const all = [
      ...BUSINESS_NODES.inputs,
      ...BUSINESS_NODES.processing,
      ...BUSINESS_NODES.core,
      ...BUSINESS_NODES.outputs,
    ];
    return all.map(n => ({ x: n.x, y: n.y }));
  }, []);

  // Initialize effort particles
  const { effortGeometry, velocities, targetAssignments, stormAssignments } = useMemo(() => {
    const positions = new Float32Array(EFFORT_PARTICLES * 3);
    const colors = new Float32Array(EFFORT_PARTICLES * 3);
    const sizes = new Float32Array(EFFORT_PARTICLES);
    const alphas = new Float32Array(EFFORT_PARTICLES);
    const vels = new Float32Array(EFFORT_PARTICLES * 3);
    const targets = new Int32Array(EFFORT_PARTICLES);
    const storms = new Int32Array(EFFORT_PARTICLES);

    for (let i = 0; i < EFFORT_PARTICLES; i++) {
      // Spread around the scene
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      // Warm chaos colors (orange/red/amber)
      const hue = Math.random() * 40; // 0-40 = red to orange
      const rgb = hslToRgb(hue / 360, 0.8, 0.55);
      colors[i * 3] = rgb.r;
      colors[i * 3 + 1] = rgb.g;
      colors[i * 3 + 2] = rgb.b;

      sizes[i] = 0.06 + Math.random() * 0.08;
      alphas[i] = 0.4 + Math.random() * 0.4;

      // Random chaotic velocities
      vels[i * 3] = (Math.random() - 0.5) * 0.04;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      // Assign to clarity target
      targets[i] = i % clarityTargets.length;
      // Assign to storm for chaos phase
      storms[i] = Math.floor(Math.random() * STORM_COUNT);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    return {
      effortGeometry: geo,
      velocities: vels,
      targetAssignments: targets,
      stormAssignments: storms,
    };
  }, [clarityTargets]);

  // Storm particles (background chaos indicators)
  const stormGeometry = useMemo(() => {
    const count = 40; // Subtle storm particles
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const stormIdx = i % STORM_COUNT;
      const storm = stormCenters.current[stormIdx];

      positions[i * 3] = storm.x + (Math.random() - 0.5) * 3;
      positions[i * 3 + 1] = storm.y + (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = -0.5;

      // Dark red/crimson for storm clouds
      colors[i * 3] = 0.6;
      colors[i * 3 + 1] = 0.1;
      colors[i * 3 + 2] = 0.1;

      sizes[i] = 0.8 + Math.random() * 0.6;
      alphas[i] = 0.1 + Math.random() * 0.15;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    return geo;
  }, []);

  // Pulse geometry (wasted effort in chaos, efficient flow in clarity)
  const pulseGeometry = useMemo(() => {
    const positions = new Float32Array(PULSE_COUNT * 3);
    const colors = new Float32Array(PULSE_COUNT * 3);
    const sizes = new Float32Array(PULSE_COUNT);
    const alphas = new Float32Array(PULSE_COUNT);

    for (let i = 0; i < PULSE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0.1;

      colors[i * 3] = 0.65;
      colors[i * 3 + 1] = 0.55;
      colors[i * 3 + 2] = 0.98;

      sizes[i] = 0.1;
      alphas[i] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    return geo;
  }, []);

  // Materials
  const effortMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const stormMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: stormFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const pulseMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (!effortRef.current || !pulsesRef.current || !stormsRef.current) return;

    const time = state.clock.elapsedTime;
    const phaseTime = Date.now() - phaseStartTime.current;
    const currentPhase = phaseRef.current;

    const positions = effortRef.current.geometry.attributes.position.array as Float32Array;
    const colors = effortRef.current.geometry.attributes.customColor.array as Float32Array;
    const sizes = effortRef.current.geometry.attributes.size.array as Float32Array;
    const alphas = effortRef.current.geometry.attributes.alpha.array as Float32Array;

    const stormPositions = stormsRef.current.geometry.attributes.position.array as Float32Array;
    const stormAlphas = stormsRef.current.geometry.attributes.alpha.array as Float32Array;

    const pulsePositions = pulsesRef.current.geometry.attributes.position.array as Float32Array;
    const pulseColors = pulsesRef.current.geometry.attributes.customColor.array as Float32Array;
    const pulseSizes = pulsesRef.current.geometry.attributes.size.array as Float32Array;
    const pulseAlphas = pulsesRef.current.geometry.attributes.alpha.array as Float32Array;

    if (currentPhase === 'chaos') {
      // CHAOS PHASE: Storms, wasted effort, misdirected energy

      // Update storm centers (they slowly drift)
      stormCenters.current.forEach((storm, idx) => {
        storm.x += Math.sin(time * 0.3 + storm.phase) * 0.01;
        storm.y += Math.cos(time * 0.4 + storm.phase) * 0.008;
        storm.intensity = 0.7 + Math.sin(time * 0.5 + idx) * 0.3;
      });

      // Update storm background particles
      const stormCount = 40;
      for (let i = 0; i < stormCount; i++) {
        const stormIdx = i % STORM_COUNT;
        const storm = stormCenters.current[stormIdx];

        // Swirl around storm center
        const angle = time * 0.5 + i * 0.3;
        const radius = 1 + Math.sin(time + i) * 0.5;

        stormPositions[i * 3] = storm.x + Math.cos(angle) * radius;
        stormPositions[i * 3 + 1] = storm.y + Math.sin(angle) * radius * 0.7;

        // Pulse alpha with storm intensity
        stormAlphas[i] = (0.1 + Math.sin(time * 2 + i) * 0.08) * storm.intensity;
      }

      // Update effort particles - chaotic motion pulled by storms
      for (let i = 0; i < EFFORT_PARTICLES; i++) {
        const i3 = i * 3;
        const assignedStorm = stormAssignments[i];
        const storm = stormCenters.current[assignedStorm];

        // Pull toward storm center (wasted effort getting sucked into chaos)
        const dx = storm.x - positions[i3];
        const dy = storm.y - positions[i3 + 1];
        const distToStorm = Math.sqrt(dx * dx + dy * dy);

        // Turbulent spiral around storm
        const tangentX = -dy / (distToStorm + 0.1);
        const tangentY = dx / (distToStorm + 0.1);

        // Combine inward pull with tangential spin
        const pullStrength = 0.015 * storm.intensity;
        const spinStrength = 0.025 * storm.intensity;

        velocities[i3] += dx * pullStrength / (distToStorm + 1) + tangentX * spinStrength;
        velocities[i3 + 1] += dy * pullStrength / (distToStorm + 1) + tangentY * spinStrength;

        // Add random turbulence (unpredictable chaos)
        velocities[i3] += (Math.random() - 0.5) * 0.008;
        velocities[i3 + 1] += (Math.random() - 0.5) * 0.008;

        // Damping
        velocities[i3] *= 0.97;
        velocities[i3 + 1] *= 0.97;
        velocities[i3 + 2] *= 0.95;

        // Apply velocity
        positions[i3] += velocities[i3];
        positions[i3 + 1] += velocities[i3 + 1];
        positions[i3 + 2] += velocities[i3 + 2];

        // Occasionally reset particles that get too close to storm center
        // (effort disappearing into the void)
        if (distToStorm < 0.5) {
          // Respawn at edge
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnRadius = 4 + Math.random() * 2;
          positions[i3] = Math.cos(spawnAngle) * spawnRadius;
          positions[i3 + 1] = Math.sin(spawnAngle) * spawnRadius * 0.6;
          velocities[i3] = (Math.random() - 0.5) * 0.02;
          velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
        }

        // Boundary wrapping
        if (positions[i3] > 6) positions[i3] = -6;
        if (positions[i3] < -6) positions[i3] = 6;
        if (positions[i3 + 1] > 4) positions[i3 + 1] = -4;
        if (positions[i3 + 1] < -4) positions[i3 + 1] = 4;

        // Chaos colors - red/orange with intensity based on speed
        const speed = Math.sqrt(velocities[i3] ** 2 + velocities[i3 + 1] ** 2);
        const hue = 15 + speed * 200; // Red when slow, orange when fast
        const rgb = hslToRgb(Math.min(hue, 45) / 360, 0.8, 0.5 + speed * 2);
        colors[i3] = rgb.r;
        colors[i3 + 1] = rgb.g;
        colors[i3 + 2] = rgb.b;

        // Size pulses with chaos
        sizes[i] = (0.05 + Math.random() * 0.03) * (1 + Math.sin(time * 4 + i) * 0.4);
        alphas[i] = 0.4 + Math.sin(time * 2 + i * 0.5) * 0.25;
      }

      // WASTED EFFORT PULSES - shooting off randomly, never reaching destination
      for (let i = 0; i < PULSE_COUNT; i++) {
        const i3 = i * 3;

        // Each pulse shoots from a random effort particle toward a random direction
        // but fades out before reaching anything useful
        const pulsePhase = (time * 1.2 + i * 0.3) % 3;

        if (pulsePhase < 0.1) {
          // Start new pulse from random position
          const sourceIdx = Math.floor(Math.random() * EFFORT_PARTICLES) * 3;
          pulsePositions[i3] = positions[sourceIdx] || 0;
          pulsePositions[i3 + 1] = positions[sourceIdx + 1] || 0;
        } else if (pulsePhase < 2) {
          // Shoot in random direction
          const angle = i * 0.5 + Math.sin(time + i);
          pulsePositions[i3] += Math.cos(angle) * 0.08;
          pulsePositions[i3 + 1] += Math.sin(angle) * 0.06;
        }

        // Red/orange wasted effort color
        pulseColors[i3] = 0.9;
        pulseColors[i3 + 1] = 0.3;
        pulseColors[i3 + 2] = 0.1;

        pulseSizes[i] = 0.08;
        // Fade in then out - wasted effort dissipating
        pulseAlphas[i] = pulsePhase < 0.5
          ? pulsePhase * 1.2
          : Math.max(0, (2 - pulsePhase) * 0.4);
      }

    } else if (currentPhase === 'transition') {
      // TRANSITION: Chaos collapses, effort consolidates
      const transitionDuration = 1800;
      const progress = Math.min(1, phaseTime / transitionDuration);

      // Elastic ease
      const c4 = (2 * Math.PI) / 3;
      const eased = progress === 0 ? 0 : progress === 1 ? 1 :
        Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;

      // Fade out storms
      const stormCount = 40;
      for (let i = 0; i < stormCount; i++) {
        stormAlphas[i] = (0.15) * (1 - progress);
      }

      // Consolidate particles into clarity nodes
      for (let i = 0; i < EFFORT_PARTICLES; i++) {
        const i3 = i * 3;
        const targetIdx = targetAssignments[i];
        const target = clarityTargets[targetIdx];

        const startX = chaosPositions.current ? chaosPositions.current[i3] : positions[i3];
        const startY = chaosPositions.current ? chaosPositions.current[i3 + 1] : positions[i3 + 1];

        // Staggered convergence
        const dist = Math.sqrt((startX - target.x) ** 2 + (startY - target.y) ** 2);
        const stagger = (dist / 12) * 0.4;
        const particleProgress = Math.max(0, Math.min(1, (progress - stagger) / (1 - stagger)));

        const particleEased = particleProgress === 0 ? 0 : particleProgress === 1 ? 1 :
          Math.pow(2, -10 * particleProgress) * Math.sin((particleProgress * 10 - 0.75) * c4) + 1;

        // Spiral inward during first half
        const spiralPhase = Math.max(0, 1 - particleProgress * 2);
        const spiralAngle = spiralPhase * Math.PI * 3 * (i % 2 === 0 ? 1 : -1);
        const spiralRadius = spiralPhase * 0.8;

        positions[i3] = startX + (target.x - startX) * particleEased + Math.cos(spiralAngle + i) * spiralRadius;
        positions[i3 + 1] = startY + (target.y - startY) * particleEased + Math.sin(spiralAngle + i) * spiralRadius;
        positions[i3 + 2] = (1 - particleEased) * 0.5;

        // Color transition: red/orange -> purple/violet
        const colorT = Math.min(1, phaseTime / 1200);
        const rgb = hslToRgb(
          (30 - colorT * 90 + 360) % 360 / 360, // Red -> Purple hue
          0.7 + colorT * 0.2,
          0.5 + colorT * 0.1
        );
        colors[i3] = rgb.r;
        colors[i3 + 1] = rgb.g;
        colors[i3 + 2] = rgb.b;

        // Grow during transition
        sizes[i] = 0.06 + particleProgress * 0.08;

        // Fade out excess
        const particlesPerNode = Math.floor(EFFORT_PARTICLES / clarityTargets.length);
        if (i >= clarityTargets.length * Math.min(8, particlesPerNode)) {
          alphas[i] = Math.max(0, 1 - particleProgress * 1.5);
        } else {
          alphas[i] = 0.5 + particleProgress * 0.4;
        }
      }

      // Implosion ring effect
      if (progress > 0.1 && progress < 0.5) {
        const ringProgress = (progress - 0.1) / 0.4;
        const ringRadius = (1 - ringProgress) * 6;

        for (let i = 0; i < 30; i++) {
          const angle = (i / 30) * Math.PI * 2;
          pulsePositions[i * 3] = Math.cos(angle) * ringRadius;
          pulsePositions[i * 3 + 1] = Math.sin(angle) * ringRadius * 0.6;
          pulsePositions[i * 3 + 2] = 0.1;

          pulseColors[i * 3] = 0.65;
          pulseColors[i * 3 + 1] = 0.33;
          pulseColors[i * 3 + 2] = 0.96;

          pulseSizes[i] = 0.15 * ringProgress;
          pulseAlphas[i] = Math.sin(ringProgress * Math.PI) * 0.6;
        }
      }

    } else {
      // CLARITY PHASE: Efficient flow, maximum output to customer

      // Hide storms
      const stormCount = 40;
      for (let i = 0; i < stormCount; i++) {
        stormAlphas[i] = 0;
      }

      // Settle particles into node positions
      for (let i = 0; i < EFFORT_PARTICLES; i++) {
        const i3 = i * 3;
        const targetIdx = targetAssignments[i];
        const target = clarityTargets[targetIdx];

        const particlesPerNode = Math.floor(EFFORT_PARTICLES / clarityTargets.length);
        const isVisible = i < clarityTargets.length * Math.min(8, particlesPerNode);

        if (isVisible) {
          // Gentle orbit around node position
          const orbitOffset = (i % 8) * (Math.PI * 2 / 8);
          const orbitRadius = 0.15 + (Math.floor(i / clarityTargets.length) % 3) * 0.08;

          positions[i3] = target.x + Math.cos(time * 0.8 + orbitOffset) * orbitRadius;
          positions[i3 + 1] = target.y + Math.sin(time * 0.8 + orbitOffset) * orbitRadius * 0.7;
          positions[i3 + 2] = Math.sin(time + i) * 0.1;

          // Color based on node type
          const isOutput = targetIdx >= clarityTargets.length - 3; // Last 3 are outputs
          const isCore = targetIdx === clarityTargets.length - 4; // Core node

          if (isOutput) {
            // Green for output/value delivered
            const rgb = hslToRgb(145 / 360, 0.7, 0.5);
            colors[i3] = rgb.r;
            colors[i3 + 1] = rgb.g;
            colors[i3 + 2] = rgb.b;
          } else if (isCore) {
            // Bright violet for BEAU_PROTOCOL core
            const rgb = hslToRgb(270 / 360, 0.9, 0.6);
            colors[i3] = rgb.r;
            colors[i3 + 1] = rgb.g;
            colors[i3 + 2] = rgb.b;
          } else {
            // Purple for processing nodes
            const rgb = hslToRgb(280 / 360, 0.7, 0.5);
            colors[i3] = rgb.r;
            colors[i3 + 1] = rgb.g;
            colors[i3 + 2] = rgb.b;
          }

          sizes[i] = 0.1 + Math.sin(time * 2 + i) * 0.02;
          alphas[i] = 0.7 + Math.sin(time * 1.5 + i) * 0.2;
        } else {
          alphas[i] = 0;
        }
      }

      // EFFICIENT FLOW PULSES - following the pipeline, all reaching destination
      let pulseIdx = 0;
      FLOW_CONNECTIONS.forEach((conn, connIdx) => {
        // Multiple pulses per connection - steady, efficient flow
        for (let p = 0; p < 5; p++) {
          if (pulseIdx >= PULSE_COUNT) break;

          const pulseProgress = ((time * 0.6 + connIdx * 0.15 + p * 0.2) % 1);
          const i3 = pulseIdx * 3;

          // Smooth bezier-like path
          const midX = (conn.from.x + conn.to.x) / 2;
          const midY = (conn.from.y + conn.to.y) / 2 + 0.2;

          // Quadratic interpolation for curved path
          const t = pulseProgress;
          const t2 = t * t;
          const mt = 1 - t;
          const mt2 = mt * mt;

          pulsePositions[i3] = mt2 * conn.from.x + 2 * mt * t * midX + t2 * conn.to.x;
          pulsePositions[i3 + 1] = mt2 * conn.from.y + 2 * mt * t * midY + t2 * conn.to.y;
          pulsePositions[i3 + 2] = 0.05;

          // Color gradient along flow
          const isOutputFlow = conn.to.x > 3; // Flowing to output
          if (isOutputFlow) {
            // Transition to green as approaching output
            const greenT = pulseProgress;
            const rgb = hslToRgb((280 - greenT * 135) / 360, 0.7, 0.55);
            pulseColors[i3] = rgb.r;
            pulseColors[i3 + 1] = rgb.g;
            pulseColors[i3 + 2] = rgb.b;
          } else {
            // Purple for internal flow
            pulseColors[i3] = 0.55;
            pulseColors[i3 + 1] = 0.35;
            pulseColors[i3 + 2] = 0.92;
          }

          pulseSizes[pulseIdx] = 0.1 + Math.sin(pulseProgress * Math.PI) * 0.04;
          pulseAlphas[pulseIdx] = 0.7;

          pulseIdx++;
        }
      });

      // Hide unused pulses
      for (let i = pulseIdx; i < PULSE_COUNT; i++) {
        pulseAlphas[i] = 0;
      }
    }

    // Update all geometry attributes
    effortRef.current.geometry.attributes.position.needsUpdate = true;
    effortRef.current.geometry.attributes.customColor.needsUpdate = true;
    effortRef.current.geometry.attributes.size.needsUpdate = true;
    effortRef.current.geometry.attributes.alpha.needsUpdate = true;

    stormsRef.current.geometry.attributes.position.needsUpdate = true;
    stormsRef.current.geometry.attributes.alpha.needsUpdate = true;

    pulsesRef.current.geometry.attributes.position.needsUpdate = true;
    pulsesRef.current.geometry.attributes.customColor.needsUpdate = true;
    pulsesRef.current.geometry.attributes.size.needsUpdate = true;
    pulsesRef.current.geometry.attributes.alpha.needsUpdate = true;
  });

  return (
    <>
      <points ref={stormsRef} geometry={stormGeometry} material={stormMaterial} />
      <points ref={effortRef} geometry={effortGeometry} material={effortMaterial} />
      <points ref={pulsesRef} geometry={pulseGeometry} material={pulseMaterial} />
    </>
  );
}

// Connection lines for clarity phase
function FlowLines({ phase }: { phase: Phase }) {
  const linesRef = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const lineObjects: THREE.Line[] = [];

    FLOW_CONNECTIONS.forEach((conn) => {
      // Create curved line with control point
      const midX = (conn.from.x + conn.to.x) / 2;
      const midY = (conn.from.y + conn.to.y) / 2 + 0.2;

      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(conn.from.x, conn.from.y, -0.1),
        new THREE.Vector3(midX, midY, -0.1),
        new THREE.Vector3(conn.to.x, conn.to.y, -0.1)
      );

      const points = curve.getPoints(20);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(0x7C3AED),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });

      lineObjects.push(new THREE.Line(geo, mat));
    });

    return lineObjects;
  }, []);

  useFrame(() => {
    if (!linesRef.current) return;

    const targetOpacity = phase === 'clarity' ? 0.25 : phase === 'transition' ? 0.1 : 0;

    linesRef.current.children.forEach((child) => {
      const line = child as THREE.Line;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * 0.08;
    });
  });

  return (
    <group ref={linesRef}>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

// Node labels for clarity phase
function NodeLabels({ phase }: { phase: Phase }) {
  const groupRef = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (phase === 'clarity') {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [phase]);

  const allNodes = useMemo(() => [
    ...BUSINESS_NODES.inputs,
    ...BUSINESS_NODES.processing,
    ...BUSINESS_NODES.core,
    ...BUSINESS_NODES.outputs,
  ], []);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.visible = visible;
  });

  // Labels would need HTML overlay or drei Text - keeping simple for performance
  return null;
}

// Helper: HSL to RGB
function hslToRgb(h: number, s: number, l: number) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r, g, b };
}

interface QuantumParticlesProps {
  phase: Phase;
}

export default function QuantumParticles({ phase }: QuantumParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Throttled mouse handler
  const lastMouseUpdate = useRef(0);
  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastMouseUpdate.current < 50) return;
    lastMouseUpdate.current = now;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseMove={handleMouseMove}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: '#0D0D0D' }}
      >
        <BusinessChaosSystem phase={phase} mousePosition={mousePosition} />
        <FlowLines phase={phase} />

        <EffectComposer>
          <Bloom
            intensity={phase === 'clarity' ? 0.6 : phase === 'transition' ? 0.8 : 0.4}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
