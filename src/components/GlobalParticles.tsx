'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 150;

function Particles() {
  const meshRef = useRef<THREE.Points>(null);
  const [scrollVelocity, setScrollVelocity] = useState(0);

  // Listen to scroll events for velocity-based animation
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const customEvent = e as CustomEvent;
      setScrollVelocity(customEvent.detail?.velocity || 0);
    };
    window.addEventListener('smoothscroll', handleScroll);
    return () => window.removeEventListener('smoothscroll', handleScroll);
  }, []);

  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const vels = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      vels[i * 3] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    return { geometry: geo, velocities: vels };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      positions[i3] += velocities[i3] + Math.sin(time * 0.5 + i) * 0.002;
      positions[i3 + 1] += velocities[i3 + 1] + Math.cos(time * 0.3 + i) * 0.002;
      positions[i3 + 2] += velocities[i3 + 2];

      positions[i3 + 1] -= scrollVelocity * 0.1;

      if (positions[i3] > 10) positions[i3] = -10;
      if (positions[i3] < -10) positions[i3] = 10;
      if (positions[i3 + 1] > 10) positions[i3 + 1] = -10;
      if (positions[i3 + 1] < -10) positions[i3 + 1] = 10;
      if (positions[i3 + 2] > 5) positions[i3 + 2] = -5;
      if (positions[i3 + 2] < -5) positions[i3 + 2] = 5;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.rotation.y = time * 0.02;
    meshRef.current.rotation.x = Math.sin(time * 0.1) * 0.1;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={0.05}
        color="#7C3AED"
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function FloatingLines() {
  const groupRef = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const lineObjects: THREE.Line[] = [];

    for (let i = 0; i < 8; i++) {
      const points: number[] = [];
      const startX = (Math.random() - 0.5) * 15;
      const startY = (Math.random() - 0.5) * 15;
      const startZ = (Math.random() - 0.5) * 5 - 3;

      for (let j = 0; j < 20; j++) {
        points.push(
          startX + Math.sin(j * 0.5) * 2,
          startY + j * 0.3,
          startZ + Math.cos(j * 0.3) * 0.5
        );
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));

      const material = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? '#7C3AED' : '#A78BFA',
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
      });

      lineObjects.push(new THREE.Line(geo, material));
    }

    return lineObjects;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      child.position.y = Math.sin(time * 0.5 + i) * 0.5;
      child.rotation.z = Math.sin(time * 0.2 + i * 0.5) * 0.1;
    });
  });

  return (
    <group ref={groupRef}>
      {lines.map((lineObj, i) => (
        <primitive key={i} object={lineObj} />
      ))}
    </group>
  );
}

export default function GlobalParticles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (!prefersReducedMotion) {
      setMounted(true);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Particles />
        <FloatingLines />
      </Canvas>
    </div>
  );
}
