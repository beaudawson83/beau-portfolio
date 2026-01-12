'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLoginFieldsType } from '../useAutoType';
import { LoginScreenProps } from '../types';

export default function NSALogin({ onPhaseChange, onComplete }: LoginScreenProps) {
  const { usernameText, passwordText, phase, isComplete, start } = useLoginFieldsType({
    username: 'TAO_OPERATOR',
    password: 'qu4ntum_r3s1st',
    charDelay: 22,
  });

  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [showGranted, setShowGranted] = useState(false);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (phase === 'username') {
      setTerminalLines(['> INITIALIZING SECURE CONNECTION...']);
    } else if (phase === 'password') {
      setTerminalLines(prev => [...prev, '> CREDENTIALS DETECTED']);
    }
  }, [phase]);

  useEffect(() => {
    if (isComplete && !showGranted) {
      setTerminalLines(prev => [...prev, '> VERIFYING ACCESS LEVEL...']);
      onPhaseChange?.('authenticating');
      const authTimer = setTimeout(() => {
        setTerminalLines(prev => [...prev, '> ACCESS GRANTED']);
        setShowGranted(true);
        onPhaseChange?.('granted');
        const grantedTimer = setTimeout(() => {
          onComplete();
        }, 400);
        return () => clearTimeout(grantedTimer);
      }, 300);
      return () => clearTimeout(authTimer);
    }
  }, [isComplete, showGranted, onPhaseChange, onComplete]);

  return (
    <div className="min-h-screen bg-black flex flex-col font-mono">
      {/* Minimal header */}
      <div className="py-2 px-4 border-b border-green-900/50">
        <div className="flex items-center justify-between text-xs">
          <div className="text-green-500">
            NSA // TAO // TAILORED ACCESS OPERATIONS
          </div>
          <div className="text-green-700">
            ████████████
          </div>
        </div>
      </div>

      {/* Main content - pure terminal style */}
      <div className="flex-1 flex flex-col p-4">
        {/* Terminal output area */}
        <div className="flex-1 overflow-hidden">
          <div className="text-green-500 text-xs space-y-1 mb-4">
            {terminalLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {line}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Login area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-lg"
        >
          {!showGranted ? (
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="text-green-700 mr-2">OPERATOR_ID:</span>
                <span className="text-green-400 flex-1">
                  {usernameText}
                  {phase === 'username' && (
                    <span className="inline-block w-2 h-4 bg-green-500 ml-0.5 animate-pulse" />
                  )}
                </span>
              </div>

              <div className="flex items-center text-sm">
                <span className="text-green-700 mr-2">ACCESS_KEY:</span>
                <span className="text-green-400 flex-1">
                  {passwordText}
                  {phase === 'password' && (
                    <span className="inline-block w-2 h-4 bg-green-500 ml-0.5 animate-pulse" />
                  )}
                </span>
              </div>

              {isComplete && !showGranted && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-yellow-500 text-sm mt-4"
                >
                  {'>'} AUTHENTICATING...
                  <span className="inline-block w-2 h-4 bg-yellow-500 ml-0.5 animate-pulse" />
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="text-green-500 text-lg">
                ████████████████████████████████
              </div>
              <div className="text-green-400 text-xl tracking-wider">
                ACCESS GRANTED
              </div>
              <div className="text-green-700 text-sm">
                CLEARANCE: GAMMA // UMBRA
              </div>
              <div className="text-green-500 text-lg">
                ████████████████████████████████
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Bottom status bar */}
        <div className="mt-4 pt-2 border-t border-green-900/50 flex justify-between text-xs text-green-700">
          <span>QUANTUM-RESISTANT ENCRYPTION ACTIVE</span>
          <span>NODE: FT-MEADE-TAO-07</span>
        </div>
      </div>

      {/* Decorative side elements */}
      <div className="fixed left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500/20 via-green-500/5 to-green-500/20" />
      <div className="fixed right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500/20 via-green-500/5 to-green-500/20" />
    </div>
  );
}
