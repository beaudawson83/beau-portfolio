'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginScreenProps, ScreenConfig } from './types';
import GlitchTransition from './GlitchTransition';
import {
  StanfordLogin,
  LockheedLogin,
  AWSConsole,
  MI6Login,
  CIALogin,
  PentagonLogin,
  NSALogin,
  UnknownDB,
} from './screens';

interface HackingSequenceProps {
  isActive: boolean;
  onComplete: () => void;
}

// Define the sequence of screens
const SCREENS: ScreenConfig[] = [
  { id: 'stanford', name: 'Stanford University', component: StanfordLogin },
  { id: 'lockheed', name: 'Lockheed Martin', component: LockheedLogin },
  { id: 'aws', name: 'AWS Console', component: AWSConsole },
  { id: 'mi6', name: 'MI6 / SIS', component: MI6Login },
  { id: 'cia', name: 'CIA', component: CIALogin },
  { id: 'pentagon', name: 'Pentagon SIPRNET', component: PentagonLogin },
  { id: 'nsa', name: 'NSA TAO', component: NSALogin },
  { id: 'unknown', name: 'Unknown Database', component: UnknownDB },
];

export default function HackingSequence({ isActive, onComplete }: HackingSequenceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGlitch, setShowGlitch] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Reset state when deactivated
  useEffect(() => {
    if (!isActive) {
      setCurrentIndex(0);
      setShowGlitch(false);
      setIsTransitioning(false);
    }
  }, [isActive]);

  const handleScreenComplete = useCallback(() => {
    if (currentIndex >= SCREENS.length - 1) {
      // Last screen (UnknownDB) completed - move to login phase
      onComplete();
      return;
    }

    // Show glitch transition before next screen
    setIsTransitioning(true);
    setShowGlitch(true);
  }, [currentIndex, onComplete]);

  const handleGlitchComplete = useCallback(() => {
    setShowGlitch(false);
    setCurrentIndex(prev => prev + 1);
    setIsTransitioning(false);
  }, []);

  if (!isActive) return null;

  const CurrentScreen = SCREENS[currentIndex]?.component;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
    >
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none scanlines opacity-20 z-40" />

      {/* Current screen */}
      <AnimatePresence mode="wait">
        {CurrentScreen && !isTransitioning && (
          <motion.div
            key={SCREENS[currentIndex].id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
          >
            <CurrentScreen onComplete={handleScreenComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glitch transition overlay */}
      <GlitchTransition
        isActive={showGlitch}
        onComplete={handleGlitchComplete}
        duration={150}
      />

      {/* CRT flicker effect */}
      <div className="absolute inset-0 pointer-events-none crt-flicker z-30" />
    </motion.div>
  );
}
