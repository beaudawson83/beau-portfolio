'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { EasterEggPhase } from './types';
import PiSymbol from './PiSymbol';
import HackingSequence from './HackingSequence';
import TerminalLogin from './TerminalLogin';
import Dashboard from './Dashboard';

export default function PiEasterEgg() {
  const [phase, setPhase] = useState<EasterEggPhase>('idle');

  const handlePiClick = useCallback(() => {
    setPhase('hacking');
  }, []);

  const handleHackingComplete = useCallback(() => {
    setPhase('login');
  }, []);

  const handleClose = useCallback(() => {
    setPhase('idle');
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setPhase('dashboard');
  }, []);

  return (
    <>
      {phase === 'idle' && <PiSymbol onClick={handlePiClick} />}

      <AnimatePresence>
        {phase === 'hacking' && (
          <HackingSequence isActive={true} onComplete={handleHackingComplete} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'login' && (
          <TerminalLogin isActive={true} onClose={handleClose} onSuccess={handleLoginSuccess} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'dashboard' && (
          <Dashboard onClose={handleClose} />
        )}
      </AnimatePresence>
    </>
  );
}
