'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function ArchitectureShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const codeLines = [
    { type: 'comment', content: '// BAD LABS // Founder & Principal Architect' },
    { type: 'comment', content: '// EST: June 2025 // LAUNCH: Jan 2026' },
    { type: 'empty', content: '' },
    {
      type: 'class',
      content: (
        <>
          <span className="syntax-keyword">class</span>{' '}
          <span className="syntax-class">BADLabsConsole</span>{' '}
          <span className="syntax-keyword">extends</span>{' '}
          <span className="syntax-class">Agentic_CRM</span> {'{'}
        </>
      ),
    },
    {
      type: 'function',
      content: (
        <>
          {'  '}
          <span className="syntax-function">constructor</span>() {'{'}
        </>
      ),
    },
    {
      type: 'property',
      content: (
        <>
          {'    '}
          <span className="syntax-keyword">this</span>.
          <span className="syntax-property">capabilities</span> = [
        </>
      ),
    },
    {
      type: 'string',
      content: (
        <>
          {'      '}
          <span className="syntax-string">&quot;Autonomous Agentic Workflows&quot;</span>,
        </>
      ),
    },
    {
      type: 'string',
      content: (
        <>
          {'      '}
          <span className="syntax-string">&quot;Automated Data Entry&quot;</span>,
        </>
      ),
    },
    {
      type: 'string',
      content: (
        <>
          {'      '}
          <span className="syntax-string">&quot;LLM Integration&quot;</span>
        </>
      ),
    },
    { type: 'bracket', content: '    ];' },
    { type: 'bracket', content: '  }' },
    { type: 'empty', content: '' },
    {
      type: 'function',
      content: (
        <>
          {'  '}
          <span className="syntax-keyword">function</span>{' '}
          <span className="syntax-function">fractionalDeployment</span>() {'{'}
        </>
      ),
    },
    {
      type: 'comment',
      content: '    // Deploying technical pods to overhaul client tooling',
    },
    {
      type: 'return',
      content: (
        <>
          {'    '}
          <span className="syntax-keyword">return</span>{' '}
          <span className="syntax-string">&quot;Operational Bottlenecks Solved&quot;</span>;
        </>
      ),
    },
    { type: 'bracket', content: '  }' },
    { type: 'bracket', content: '}' },
  ];

  return (
    <section className="py-16 sm:py-20 2xl:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-4xl 2xl:max-w-5xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Section header */}
          <div className="font-mono text-xs sm:text-sm 2xl:text-base text-[#7C3AED] mb-4 sm:mb-6 tracking-wider">
            {'>'} PROJECT: BAD_LABS_CONSOLE (v1.0)
          </div>

          {/* Code editor window */}
          <div className="bg-[#1F1F1F] rounded-lg overflow-hidden border border-[#1F1F1F] shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#171717] border-b border-[#1F1F1F]">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-4 font-mono text-xs text-[#94A3B8]">
                bad-labs-console.ts
              </span>
            </div>

            {/* Code block */}
            <div className="p-3 sm:p-4 lg:p-6 2xl:p-8 overflow-x-auto">
              <pre className="font-mono text-xs sm:text-sm 2xl:text-base leading-relaxed">
                <code>
                  {codeLines.map((line, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                      className="flex"
                    >
                      {/* Line number */}
                      <span className="w-8 text-right text-[#94A3B8]/40 select-none mr-4 flex-shrink-0">
                        {index + 1}
                      </span>
                      {/* Line content */}
                      <span
                        className={
                          line.type === 'comment' ? 'syntax-comment' : 'text-white'
                        }
                      >
                        {line.content || '\u00A0'}
                      </span>
                    </motion.div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
