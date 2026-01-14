'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { EasterEggPhase } from './types';
import PiSymbol from './PiSymbol';
import HackingSequence from './HackingSequence';
import TerminalLogin from './TerminalLogin';
import Dashboard from './Dashboard';
import { trackEasterEggDiscovery, trackEasterEggPhase } from '@/lib/analytics';

export default function PiEasterEgg() {
  const [phase, setPhase] = useState<EasterEggPhase>('idle');

  const handlePiClick = useCallback(() => {
    trackEasterEggDiscovery('Pi Symbol Found');
    trackEasterEggPhase('hacking_started');
    setPhase('hacking');
  }, []);

  const handleHackingComplete = useCallback(() => {
    trackEasterEggPhase('hacking_complete');
    setPhase('login');
  }, []);

  const handleClose = useCallback(() => {
    trackEasterEggPhase('closed');
    setPhase('idle');
  }, []);

  const handleLoginSuccess = useCallback(() => {
    trackEasterEggPhase('dashboard_accessed');
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
