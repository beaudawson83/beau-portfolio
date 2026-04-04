import { experiences } from '@/lib/data';

export default function Timeline() {
  return (
    <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto">
        {/* Pure CSS accordion — hidden checkbox + peer selectors, zero JS */}
        <input type="checkbox" id="timeline-toggle" className="peer sr-only" />

        <label
          htmlFor="timeline-toggle"
          className="relative z-10 w-full flex items-center justify-between px-5 py-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:border-[#7C3AED]/30 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <span className="text-[#7C3AED] text-lg">+</span>
            <span className="text-base sm:text-lg font-semibold text-white">
              Full Career Timeline
            </span>
          </div>
          <span className="font-mono text-xs text-[#94A3B8]">
            {experiences.length} roles
          </span>
        </label>

        <div className="max-h-0 overflow-hidden peer-checked:max-h-[5000px] transition-all duration-500">
          <div className="relative pl-6 border-l border-[#2A2A2A] mt-6 pb-2">
            {experiences.map((exp) => (
              <div
                key={`${exp.company}-${exp.yearRange}`}
                className={`relative pb-6 last:pb-0 ${exp.isLegacy ? 'opacity-50' : ''}`}
              >
                <div
                  className={`absolute -left-[25px] top-1.5 w-2 h-2 rounded-full ${
                    exp.isLegacy ? 'bg-[#2A2A2A] border border-[#94A3B8]/30' : 'bg-[#7C3AED]'
                  }`}
                />

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                  <span className="font-mono text-xs text-[#94A3B8]/50">
                    {exp.yearRange}
                  </span>
                  <span className="font-semibold text-sm text-white">
                    {exp.company}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {exp.role}
                  </span>
                </div>

                {!exp.isLegacy && exp.context && (
                  <p className="text-xs text-[#94A3B8]/60 mb-1.5 max-w-2xl">
                    {exp.context}
                  </p>
                )}

                {exp.impacts.length > 0 && (
                  <ul className="space-y-0.5">
                    {exp.impacts.map((impact, i) => (
                      <li key={i} className="text-xs text-[#94A3B8] flex items-start gap-1.5">
                        <span className="text-[#7C3AED]/40 mt-px">-</span>
                        <span>{impact}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
