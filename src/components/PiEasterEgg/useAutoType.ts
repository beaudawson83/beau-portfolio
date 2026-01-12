'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseAutoTypeOptions {
  text: string;
  delay?: number;
  charDelay?: number;
  onComplete?: () => void;
  startTyping?: boolean;
}

export function useAutoType({
  text,
  delay = 0,
  charDelay = 30,
  onComplete,
  startTyping = true,
}: UseAutoTypeOptions) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const reset = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsTyping(false);
  }, []);

  useEffect(() => {
    if (!startTyping) {
      reset();
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let charIndex = 0;

    const startDelay = setTimeout(() => {
      setIsTyping(true);

      const typeChar = () => {
        if (charIndex < text.length) {
          setDisplayText(text.slice(0, charIndex + 1));
          charIndex++;
          timeoutId = setTimeout(typeChar, charDelay);
        } else {
          setIsTyping(false);
          setIsComplete(true);
          onComplete?.();
        }
      };

      typeChar();
    }, delay);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(timeoutId);
    };
  }, [text, delay, charDelay, onComplete, startTyping, reset]);

  return { displayText, isComplete, isTyping, reset };
}

// Hook for sequential field typing (username then password)
export type LoginFieldPhase = 'idle' | 'username' | 'password' | 'complete';

interface FieldConfig {
  username: string;
  password: string;
  usernameDelay?: number;
  passwordDelay?: number;
  charDelay?: number;
}

interface LoginFieldsResult {
  usernameText: string;
  passwordText: string;
  phase: LoginFieldPhase;
  isComplete: boolean;
  start: () => void;
  reset: () => void;
}

export function useLoginFieldsType({
  username,
  password,
  usernameDelay = 100,
  passwordDelay = 50,
  charDelay = 25,
}: FieldConfig): LoginFieldsResult {
  const [usernameText, setUsernameText] = useState('');
  const [passwordText, setPasswordText] = useState('');
  const [phase, setPhase] = useState<LoginFieldPhase>('idle');

  const start = useCallback(() => {
    setPhase('username');
    setUsernameText('');
    setPasswordText('');
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setUsernameText('');
    setPasswordText('');
  }, []);

  useEffect(() => {
    if (phase === 'idle') return;

    let timeoutId: NodeJS.Timeout;
    let charIndex = 0;

    if (phase === 'username') {
      const startDelay = setTimeout(() => {
        const typeChar = () => {
          if (charIndex < username.length) {
            setUsernameText(username.slice(0, charIndex + 1));
            charIndex++;
            timeoutId = setTimeout(typeChar, charDelay);
          } else {
            setPhase('password');
          }
        };
        typeChar();
      }, usernameDelay);

      return () => {
        clearTimeout(startDelay);
        clearTimeout(timeoutId);
      };
    }

    if (phase === 'password') {
      charIndex = 0;
      const startDelay = setTimeout(() => {
        const typeChar = () => {
          if (charIndex < password.length) {
            setPasswordText('•'.repeat(charIndex + 1));
            charIndex++;
            timeoutId = setTimeout(typeChar, charDelay);
          } else {
            setPhase('complete');
          }
        };
        typeChar();
      }, passwordDelay);

      return () => {
        clearTimeout(startDelay);
        clearTimeout(timeoutId);
      };
    }
  }, [phase, username, password, usernameDelay, passwordDelay, charDelay]);

  return {
    usernameText,
    passwordText,
    phase,
    isComplete: phase === 'complete',
    start,
    reset,
  };
}
