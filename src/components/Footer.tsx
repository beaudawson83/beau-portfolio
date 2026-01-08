'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, FormEvent } from 'react';
import { socialLinks } from '@/lib/data';

export default function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const [formData, setFormData] = useState({
    name: '',
    objective: 'full-time' as 'full-time' | 'fractional',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Create mailto link as fallback (can be replaced with API call)
      const subject = encodeURIComponent(
        `Portfolio Contact: ${formData.objective === 'full-time' ? 'Full-Time Director' : 'Fractional Deployment'}`
      );
      const body = encodeURIComponent(
        `Name: ${formData.name}\nObjective: ${formData.objective === 'full-time' ? 'Full-Time Director' : 'Fractional Deployment'}\n\nMessage:\n${formData.message}`
      );
      window.location.href = `mailto:beau.dawson83@gmail.com?subject=${subject}&body=${body}`;

      setSubmitStatus('success');
      setFormData({ name: '', objective: 'full-time', message: '' });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer
      id="contact"
      className="py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 border-t border-[#1F1F1F]"
    >
      <div className="max-w-4xl 2xl:max-w-5xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Section header */}
          <div className="font-mono text-xs sm:text-sm 2xl:text-base text-[#7C3AED] mb-8 sm:mb-10 tracking-wider">
            {'>'} INPUT_OUTPUT // CONTACT
          </div>

          {/* Contact form - Terminal style */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mb-10 sm:mb-12">
            {/* Name field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label
                htmlFor="name"
                className="font-mono text-xs sm:text-sm 2xl:text-base text-[#94A3B8] whitespace-nowrap"
              >
                {'>'} ENTER_NAME:
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                className="flex-1 bg-[#1F1F1F] border border-[#1F1F1F] focus:border-[#7C3AED] px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm 2xl:text-base text-white outline-none transition-colors"
                placeholder="Your name"
              />
            </div>

            {/* Objective field */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label
                htmlFor="objective"
                className="font-mono text-xs sm:text-sm 2xl:text-base text-[#94A3B8] whitespace-nowrap"
              >
                {'>'} SELECT_OBJECTIVE:
              </label>
              <select
                id="objective"
                value={formData.objective}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    objective: e.target.value as 'full-time' | 'fractional',
                  }))
                }
                className="flex-1 bg-[#1F1F1F] border border-[#1F1F1F] focus:border-[#7C3AED] px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm 2xl:text-base text-white outline-none transition-colors cursor-pointer"
              >
                <option value="full-time">Full-Time Director</option>
                <option value="fractional">Fractional Deployment</option>
              </select>
            </div>

            {/* Message field */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="message"
                className="font-mono text-xs sm:text-sm 2xl:text-base text-[#94A3B8]"
              >
                {'>'} MESSAGE_BODY:
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                required
                rows={4}
                className="w-full bg-[#1F1F1F] border border-[#1F1F1F] focus:border-[#7C3AED] px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm 2xl:text-base text-white outline-none transition-colors resize-none sm:rows-5"
                placeholder="Your message..."
              />
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="font-mono text-xs sm:text-sm 2xl:text-base tracking-wider bg-transparent hover:bg-[#1F1F1F] text-white px-4 sm:px-6 py-2 sm:py-3 border border-[#94A3B8] hover:border-[#7C3AED] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? '[ TRANSMITTING... ]' : '[ TRANSMIT ]'}
              </button>
            </div>

            {/* Status messages */}
            {submitStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-sm text-green-500"
              >
                {'>'} TRANSMISSION_INITIATED
              </motion.div>
            )}
            {submitStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-sm text-red-500"
              >
                {'>'} ERROR: TRANSMISSION_FAILED. TRY_AGAIN.
              </motion.div>
            )}
          </form>

          {/* Social links */}
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center sm:justify-start">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target={link.type === 'linkedin' ? '_blank' : undefined}
                rel={link.type === 'linkedin' ? 'noopener noreferrer' : undefined}
                className="font-mono text-[10px] sm:text-sm 2xl:text-base text-[#94A3B8] hover:text-[#7C3AED] transition-colors"
              >
                [ {link.label} ]
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-[#1F1F1F]">
            <p className="font-mono text-[10px] sm:text-xs text-[#94A3B8]/60 text-center">
              {new Date().getFullYear()} // BEAU_DAWSON // BAD_LABS
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
