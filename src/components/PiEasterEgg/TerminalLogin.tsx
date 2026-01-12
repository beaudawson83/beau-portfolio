'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TerminalLoginState, CodeChallenge, StarTrekQuote } from './types';
import { generateCodeChallenge, validateCodeResponse } from './codeChallenge';
import { getRandomQuote } from './starTrekQuotes';

interface TerminalLoginProps {
  isActive: boolean;
  onClose: () => void;
}

export default function TerminalLogin({ isActive, onClose }: TerminalLoginProps) {
  const [state, setState] = useState<TerminalLoginState>({
    phase: 'code-challenge',
    strikes: 0,
    currentCode: null,
    currentQuote: null,
    userInput: '',
  });
  const [showError, setShowError] = useState(false);
  const [usedQuoteIds, setUsedQuoteIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize code challenge on mount
  useEffect(() => {
    if (isActive && !state.currentCode) {
      setState(prev => ({
        ...prev,
        currentCode: generateCodeChallenge(),
      }));
    }
  }, [isActive, state.currentCode]);

  // Focus input when phase changes
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, state.phase]);

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isActive, handleEscape]);

  // Reset state when closed
  useEffect(() => {
    if (!isActive) {
      setState({
        phase: 'code-challenge',
        strikes: 0,
        currentCode: null,
        currentQuote: null,
        userInput: '',
      });
      setUsedQuoteIds([]);
      setShowError(false);
    }
  }, [isActive]);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.currentCode || !state.userInput) return;

    if (validateCodeResponse(state.userInput, state.currentCode.answer)) {
      // Correct - advance to quote challenge
      const quote = getRandomQuote(usedQuoteIds);
      setUsedQuoteIds(prev => [...prev, quote.id]);
      setState(prev => ({
        ...prev,
        phase: 'quote-challenge',
        currentQuote: quote,
        userInput: '',
      }));
    } else {
      // Wrong - strike
      const newStrikes = state.strikes + 1;
      if (newStrikes >= 2) {
        setState(prev => ({ ...prev, phase: 'denied', strikes: newStrikes }));
        setTimeout(() => onClose(), 2000);
      } else {
        setShowError(true);
        setTimeout(() => {
          setShowError(false);
          setState(prev => ({
            ...prev,
            strikes: newStrikes,
            currentCode: generateCodeChallenge(),
            userInput: '',
          }));
        }, 1500);
      }
    }
  };

  const handleQuoteAnswer = (answer: string) => {
    if (!state.currentQuote) return;

    if (answer === state.currentQuote.correctAnswer) {
      // Correct - access granted
      setState(prev => ({ ...prev, phase: 'granted' }));
    } else {
      // Wrong - strike
      const newStrikes = state.strikes + 1;
      if (newStrikes >= 2) {
        setState(prev => ({ ...prev, phase: 'denied', strikes: newStrikes }));
        setTimeout(() => onClose(), 2000);
      } else {
        setShowError(true);
        setTimeout(() => {
          setShowError(false);
          const quote = getRandomQuote(usedQuoteIds);
          setUsedQuoteIds(prev => [...prev, quote.id]);
          setState(prev => ({
            ...prev,
            strikes: newStrikes,
            currentQuote: quote,
          }));
        }, 1500);
      }
    }
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4"
    >
      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-green-500/30 hover:text-green-500/60
                   transition-colors font-mono text-sm"
      >
        [ESC]
      </button>

      {/* Terminal container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="w-full max-w-2xl"
      >
        {/* Terminal header */}
        <div className="bg-[#1a1a1a] border border-green-900/50 border-b-0 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="font-mono text-green-500/60 text-xs ml-2">
            SECURE_TERMINAL_v2.4.1
          </span>
        </div>

        {/* Terminal body */}
        <div className="bg-black/90 border border-green-900/50 p-6 font-mono min-h-[400px]">
          {/* Strike counter */}
          {state.strikes > 0 && state.phase !== 'denied' && state.phase !== 'granted' && (
            <div className="text-red-500/60 text-xs mb-4">
              [WARNING: {state.strikes}/2 FAILED ATTEMPTS]
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Code Challenge Phase */}
            {state.phase === 'code-challenge' && state.currentCode && (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="text-green-500/60 text-sm mb-6">
                  {'>'} AUTHENTICATION REQUIRED
                </div>
                <div className="text-green-500/60 text-sm mb-2">
                  {'>'} INCOMING TRANSMISSION:
                </div>
                <div className="text-green-400 text-3xl tracking-[0.5em] mb-8 pl-4">
                  {state.currentCode.prompt}
                </div>

                {showError ? (
                  <motion.div
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: 1, x: [0, -10, 10, -10, 10, 0] }}
                    className="text-red-500 text-sm"
                  >
                    {'>'} INVALID RESPONSE - STRIKE {state.strikes + 1}
                  </motion.div>
                ) : (
                  <form onSubmit={handleCodeSubmit}>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500/60 text-sm">{'>'} RESPONSE:</span>
                      <input
                        ref={inputRef}
                        type="text"
                        value={state.userInput}
                        onChange={e => setState(prev => ({
                          ...prev,
                          userInput: e.target.value.toUpperCase().slice(0, 6)
                        }))}
                        maxLength={6}
                        className="flex-1 bg-transparent border-none outline-none text-green-400
                                   text-xl tracking-[0.3em] uppercase font-mono caret-green-500"
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <div className="text-green-500/30 text-xs mt-4">
                      [ENTER 6-CHARACTER RESPONSE]
                    </div>
                  </form>
                )}
              </motion.div>
            )}

            {/* Quote Challenge Phase */}
            {state.phase === 'quote-challenge' && state.currentQuote && (
              <motion.div
                key="quote"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="text-green-500/60 text-sm mb-6">
                  {'>'} SECURITY VERIFICATION
                </div>
                <div className="text-green-500/60 text-sm mb-2">
                  {'>'} COMPLETE THE TRANSMISSION:
                </div>
                <div className="text-green-400 text-xl mb-8 pl-4">
                  "{state.currentQuote.partial}"
                </div>

                {showError ? (
                  <motion.div
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: 1, x: [0, -10, 10, -10, 10, 0] }}
                    className="text-red-500 text-sm"
                  >
                    {'>'} INCORRECT - STRIKE {state.strikes + 1}
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {state.currentQuote.options.map(option => (
                      <button
                        key={option.label}
                        onClick={() => handleQuoteAnswer(option.label)}
                        className="w-full text-left px-4 py-2 text-green-500/80 hover:text-green-400
                                   hover:bg-green-900/20 transition-colors border border-transparent
                                   hover:border-green-900/50"
                      >
                        [{option.label}] {option.text}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Access Granted */}
            {state.phase === 'granted' && (
              <motion.div
                key="granted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{
                    textShadow: ['0 0 10px #22c55e', '0 0 20px #22c55e', '0 0 10px #22c55e']
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-green-500 text-3xl tracking-widest mb-4"
                >
                  ACCESS GRANTED
                </motion.div>
                <div className="text-green-500/60 text-sm">
                  {'>'} WELCOME, OPERATOR
                </div>
                <div className="text-green-500/40 text-xs mt-8">
                  [DASHBOARD COMING SOON]
                </div>
              </motion.div>
            )}

            {/* Access Denied */}
            {state.phase === 'denied' && (
              <motion.div
                key="denied"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-red-500 text-3xl tracking-widest mb-4"
                >
                  ACCESS DENIED
                </motion.div>
                <div className="text-red-500/60 text-sm">
                  {'>'} MAXIMUM ATTEMPTS EXCEEDED
                </div>
                <div className="text-red-500/40 text-xs mt-4">
                  [CONNECTION TERMINATED]
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Blinking cursor */}
          {(state.phase === 'code-challenge' || state.phase === 'quote-challenge') && !showError && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-green-500 ml-1 align-middle"
            />
          )}
        </div>

        {/* Terminal footer */}
        <div className="bg-[#1a1a1a] border border-green-900/50 border-t-0 px-4 py-2">
          <div className="flex justify-between font-mono text-green-500/30 text-xs">
            <span>SEC-7742-A</span>
            <span>ENCRYPTED</span>
            <span>TLS 1.3</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
