'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Phase } from './types';
import {
  STRUCTURED_POSITIONS,
  STRUCTURED_CONNECTIONS,
  CLARITY_NODE_COUNT,
  OUTPUT_ENDPOINT_INDICES,
} from './constants';

// Reduced particle counts for performance (was 500/200)
const PARTICLE_COUNT = 200;
const CONNECTION_PARTICLE_COUNT = 80;

// Custom shader for particles with glow
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

    // Soft glow falloff
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

// Energy pulse shader for connections
const pulseVertexShader = `
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

const pulseFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Bright core with soft edge
    float core = 1.0 - smoothstep(0.0, 0.2, dist);
    float glow = 1.0 - smoothstep(0.2, 0.5, dist);
    float intensity = core * 0.8 + glow * 0.5;

    gl_FragColor = vec4(vColor, vAlpha * intensity);
  }
`;

interface ParticleSystemProps {
  phase: Phase;
  width: number;
  height: number;
  mousePosition: { x: number; y: number };
}

function ParticleSystem({ phase, width, height, mousePosition }: ParticleSystemProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const pulsesRef = useRef<THREE.Points>(null);
  const phaseRef = useRef(phase);
  const phaseStartTime = useRef(Date.now());
  const chaosPositions = useRef<Float32Array | null>(null);

  // Track phase changes
  useEffect(() => {
    if (phaseRef.current !== phase) {
      phaseRef.current = phase;
      phaseStartTime.current = Date.now();

      // Store chaos positions at start of transition
      if (phase === 'transition' && particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        chaosPositions.current = new Float32Array(positions);
      }
    }
  }, [phase]);

  // Convert structured positions to 3D coordinates
  const clarityTargets = useMemo(() => {
    const targets = new Float32Array(CLARITY_NODE_COUNT * 3);
    STRUCTURED_POSITIONS.slice(0, CLARITY_NODE_COUNT).forEach((pos, i) => {
      targets[i * 3] = ((pos.x / 100) - 0.5) * 10;
      targets[i * 3 + 1] = ((50 - pos.y) / 100) * 6;
      targets[i * 3 + 2] = 0;
    });
    return targets;
  }, []);

  // Initialize particle geometry
  const { geometry, velocities, targetAssignments } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const alphas = new Float32Array(PARTICLE_COUNT);
    const vels = new Float32Array(PARTICLE_COUNT * 3);
    const assignments = new Int32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random initial positions in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 4;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      // Red chaos color
      colors[i * 3] = 0.94;
      colors[i * 3 + 1] = 0.27;
      colors[i * 3 + 2] = 0.27;

      sizes[i] = 0.08 + Math.random() * 0.12;
      alphas[i] = 0.6 + Math.random() * 0.4;

      // Random velocities for chaos
      vels[i * 3] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      // Assign to clarity target (for transition)
      assignments[i] = i % CLARITY_NODE_COUNT;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    return { geometry: geo, velocities: vels, targetAssignments: assignments };
  }, []);

  // Initialize pulse geometry for energy flow
  const pulseGeometry = useMemo(() => {
    const positions = new Float32Array(CONNECTION_PARTICLE_COUNT * 3);
    const colors = new Float32Array(CONNECTION_PARTICLE_COUNT * 3);
    const sizes = new Float32Array(CONNECTION_PARTICLE_COUNT);
    const alphas = new Float32Array(CONNECTION_PARTICLE_COUNT);

    for (let i = 0; i < CONNECTION_PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0.1;

      // Purple clarity color
      colors[i * 3] = 0.65;
      colors[i * 3 + 1] = 0.55;
      colors[i * 3 + 2] = 0.98;

      sizes[i] = 0.15;
      alphas[i] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    return geo;
  }, []);

  // Shader materials
  const particleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const pulseMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: pulseVertexShader,
      fragmentShader: pulseFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (!particlesRef.current || !pulsesRef.current) return;

    const time = state.clock.elapsedTime;
    const phaseTime = Date.now() - phaseStartTime.current;
    const currentPhase = phaseRef.current;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const colors = particlesRef.current.geometry.attributes.customColor.array as Float32Array;
    const sizes = particlesRef.current.geometry.attributes.size.array as Float32Array;
    const alphas = particlesRef.current.geometry.attributes.alpha.array as Float32Array;

    const pulsePositions = pulsesRef.current.geometry.attributes.position.array as Float32Array;
    const pulseColors = pulsesRef.current.geometry.attributes.customColor.array as Float32Array;
    const pulseSizes = pulsesRef.current.geometry.attributes.size.array as Float32Array;
    const pulseAlphas = pulsesRef.current.geometry.attributes.alpha.array as Float32Array;

    // Mouse influence (converted to 3D space)
    const mouseX = (mousePosition.x - 0.5) * 10;
    const mouseY = (0.5 - mousePosition.y) * 6;

    if (currentPhase === 'chaos') {
      // Chaotic motion with turbulence
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        // Turbulence based on position and time
        const turbX = Math.sin(time * 0.8 + i * 0.1) * 0.03 +
                     Math.sin(time * 1.3 + positions[i3 + 1] * 2) * 0.02;
        const turbY = Math.cos(time * 0.9 + i * 0.15) * 0.03 +
                     Math.cos(time * 1.1 + positions[i3] * 2) * 0.02;
        const turbZ = Math.sin(time * 0.5 + i * 0.05) * 0.01;

        // Apply velocity and turbulence
        positions[i3] += velocities[i3] + turbX;
        positions[i3 + 1] += velocities[i3 + 1] + turbY;
        positions[i3 + 2] += velocities[i3 + 2] + turbZ;

        // Mouse repulsion
        const dx = positions[i3] - mouseX;
        const dy = positions[i3 + 1] - mouseY;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        if (distToMouse < 2) {
          const force = (2 - distToMouse) * 0.05;
          positions[i3] += (dx / distToMouse) * force;
          positions[i3 + 1] += (dy / distToMouse) * force;
        }

        // Contain in bounds with soft wrapping
        if (positions[i3] > 5) positions[i3] = -5;
        if (positions[i3] < -5) positions[i3] = 5;
        if (positions[i3 + 1] > 3.5) positions[i3 + 1] = -3.5;
        if (positions[i3 + 1] < -3.5) positions[i3 + 1] = 3.5;
        if (positions[i3 + 2] > 1.5) positions[i3 + 2] = -1.5;
        if (positions[i3 + 2] < -1.5) positions[i3 + 2] = 1.5;

        // Pulsing red/orange colors
        const hueShift = Math.sin(time * 2 + i * 0.3) * 0.1;
        colors[i3] = 0.94 + hueShift;
        colors[i3 + 1] = 0.27 + hueShift * 0.5;
        colors[i3 + 2] = 0.27;

        // Pulsing size
        sizes[i] = (0.08 + Math.random() * 0.04) * (1 + Math.sin(time * 3 + i) * 0.3);
        alphas[i] = 0.5 + Math.sin(time * 2 + i * 0.5) * 0.3;
      }

      // Hide pulses during chaos
      for (let i = 0; i < CONNECTION_PARTICLE_COUNT; i++) {
        pulseAlphas[i] = 0;
      }

    } else if (currentPhase === 'transition') {
      const transitionDuration = 1800;
      const progress = Math.min(1, phaseTime / transitionDuration);

      // Elastic ease out
      const c4 = (2 * Math.PI) / 3;
      const eased = progress === 0 ? 0 : progress === 1 ? 1 :
        Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const targetIdx = targetAssignments[i];
        const t3 = targetIdx * 3;

        // Get start position (stored at transition start)
        const startX = chaosPositions.current ? chaosPositions.current[i3] : positions[i3];
        const startY = chaosPositions.current ? chaosPositions.current[i3 + 1] : positions[i3 + 1];
        const startZ = chaosPositions.current ? chaosPositions.current[i3 + 2] : positions[i3 + 2];

        // Target position
        const targetX = clarityTargets[t3];
        const targetY = clarityTargets[t3 + 1];
        const targetZ = 0;

        // Stagger based on distance
        const dist = Math.sqrt(
          Math.pow(startX - targetX, 2) +
          Math.pow(startY - targetY, 2)
        );
        const stagger = (dist / 10) * 0.3;
        const particleProgress = Math.max(0, Math.min(1, (progress - stagger) / (1 - stagger)));

        // Apply easing to particle progress
        const particleEased = particleProgress === 0 ? 0 : particleProgress === 1 ? 1 :
          Math.pow(2, -10 * particleProgress) * Math.sin((particleProgress * 10 - 0.75) * c4) + 1;

        // Spiral inward effect during first half
        const spiralPhase = Math.max(0, 1 - particleProgress * 2);
        const spiralAngle = spiralPhase * Math.PI * 2 * (i % 2 === 0 ? 1 : -1);
        const spiralRadius = spiralPhase * 0.5;

        positions[i3] = startX + (targetX - startX) * particleEased + Math.cos(spiralAngle + i) * spiralRadius;
        positions[i3 + 1] = startY + (targetY - startY) * particleEased + Math.sin(spiralAngle + i) * spiralRadius;
        positions[i3 + 2] = startZ + (targetZ - startZ) * particleEased;

        // Color transition: red -> purple -> violet
        const colorProgress = Math.min(1, phaseTime / 1200);
        if (colorProgress < 0.4) {
          const t = colorProgress / 0.4;
          colors[i3] = 0.94 - t * 0.28;     // 0.94 -> 0.66
          colors[i3 + 1] = 0.27 + t * 0.06;  // 0.27 -> 0.33
          colors[i3 + 2] = 0.27 + t * 0.69;  // 0.27 -> 0.96
        } else {
          const t = (colorProgress - 0.4) / 0.6;
          colors[i3] = 0.66 - t * 0.17;      // 0.66 -> 0.49
          colors[i3 + 1] = 0.33 - t * 0.10;  // 0.33 -> 0.23
          colors[i3 + 2] = 0.96 - t * 0.04;  // 0.96 -> 0.92
        }

        // Size pulse during transition
        const sizePulse = Math.sin(particleProgress * Math.PI) * 0.1;
        sizes[i] = 0.1 + sizePulse;

        // Fade out excess particles
        if (i >= CLARITY_NODE_COUNT * 3) {
          alphas[i] = Math.max(0, 1 - particleProgress * 1.5);
        } else {
          alphas[i] = 0.7 + particleProgress * 0.3;
        }
      }

      // Shockwave ring effect
      if (progress > 0.1 && progress < 0.6) {
        const ringProgress = (progress - 0.1) / 0.5;
        const ringRadius = ringProgress * 6;
        const ringAlpha = Math.sin(ringProgress * Math.PI) * 0.5;

        for (let i = 0; i < 50; i++) {
          const angle = (i / 50) * Math.PI * 2;
          const pi = i * 3;
          pulsePositions[pi] = Math.cos(angle) * ringRadius;
          pulsePositions[pi + 1] = Math.sin(angle) * ringRadius * 0.6;
          pulsePositions[pi + 2] = 0.1;

          pulseColors[pi] = 0.65;
          pulseColors[pi + 1] = 0.33;
          pulseColors[pi + 2] = 0.96;

          pulseSizes[i] = 0.2 * (1 - ringProgress);
          pulseAlphas[i] = ringAlpha;
        }
      }

    } else {
      // Clarity phase - organized nodes with energy flow

      // Main particles settle into clarity positions
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const targetIdx = targetAssignments[i];
        const t3 = targetIdx * 3;

        // Only show primary particles for each node
        const isMainParticle = i < CLARITY_NODE_COUNT * 3;

        if (isMainParticle) {
          // Gentle breathing motion
          const breathe = Math.sin(time * 2 + i * 0.5) * 0.05;
          positions[i3] = clarityTargets[t3] + Math.sin(time + i) * 0.03;
          positions[i3 + 1] = clarityTargets[t3 + 1] + Math.cos(time * 1.1 + i) * 0.03;
          positions[i3 + 2] = breathe;

          // Output nodes are green, others are purple
          const isOutput = OUTPUT_ENDPOINT_INDICES.includes(targetIdx);
          if (isOutput) {
            colors[i3] = 0.13;
            colors[i3 + 1] = 0.77;
            colors[i3 + 2] = 0.37;
          } else {
            colors[i3] = 0.49;
            colors[i3 + 1] = 0.23;
            colors[i3 + 2] = 0.92;
          }

          // Larger, brighter for clarity
          sizes[i] = 0.2 + Math.sin(time * 3 + i) * 0.05;
          alphas[i] = 0.8 + Math.sin(time * 2 + i) * 0.2;
        } else {
          // Hide excess particles
          alphas[i] = 0;
        }
      }

      // Energy pulses flowing along connections
      let pulseIdx = 0;
      STRUCTURED_CONNECTIONS.forEach((conn, connIdx) => {
        const fromT3 = conn.from * 3;
        const toT3 = conn.to * 3;

        const fromX = clarityTargets[fromT3];
        const fromY = clarityTargets[fromT3 + 1];
        const toX = clarityTargets[toT3];
        const toY = clarityTargets[toT3 + 1];

        // Multiple pulses per connection
        for (let p = 0; p < 4; p++) {
          if (pulseIdx >= CONNECTION_PARTICLE_COUNT) break;

          const pulseProgress = ((time * 0.8 + connIdx * 0.2 + p * 0.25) % 1);
          const pi = pulseIdx * 3;

          pulsePositions[pi] = fromX + (toX - fromX) * pulseProgress;
          pulsePositions[pi + 1] = fromY + (toY - fromY) * pulseProgress;
          pulsePositions[pi + 2] = 0.05;

          // Purple energy
          pulseColors[pi] = 0.65;
          pulseColors[pi + 1] = 0.55;
          pulseColors[pi + 2] = 0.98;

          pulseSizes[pulseIdx] = 0.12;
          pulseAlphas[pulseIdx] = 0.7;

          pulseIdx++;
        }
      });

      // Hide unused pulses
      for (let i = pulseIdx; i < CONNECTION_PARTICLE_COUNT; i++) {
        pulseAlphas[i] = 0;
      }
    }

    // Update attributes
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.customColor.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    particlesRef.current.geometry.attributes.alpha.needsUpdate = true;

    pulsesRef.current.geometry.attributes.position.needsUpdate = true;
    pulsesRef.current.geometry.attributes.customColor.needsUpdate = true;
    pulsesRef.current.geometry.attributes.size.needsUpdate = true;
    pulsesRef.current.geometry.attributes.alpha.needsUpdate = true;
  });

  return (
    <>
      <points ref={particlesRef} geometry={geometry} material={particleMaterial} />
      <points ref={pulsesRef} geometry={pulseGeometry} material={pulseMaterial} />
    </>
  );
}

// Connection lines component
function ConnectionLines({ phase }: { phase: Phase }) {
  const linesRef = useRef<THREE.Group>(null);

  const clarityTargets = useMemo(() => {
    return STRUCTURED_POSITIONS.slice(0, CLARITY_NODE_COUNT).map(pos => ({
      x: ((pos.x / 100) - 0.5) * 10,
      y: ((50 - pos.y) / 100) * 6,
    }));
  }, []);

  const lines = useMemo(() => {
    const lineObjects: THREE.Line[] = [];

    STRUCTURED_CONNECTIONS.forEach((conn) => {
      const from = clarityTargets[conn.from];
      const to = clarityTargets[conn.to];

      const points = [
        new THREE.Vector3(from.x, from.y, -0.1),
        new THREE.Vector3(to.x, to.y, -0.1),
      ];

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
  }, [clarityTargets]);

  useFrame((state) => {
    if (!linesRef.current) return;

    const targetOpacity = phase === 'clarity' ? 0.3 :
                          phase === 'transition' ? 0.15 : 0;

    linesRef.current.children.forEach((child) => {
      const line = child as THREE.Line;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * 0.05;
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

interface QuantumParticlesProps {
  phase: Phase;
}

export default function QuantumParticles({ phase }: QuantumParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Throttled mouse handler for performance
  const lastMouseUpdate = useRef(0);
  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastMouseUpdate.current < 32) return; // ~30fps throttle
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
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]} // Reduced DPR for performance
        gl={{
          antialias: false, // Disable for performance
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: '#0D0D0D' }}
      >
        <ParticleSystem
          phase={phase}
          width={dimensions.width}
          height={dimensions.height}
          mousePosition={mousePosition}
        />
        <ConnectionLines phase={phase} />

        <EffectComposer>
          <Bloom
            intensity={phase === 'clarity' ? 0.5 : phase === 'transition' ? 0.7 : 0.3}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            radius={0.6}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
