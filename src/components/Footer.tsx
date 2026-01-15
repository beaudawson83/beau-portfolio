'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, FormEvent, useEffect } from 'react';
import { socialLinks } from '@/lib/data';
import { ContactObjective, OBJECTIVE_LABELS } from '@/types';
import {
  trackContactFormStart,
  trackContactFormSubmit,
  trackContactFormSuccess,
  trackContactFormError,
  trackSocialClick,
} from '@/lib/analytics';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';

// Terminal boot messages
const bootMessages = [
  'INITIALIZING_SECURE_CHANNEL...',
  'ESTABLISHING_CONNECTION...',
  'ENCRYPTING_TRANSMISSION...',
  'CHANNEL_ESTABLISHED',
];

// Boot sequence component
function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [displayedChars, setDisplayedChars] = useState(0);

  useEffect(() => {
    if (currentMessage >= bootMessages.length) {
      setTimeout(onComplete, 300);
      return;
    }

    const message = bootMessages[currentMessage];
    if (displayedChars < message.length) {
      const timer = setTimeout(() => {
        setDisplayedChars((prev) => prev + 1);
      }, 30);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCurrentMessage((prev) => prev + 1);
        setDisplayedChars(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentMessage, displayedChars, onComplete]);

  return (
    <div className="space-y-2 font-mono text-xs sm:text-sm text-[#94A3B8]">
      {bootMessages.slice(0, currentMessage + 1).map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className={i < currentMessage ? 'text-[#10B981]' : 'text-[#7C3AED]'}>
            {i < currentMessage ? '✓' : '>'}
          </span>
          <span>
            {i === currentMessage
              ? msg.slice(0, displayedChars)
              : msg}
          </span>
          {i === currentMessage && (
            <motion.span
              className="inline-block w-2 h-4 bg-[#7C3AED]"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Holographic input field
function HolographicInput({
  label,
  id,
  type = 'text',
  value,
  onChange,
  onFocus,
  placeholder,
  required,
  isVisible,
  delay,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  placeholder: string;
  required?: boolean;
  isVisible: boolean;
  delay: number;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2"
    >
      <label
        htmlFor={id}
        className="font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base text-[#94A3B8] whitespace-nowrap"
      >
        {'>'} {label}:
      </label>
      <div className="relative flex-1">
        {/* Glow ring on focus */}
        <motion.div
          className="absolute -inset-1 rounded-sm pointer-events-none"
          animate={{
            boxShadow: isFocused
              ? '0 0 20px rgba(124, 58, 237, 0.3), 0 0 40px rgba(124, 58, 237, 0.1)'
              : 'none',
          }}
          transition={{ duration: 0.3 }}
        />
        <input
          type={type}
          id={id}
          value={value}
          onFocus={() => {
            setIsFocused(true);
            onFocus();
          }}
          onBlur={() => setIsFocused(false)}
          onChange={onChange}
          required={required}
          className="relative w-full bg-[#1F1F1F] border border-[#2A2A2A] focus:border-[#7C3AED] px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs md:text-sm 2xl:text-base text-white outline-none transition-all duration-300 rounded-sm"
          placeholder={placeholder}
        />
        {/* Scan line effect on focus */}
        {isFocused && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent"
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Transmission particles on submit
function TransmissionEffect({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#7C3AED]"
          initial={{
            left: '50%',
            bottom: '50%',
            opacity: 1,
            scale: 1,
          }}
          animate={{
            left: `${50 + (Math.random() - 0.5) * 100}%`,
            bottom: '100%',
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 1 + Math.random() * 0.5,
            delay: i * 0.05,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export default function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [bootComplete, setBootComplete] = useState(false);
  const [showTransmission, setShowTransmission] = useState(false);

  // Track when contact section becomes visible
  useTrackSectionWithRef(ref, 'Footer_Contact');

  const [formData, setFormData] = useState({
    name: '',
    objective: 'full-time' as ContactObjective,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [hasStartedForm, setHasStartedForm] = useState(false);

  // Track when user starts filling the form
  const handleFormInteraction = () => {
    if (!hasStartedForm) {
      trackContactFormStart();
      setHasStartedForm(true);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setShowTransmission(true);

    // Track form submission attempt
    trackContactFormSubmit(formData.objective);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Track successful submission
      trackContactFormSuccess(formData.objective);
      setSubmitStatus('success');
      setFormData({ name: '', objective: 'full-time', message: '' });
      setHasStartedForm(false);
    } catch {
      // Track form error
      trackContactFormError(formData.objective);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setShowTransmission(false), 1500);
    }
  };

  // Handle social link clicks with tracking
  const handleSocialClick = (label: string, url: string) => {
    trackSocialClick(label, url);
  };

  return (
    <footer
      id="contact"
      className="relative py-12 sm:py-16 md:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 border-t border-[#1F1F1F] overflow-hidden"
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, #7C3AED 1px, transparent 1px),
            linear-gradient(#7C3AED 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-4xl 2xl:max-w-5xl mx-auto relative">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Section header with terminal styling */}
          <motion.div
            className="font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base text-[#7C3AED] mb-6 sm:mb-8 md:mb-10 tracking-wider flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="text-white/50">$</span>
            <span>{'>'} INPUT_OUTPUT</span>
            <span className="text-[#94A3B8]">// SECURE_TRANSMISSION</span>
            <motion.span
              className="inline-block w-2 h-4 bg-[#7C3AED] ml-1"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>

          {/* Boot sequence */}
          <AnimatePresence>
            {isInView && !bootComplete && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-8"
              >
                <BootSequence onComplete={() => setBootComplete(true)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contact form - Terminal style with holographic inputs */}
          <AnimatePresence>
            {bootComplete && (
              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative space-y-3 sm:space-y-4 md:space-y-6 mb-8 sm:mb-10 md:mb-12"
              >
                <TransmissionEffect isActive={showTransmission} />

                {/* Name field */}
                <HolographicInput
                  label="ENTER_NAME"
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  onFocus={handleFormInteraction}
                  placeholder="Your name"
                  required
                  isVisible={bootComplete}
                  delay={0}
                />

                {/* Objective field */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={bootComplete ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2"
                >
                  <label
                    htmlFor="objective"
                    className="font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base text-[#94A3B8] whitespace-nowrap"
                  >
                    {'>'} SELECT_OBJECTIVE:
                  </label>
                  <select
                    id="objective"
                    value={formData.objective}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        objective: e.target.value as ContactObjective,
                      }))
                    }
                    className="flex-1 bg-[#1F1F1F] border border-[#2A2A2A] focus:border-[#7C3AED] px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs md:text-sm 2xl:text-base text-white outline-none transition-colors cursor-pointer rounded-sm"
                  >
                    {(Object.keys(OBJECTIVE_LABELS) as ContactObjective[]).map((key) => (
                      <option key={key} value={key}>
                        {OBJECTIVE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </motion.div>

                {/* Message field */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={bootComplete ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex flex-col gap-1.5 sm:gap-2"
                >
                  <label
                    htmlFor="message"
                    className="font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base text-[#94A3B8]"
                  >
                    {'>'} MESSAGE_BODY:
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onFocus={handleFormInteraction}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, message: e.target.value }))
                    }
                    required
                    rows={3}
                    className="w-full bg-[#1F1F1F] border border-[#2A2A2A] focus:border-[#7C3AED] px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs md:text-sm 2xl:text-base text-white outline-none transition-colors resize-none rounded-sm focus:shadow-[0_0_20px_rgba(124,58,237,0.2)]"
                    placeholder="Your message..."
                  />
                </motion.div>

                {/* Submit button with energy effect */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={bootComplete ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="relative font-mono text-[10px] sm:text-xs md:text-sm 2xl:text-base tracking-wider bg-transparent hover:bg-[#1F1F1F] active:bg-[#2A2A2A] text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 border border-[#94A3B8] hover:border-[#7C3AED] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-sm overflow-hidden"
                    whileHover={{
                      boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Scanning border effect */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                    >
                      <motion.div
                        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </motion.div>
                    {isSubmitting ? '[ TRANSMITTING... ]' : '[ TRANSMIT ]'}
                  </motion.button>
                </motion.div>

                {/* Status messages with enhanced animations */}
                <AnimatePresence>
                  {submitStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="font-mono text-xs sm:text-sm text-green-500 flex items-center gap-2"
                    >
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5 }}
                      >
                        ✓
                      </motion.span>
                      {'>'} TRANSMISSION_SUCCESSFUL // MESSAGE_RECEIVED
                    </motion.div>
                  )}
                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="font-mono text-xs sm:text-sm text-red-500"
                    >
                      {'>'} ERROR: TRANSMISSION_FAILED. RETRY_RECOMMENDED.
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Social links with hover effects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={bootComplete ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 justify-center sm:justify-start"
          >
            {socialLinks.map((link, index) => (
              <motion.a
                key={link.label}
                href={link.url}
                target={link.type === 'linkedin' ? '_blank' : undefined}
                rel={link.type === 'linkedin' ? 'noopener noreferrer' : undefined}
                onClick={() => handleSocialClick(link.label, link.url)}
                className="relative font-mono text-[9px] sm:text-[10px] md:text-sm 2xl:text-base text-[#94A3B8] hover:text-[#7C3AED] transition-colors"
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              >
                <span className="relative z-10">[ {link.label} ]</span>
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-px bg-[#7C3AED]"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.a>
            ))}
          </motion.div>

          {/* Copyright with animated separator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={bootComplete ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-8 sm:mt-10 md:mt-12 pt-5 sm:pt-6 md:pt-8 border-t border-[#1F1F1F] relative"
          >
            {/* Animated line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.9 }}
            />
            <p className="font-mono text-[9px] sm:text-[10px] md:text-xs text-[#94A3B8]/60 text-center">
              {new Date().getFullYear()} // BEAU_DAWSON // BAD_LABS // ALL_SYSTEMS_OPERATIONAL
            </p>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}
