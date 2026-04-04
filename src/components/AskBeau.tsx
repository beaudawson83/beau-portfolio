'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  trackChatbotOpen,
  trackChatbotQuestion,
  trackChatbotMessage,
  trackChatbotLimitReached,
} from '@/lib/analytics';
import type { ChatMessage } from '@/types';

const MAX_QUESTIONS = 10;
const QUESTION_COUNT_KEY = 'askBeau_questionCount';

export default function AskBeau() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(QUESTION_COUNT_KEY);
      const count = stored ? parseInt(stored, 10) : 0;
      setQuestionCount(count);
      setHasReachedLimit(count >= MAX_QUESTIONS);
    }
  }, []);

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

  const getConversationHistory = (): Array<{ role: string; text: string }> => {
    return messages.map((msg) => ({
      role: msg.type === 'question' ? 'user' : 'assistant',
      text: msg.text,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading || hasReachedLimit) return;

    trackChatbotQuestion(question);
    trackChatbotMessage('user');

    setMessages((prev) => [...prev, { type: 'question', text: question }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask-beau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          conversationHistory: getConversationHistory(),
        }),
      });

      const data = await response.json();
      trackChatbotMessage('bot');
      setMessages((prev) => [...prev, { type: 'response', text: data.response }]);
      incrementQuestionCount();
    } catch {
      setMessages((prev) => [
        ...prev,
        { type: 'response', text: 'Something went wrong. Try again in a moment.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputFocus = () => {
    if (messages.length === 0) {
      trackChatbotOpen();
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-hidden">
        {/* Messages */}
        {messages.length > 0 && (
          <div className="px-4 pt-4 pb-2 space-y-3 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {message.type === 'question' ? (
                    <p className="text-sm text-white">
                      {message.text}
                    </p>
                  ) : (
                    <p className="text-sm text-[#94A3B8] leading-relaxed">
                      {message.text}
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <p className="text-sm text-[#94A3B8]/50 animate-pulse">
                Thinking...
              </p>
            )}
          </div>
        )}

        {/* Input */}
        {hasReachedLimit ? (
          <div className="px-4 py-3 text-xs text-[#94A3B8]">
            Question limit reached. Refresh to start over, or reach out directly below.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center border-t border-[#2A2A2A]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleInputFocus}
              placeholder={messages.length === 0 ? 'Ask about Beau...' : 'Follow up...'}
              disabled={isLoading}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-[#94A3B8]/30 outline-none"
              maxLength={200}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 text-xs font-mono text-[#94A3B8]/40 hover:text-[#7C3AED] transition-colors disabled:opacity-30"
            >
              {MAX_QUESTIONS - questionCount}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
