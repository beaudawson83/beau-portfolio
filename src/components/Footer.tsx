'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, FormEvent } from 'react';
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

export default function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useTrackSectionWithRef(ref, 'Footer_Contact');

  const [formData, setFormData] = useState({
    name: '',
    objective: 'full-time' as ContactObjective,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasStartedForm, setHasStartedForm] = useState(false);

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

    trackContactFormSubmit(formData.objective);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to send message');

      trackContactFormSuccess(formData.objective);
      setSubmitStatus('success');
      setFormData({ name: '', objective: 'full-time', message: '' });
      setHasStartedForm(false);
    } catch {
      trackContactFormError(formData.objective);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialClick = (label: string, url: string) => {
    trackSocialClick(label, url);
  };

  const inputClasses =
    'w-full bg-white/[0.03] border border-line focus:border-accent-bright/60 focus:shadow-[0_0_0_4px_rgb(139_92_246/0.12)] px-4 py-3 text-sm text-ink placeholder:text-faint outline-none transition-all duration-300 rounded-xl';

  return (
    <footer
      id="contact"
      className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 h-[28rem] w-[48rem] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgb(139_92_246/0.22),transparent_65%)] blur-2xl"
      />
      <div className="relative max-w-2xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.04em] text-ink mb-4 text-center">
            Get in Touch
          </h2>
          <p className="text-base sm:text-lg text-muted mb-10 text-center">
            Available for full-time, fractional, and project-based engagements.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="ui-card space-y-5 p-6 sm:p-8 mb-10 backdrop-blur-md">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink/80 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onFocus={handleFormInteraction}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Your name"
                className={inputClasses}
              />
            </div>

            {/* Objective */}
            <div>
              <label htmlFor="objective" className="block text-sm font-medium text-ink/80 mb-2">
                Objective
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
                className={`${inputClasses} cursor-pointer`}
              >
                {(Object.keys(OBJECTIVE_LABELS) as ContactObjective[]).map((key) => (
                  <option key={key} value={key}>
                    {OBJECTIVE_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-ink/80 mb-2">
                Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onFocus={handleFormInteraction}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                required
                rows={4}
                placeholder="What can I help with?"
                className={`${inputClasses} resize-none`}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-full bg-gradient-to-b from-accent-bright to-accent-deep px-7 py-3 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgb(139_92_246/0.8),inset_0_1px_0_rgb(255_255_255/0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_rgb(139_92_246/0.95),inset_0_1px_0_rgb(255_255_255/0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>

            {/* Status */}
            <AnimatePresence>
              {submitStatus === 'success' && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-success"
                >
                  Message sent. I&apos;ll be in touch.
                </motion.p>
              )}
              {submitStatus === 'error' && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-400"
                >
                  Something went wrong. Please try again or email me directly.
                </motion.p>
              )}
            </AnimatePresence>
          </form>

          {/* Social links */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target={link.type === 'linkedin' ? '_blank' : undefined}
                rel={link.type === 'linkedin' ? 'noopener noreferrer' : undefined}
                onClick={() => handleSocialClick(link.label, link.url)}
                className="rounded-full border border-line bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:border-accent-bright/50 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-line">
            <p className="text-xs text-faint text-center">
              {new Date().getFullYear()} Beau Dawson / BAD Labs
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
