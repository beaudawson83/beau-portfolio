'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  type: 'question' | 'response';
  text: string;
}

const MAX_QUESTIONS = 10;
const QUESTION_COUNT_KEY = 'askBeau_questionCount';

export default function AskBeau() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [questionCount, setQuestionCount] = useState(0);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [showGlow, setShowGlow] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load question count from session storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(QUESTION_COUNT_KEY);
      const count = stored ? parseInt(stored, 10) : 0;
      setQuestionCount(count);
      setHasReachedLimit(count >= MAX_QUESTIONS);
    }
  }, []);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Stop glow animation after 3 seconds
  useEffect(() => {
    const glowTimer = setTimeout(() => {
      setShowGlow(false);
    }, 3000);
    return () => clearTimeout(glowTimer);
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

  const incrementQuestionCount = () => {
    const newCount = questionCount + 1;
    setQuestionCount(newCount);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(QUESTION_COUNT_KEY, newCount.toString());
    }
    if (newCount >= MAX_QUESTIONS) {
      setHasReachedLimit(true);
    }
  };

  // Build conversation history for context
  const getConversationHistory = (): Array<{ role: string; text: string }> => {
    return messages.map(msg => ({
      role: msg.type === 'question' ? 'user' : 'assistant',
      text: msg.text
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const question = input.trim();
    if (!question || isLoading || hasReachedLimit) return;

    // Add question to messages
    setMessages(prev => [...prev, { type: 'question', text: question }]);
    setInput('');
    setIsLoading(true);
    setDisplayedResponse('');

    try {
      const response = await fetch('/api/ask-beau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          conversationHistory: getConversationHistory()
        }),
      });

      const data = await response.json();

      setMessages(prev => [...prev, { type: 'response', text: data.response }]);
      incrementQuestionCount();
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'response',
        text: "Whoa there, partner! 🤠 Even Beau's biggest fan needs a moment to catch his breath. Try again in a sec!"
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
      className="w-full max-w-lg relative"
    >
      {/* Bouncing hint - positioned outside right of terminal */}
      <AnimatePresence>
        {showHint && messages.length === 0 && !hasReachedLimit && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute -right-4 bottom-6 translate-x-full hidden lg:flex items-center gap-2"
          >
            <motion.span
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              className="text-[#7C3AED] text-2xl"
            >
              👈
            </motion.span>
            <span className="text-[#7C3AED] text-sm whitespace-nowrap">
              Ask me anything about Beau!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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
          {hasReachedLimit ? (
            <div className="mt-4 text-[#94A3B8]">
              <span className="text-[#7C3AED]">$ </span>
              That&apos;s a wrap, partner! 🤠 You&apos;ve hit the {MAX_QUESTIONS}-question limit. Refresh the page to start a new round, or better yet—reach out to the real Beau! 🥊
            </div>
          ) : (
            <div className="mt-4 relative">
              {/* Input with glow effect */}
              <form
                onSubmit={handleSubmit}
                className={`flex items-center gap-2 p-2 -m-2 rounded-lg transition-all duration-300 ${
                  showGlow && messages.length === 0
                    ? 'animate-pulse-glow'
                    : ''
                }`}
              >
                <span className="text-[#7C3AED]">$ ask-beau&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setShowHint(false)}
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
                  [{MAX_QUESTIONS - questionCount} left]
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
