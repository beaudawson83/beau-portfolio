'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  type: 'question' | 'response';
  text: string;
}

const RATE_LIMIT_MS = 60000; // 1 minute between AI requests
const STORAGE_KEY = 'askBeau_lastRequest';

export default function AskBeau() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Typewriter effect for responses
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.type !== 'response') return;

    const fullText = lastMessage.text;
    if (displayedResponse === fullText) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const timeout = setTimeout(() => {
      setDisplayedResponse(fullText.substring(0, displayedResponse.length + 1));
    }, 20 + Math.random() * 30);

    return () => clearTimeout(timeout);
  }, [messages, displayedResponse]);

  const canMakeRequest = (): boolean => {
    if (typeof window === 'undefined') return true;
    const lastRequest = localStorage.getItem(STORAGE_KEY);
    if (!lastRequest) return true;
    return Date.now() - parseInt(lastRequest, 10) >= RATE_LIMIT_MS;
  };

  const recordRequest = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const question = input.trim();
    if (!question || isLoading) return;

    // Add question to messages
    setMessages(prev => [...prev, { type: 'question', text: question }]);
    setInput('');
    setIsLoading(true);
    setDisplayedResponse('');

    try {
      // Check rate limit before making request
      if (canMakeRequest()) {
        recordRequest();
      }

      const response = await fetch('/api/ask-beau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      setMessages(prev => [...prev, { type: 'response', text: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'response',
        text: "Whoa there! Even Beau's biggest fan needs a moment to catch his breath. Try again in a sec!"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const statusLines = [
    { label: 'ROLE', value: 'Operations Director & AI Architect' },
    { label: 'LOCATION', value: 'Austin, TX' },
    { label: 'STATUS', value: 'Deployable', highlight: true },
    { label: 'SKILLS', value: 'Maximized for ROI' },
    { label: 'CONTEXT', value: 'Nothing left on the table' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="w-full max-w-lg"
    >
      {/* Terminal window */}
      <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden shadow-2xl">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27CA40]" />
          </div>
          <span className="text-xs text-[#666] font-mono ml-2">beau@system ~ </span>
        </div>

        {/* Terminal content */}
        <div className="p-4 font-mono text-sm">
          {/* Static status output */}
          <div className="text-[#7C3AED] mb-1">$ beau --status</div>
          {statusLines.map((line, index) => (
            <div key={index} className="text-[#94A3B8]">
              {'> '}{line.label}: {' '}
              <span className={line.highlight ? 'text-[#7C3AED]' : ''}>
                {line.value}
              </span>
            </div>
          ))}

          {/* Divider */}
          <div className="border-t border-[#2A2A2A] my-4" />

          {/* Messages history */}
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2"
              >
                {message.type === 'question' ? (
                  <div className="text-[#7C3AED]">
                    $ ask-beau &quot;{message.text}&quot;
                  </div>
                ) : (
                  <div className="text-[#94A3B8] whitespace-pre-wrap">
                    {'> '}
                    {index === messages.length - 1 ? displayedResponse : message.text}
                    {index === messages.length - 1 && isTyping && showCursor && (
                      <span className="inline-block w-2 h-4 bg-[#7C3AED] ml-0.5 align-middle" />
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[#94A3B8]"
            >
              {'> '}<span className="animate-pulse">Consulting Beau&apos;s biggest fan...</span>
            </motion.div>
          )}

          {/* Input form */}
          <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
            <span className="text-[#7C3AED]">$ ask-beau&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Beau..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-white placeholder-[#666] outline-none font-mono text-sm"
              maxLength={200}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="text-[#7C3AED] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              [Enter]
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
