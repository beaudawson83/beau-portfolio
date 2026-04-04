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
    'w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#7C3AED] px-4 py-2.5 text-sm text-white outline-none transition-colors rounded-lg';

  return (
    <footer
      id="contact"
      className="py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 border-t border-[#1F1F1F]"
    >
      <div className="max-w-2xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Get in Touch
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] mb-8">
            Available for full-time, fractional, and project-based engagements.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-10">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-xs text-[#94A3B8] mb-1.5">
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
              <label htmlFor="objective" className="block text-xs text-[#94A3B8] mb-1.5">
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
              <label htmlFor="message" className="block text-xs text-[#94A3B8] mb-1.5">
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
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2.5 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="text-sm text-[#10B981]"
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
          <div className="flex flex-wrap gap-4 mb-10">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target={link.type === 'linkedin' ? '_blank' : undefined}
                rel={link.type === 'linkedin' ? 'noopener noreferrer' : undefined}
                onClick={() => handleSocialClick(link.label, link.url)}
                className="text-sm text-[#94A3B8] hover:text-[#7C3AED] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-[#1F1F1F]">
            <p className="text-xs text-[#94A3B8]/40 text-center">
              {new Date().getFullYear()} Beau Dawson / BAD Labs
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
