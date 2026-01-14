'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  trackChatbotOpen,
  trackChatbotQuestion,
  trackChatbotMessage,
  trackChatbotLimitReached,
} from '@/lib/analytics';

interface Message {
  type: 'question' | 'response';
  text: string;
}

interface BootLine {
  type: 'command' | 'output';
  text: string;
  highlight?: boolean;
}

const MAX_QUESTIONS = 10;
const QUESTION_COUNT_KEY = 'askBeau_questionCount';

const bootSequence: BootLine[] = [
  { type: 'command', text: '$ beau --status' },
  { type: 'output', text: '> ROLE: Operations Director & AI Architect' },
  { type: 'output', text: '> LOCATION: Austin, TX' },
  { type: 'output', text: '> STATUS: Deployable', highlight: true },
  { type: 'output', text: '> SKILLS: Maximized for ROI' },
  { type: 'output', text: '> CONTEXT: Nothing left on the table' },
];

export default function AskBeau() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [questionCount, setQuestionCount] = useState(0);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [showHint, setShowHint] = useState(false); // Start false, show after boot
  const [showGlow, setShowGlow] = useState(false); // Start false, show after boot
  const inputRef = useRef<HTMLInputElement>(null);

  // Boot sequence state
  const [bootComplete, setBootComplete] = useState(false);
  const [displayedBootLines, setDisplayedBootLines] = useState<string[]>([]);
  const [currentBootLine, setCurrentBootLine] = useState(0);
  const [currentBootChar, setCurrentBootChar] = useState(0);
  const [showReady, setShowReady] = useState(false);

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

  // Boot sequence typewriter effect
  useEffect(() => {
    if (bootComplete) return;

    // If we've finished all lines
    if (currentBootLine >= bootSequence.length) {
      // Small delay before showing "ready" state
      const readyTimeout = setTimeout(() => {
        setBootComplete(true);
        setShowReady(true);
        // Trigger the input glow and hint after boot
        setTimeout(() => {
          setShowGlow(true);
          setShowHint(true);
        }, 300);
        // Stop the ready flash after a moment
        setTimeout(() => {
          setShowReady(false);
        }, 1500);
      }, 400);
      return () => clearTimeout(readyTimeout);
    }

    const currentLine = bootSequence[currentBootLine];
    const text = currentLine.text;

    // Still typing current line
    if (currentBootChar < text.length) {
      // Commands type slower (human-like), output types faster (computer-like)
      const typingSpeed = currentLine.type === 'command'
        ? 60 + Math.random() * 40 // Commands: 60-100ms per char
        : 18 + Math.random() * 22; // Output: 18-40ms per char

      const typingTimeout = setTimeout(() => {
        setDisplayedBootLines(prev => {
          const newLines = [...prev];
          newLines[currentBootLine] = text.substring(0, currentBootChar + 1);
          return newLines;
        });
        setCurrentBootChar(prev => prev + 1);
      }, typingSpeed);

      return () => clearTimeout(typingTimeout);
    } else {
      // Finished current line, move to next
      const lineDelay = currentLine.type === 'command' ? 350 : 120;
      const nextLineTimeout = setTimeout(() => {
        setCurrentBootLine(prev => prev + 1);
        setCurrentBootChar(0);
      }, lineDelay);

      return () => clearTimeout(nextLineTimeout);
    }
  }, [bootComplete, currentBootLine, currentBootChar]);

  // Stop glow animation after 3 seconds (once it starts)
  useEffect(() => {
    if (!showGlow) return;
    const glowTimer = setTimeout(() => {
      setShowGlow(false);
    }, 3000);
    return () => clearTimeout(glowTimer);
  }, [showGlow]);

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
      trackChatbotLimitReached();
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

    // Track the question being asked
    trackChatbotQuestion(question);
    trackChatbotMessage('user');

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

      // Track bot response
      trackChatbotMessage('bot');
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

  // Track when user focuses on input (shows intent to use chatbot)
  const handleInputFocus = () => {
    setShowHint(false);
    if (messages.length === 0) {
      trackChatbotOpen();
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="w-full max-w-lg relative"
    >
      {/* Terminal-style hint - positioned outside right of terminal (desktop only) */}
      <AnimatePresence>
        {showHint && messages.length === 0 && !hasReachedLimit && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute -right-4 bottom-5 translate-x-full hidden lg:flex items-center gap-3"
          >
            {/* Animated arrow construct */}
            <div className="flex items-center gap-1">
              {/* Pulsing chevrons */}
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0.3 }}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    x: [0, -2, 0]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                  className="text-[#7C3AED] text-lg font-mono font-bold"
                >
                  &lt;
                </motion.span>
              ))}
            </div>

            {/* Hint text with terminal styling */}
            <div className="relative">
              {/* Glow backdrop */}
              <div className="absolute inset-0 bg-[#7C3AED]/10 blur-xl rounded-lg" />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative bg-[#0D0D0D]/90 border border-[#7C3AED]/40 rounded px-3 py-1.5 backdrop-blur-sm"
              >
                <span className="text-[#7C3AED] text-xs font-mono">
                  <span className="text-[#94A3B8]">$</span> ask anything about Beau
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="inline-block w-1.5 h-3 bg-[#7C3AED] ml-1 align-middle"
                  />
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal window */}
      <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden shadow-2xl">
        {/* Terminal header */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
          <div className="flex gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27CA40]" />
          </div>
          <span className="text-[10px] sm:text-xs text-[#666] font-mono ml-1.5 sm:ml-2">beau@system ~ </span>
        </div>

        {/* Terminal content */}
        <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm relative overflow-hidden">
          {/* Scanline effect overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-30" />

          {/* Boot sequence with typewriter effect */}
          <div className="relative">
            {displayedBootLines.map((line, index) => {
              const lineData = bootSequence[index];
              const isCurrentLine = index === currentBootLine && !bootComplete;
              const isCommand = lineData?.type === 'command';

              // For output lines, check if this line should have highlight
              const hasHighlight = lineData?.highlight;

              // Split the line to apply highlight to the value part (after the colon)
              const renderLine = () => {
                if (hasHighlight && line.includes(': ')) {
                  const colonIndex = line.indexOf(': ');
                  const prefix = line.substring(0, colonIndex + 2);
                  const value = line.substring(colonIndex + 2);
                  return (
                    <>
                      {prefix}<span className="text-[#7C3AED]">{value}</span>
                    </>
                  );
                }
                return line;
              };

              return (
                <div
                  key={index}
                  className={`leading-relaxed ${
                    isCommand ? 'text-[#7C3AED]' : 'text-[#94A3B8]'
                  }`}
                >
                  {renderLine()}
                  {isCurrentLine && showCursor && (
                    <span className="inline-block w-2 h-4 bg-[#7C3AED] ml-0.5 align-middle animate-pulse" />
                  )}
                </div>
              );
            })}

            {/* Show cursor on empty state before boot starts */}
            {displayedBootLines.length === 0 && showCursor && (
              <span className="inline-block w-2 h-4 bg-[#7C3AED] animate-pulse" />
            )}
          </div>

          {/* Divider - only show after boot complete */}
          <AnimatePresence>
            {bootComplete && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.3 }}
                className="border-t border-[#2A2A2A] my-4 origin-left"
              />
            )}
          </AnimatePresence>

          {/* Messages history - only show after boot */}
          <AnimatePresence>
            {bootComplete && messages.map((message, index) => (
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
          {bootComplete && isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[#94A3B8]"
            >
              {'> '}<span className="animate-pulse">Consulting Beau&apos;s biggest fan...</span>
            </motion.div>
          )}

          {/* Input form - only show after boot */}
          <AnimatePresence>
            {bootComplete && (
              <>
                {hasReachedLimit ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 sm:mt-4 text-[#94A3B8] text-[11px] sm:text-sm"
                  >
                    <span className="text-[#7C3AED]">$ </span>
                    That&apos;s a wrap, partner! 🤠 You&apos;ve hit the {MAX_QUESTIONS}-question limit. Refresh the page to start a new round, or better yet—reach out to the real Beau! 🥊
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 sm:mt-4 relative"
                  >
                    {/* Ready flash effect */}
                    {showReady && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.6, times: [0, 0.3, 1] }}
                        className="absolute -inset-2 rounded-lg bg-[#7C3AED]/20 pointer-events-none"
                      />
                    )}

                    {/* Input with glow effect */}
                    <form
                      onSubmit={handleSubmit}
                      className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 -m-1.5 sm:-m-2 rounded-lg transition-all duration-300 ${
                        showGlow && messages.length === 0
                          ? 'animate-pulse-glow'
                          : ''
                      }`}
                    >
                      <span className="text-[#7C3AED] text-[10px] sm:text-sm whitespace-nowrap">$ ask-beau&gt;</span>
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={handleInputFocus}
                        placeholder="Ask anything..."
                        disabled={isLoading}
                        className="flex-1 min-w-0 bg-transparent text-white placeholder-[#666] outline-none font-mono text-[11px] sm:text-sm"
                        maxLength={200}
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="text-[#7C3AED] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-sm whitespace-nowrap flex-shrink-0"
                      >
                        [{MAX_QUESTIONS - questionCount}]
                      </button>
                    </form>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
