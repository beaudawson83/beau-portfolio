'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// Infinite perspective grid with energy flowing toward center
function InfiniteGrid() {
  const gridRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const gridShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#7C3AED') },
      uOpacity: { value: 0.4 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vDistance;

      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vDistance = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vDistance;

      void main() {
        // Grid pattern
        vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5);
        float line = min(grid.x, grid.y);
        float gridLine = 1.0 - smoothstep(0.0, 0.05, line);

        // Distance-based fade
        float distanceFade = 1.0 - smoothstep(0.0, 30.0, vDistance);

        // Pulsing energy effect
        float pulse = sin(vUv.y * 10.0 - uTime * 2.0) * 0.5 + 0.5;
        float energyFlow = smoothstep(0.4, 0.6, pulse);

        // Combine effects
        float alpha = gridLine * distanceFade * uOpacity;
        alpha += gridLine * energyFlow * 0.3 * distanceFade;

        vec3 finalColor = uColor + uColor * energyFlow * 0.5;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (gridRef.current) {
      // Subtle breathing motion
      gridRef.current.rotation.x = -Math.PI / 2.5 + Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
    }
  });

  return (
    <group ref={gridRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -2, -5]}>
      <mesh>
        <planeGeometry args={[100, 100, 100, 100]} />
        <shaderMaterial
          ref={materialRef}
          {...gridShader}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// Energy particles flowing toward center
function EnergyParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const frameCount = useRef(0);
  const PARTICLE_COUNT = 100; // Reduced from 200

  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const vels = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const violet = new THREE.Color('#7C3AED');
    const purple = new THREE.Color('#A78BFA');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 10;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = Math.sin(angle) * radius - 5;

      vels[i * 3] = -positions[i * 3] * 0.01;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 2] = -positions[i * 3 + 2] * 0.01;

      const color = Math.random() > 0.5 ? violet : purple;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return { geometry: geo, velocities: vels };
  }, []);

  useFrame(() => {
    if (!particlesRef.current) return;

    // Skip every other frame for performance
    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Double velocity since we skip frames
      positions[i3] += velocities[i3] * 2;
      positions[i3 + 1] += velocities[i3 + 1] * 2;
      positions[i3 + 2] += velocities[i3 + 2] * 2;

      const dist = Math.sqrt(positions[i3] ** 2 + positions[i3 + 2] ** 2);

      if (dist < 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 5;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 2] = Math.sin(angle) * radius - 5;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Floating geometric shapes
function FloatingShapes() {
  const groupRef = useRef<THREE.Group>(null);

  const shapes = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 8,
        -3 - Math.random() * 5,
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ] as [number, number, number],
      scale: 0.2 + Math.random() * 0.3,
      type: i % 3, // 0: octahedron, 1: icosahedron, 2: tetrahedron
      speed: 0.2 + Math.random() * 0.3,
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    groupRef.current.children.forEach((child, i) => {
      const shape = shapes[i];
      child.rotation.x += 0.002 * shape.speed;
      child.rotation.y += 0.003 * shape.speed;
      child.position.y += Math.sin(state.clock.elapsedTime * shape.speed + i) * 0.002;
    });
  });

  return (
    <group ref={groupRef}>
      {shapes.map((shape, i) => (
        <mesh
          key={i}
          position={shape.position}
          rotation={shape.rotation}
          scale={shape.scale}
        >
          {shape.type === 0 && <octahedronGeometry args={[1]} />}
          {shape.type === 1 && <icosahedronGeometry args={[1]} />}
          {shape.type === 2 && <tetrahedronGeometry args={[1]} />}
          <meshBasicMaterial
            color="#7C3AED"
            wireframe
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// Mouse parallax handler with throttling
function MouseParallax({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const lastUpdate = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Throttle to ~30fps
      const now = Date.now();
      if (now - lastUpdate.current < 32) return;
      lastUpdate.current = now;

      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;

    // Smooth parallax effect
    groupRef.current.rotation.y += (mouse.current.x * 0.1 - groupRef.current.rotation.y) * 0.05;
    groupRef.current.rotation.x += (mouse.current.y * 0.05 - groupRef.current.rotation.x) * 0.05;
  });

  return <group ref={groupRef}>{children}</group>;
}

// Main scene
function Scene() {
  return (
    <>
      <color attach="background" args={['#111111']} />
      <fog attach="fog" args={['#111111', 5, 30]} />

      <MouseParallax>
        <InfiniteGrid />
        <EnergyParticles />
        <FloatingShapes />
      </MouseParallax>

      {/* Simplified post-processing - removed ChromaticAberration for performance */}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          blendFunction={BlendFunction.ADD}
        />
      </EffectComposer>
    </>
  );
}

export default function HeroBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (!prefersReducedMotion) {
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    // Fallback gradient background
    return (
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.1) 0%, transparent 70%)',
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]} // Reduced DPR for performance
        gl={{
          antialias: false, // Disable for performance
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
