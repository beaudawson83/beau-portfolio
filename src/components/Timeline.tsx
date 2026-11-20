import { experiences } from '@/lib/data';

export default function Timeline() {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto">
        {/* Section header — eyebrow / H2 / tagline pattern. */}
        <div className="mb-10 sm:mb-12">
          <p className="ui-eyebrow mb-4">
            Receipts
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink mb-3">
            Career Timeline
          </h2>
          <p className="text-base sm:text-lg text-muted">
            Every role, every year, in order.
          </p>
        </div>

        {/* Pure CSS accordion — hidden checkbox + peer selectors, zero JS */}
        <input type="checkbox" id="timeline-toggle" className="peer sr-only" />

        <label
          htmlFor="timeline-toggle"
          className="group ui-card relative z-10 w-full flex items-center justify-between px-6 py-5 hover:border-accent-bright/40 cursor-pointer select-none peer-focus-visible:border-accent-bright"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-lg leading-none text-accent-bright transition-transform duration-300 group-hover:rotate-90">+</span>
            <span className="text-base sm:text-lg font-semibold tracking-[-0.01em] text-ink">
              Full Career Timeline
            </span>
          </div>
          <span className="rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-muted tabular-nums">
            {experiences.length} roles
          </span>
        </label>

        <div className="max-h-0 overflow-hidden peer-checked:max-h-[5000px] transition-all duration-500">
          <div className="relative pl-7 border-l border-line mt-8 ml-4 pb-2">
            {experiences.map((exp) => (
              <div
                key={`${exp.company}-${exp.yearRange}`}
                className={`relative pb-8 last:pb-0 ${exp.isLegacy ? 'opacity-55' : ''}`}
              >
                <div
                  className={`absolute -left-[33px] top-1.5 w-2.5 h-2.5 rounded-full ${
                    exp.isLegacy
                      ? 'bg-surface border border-line-strong'
                      : 'bg-accent-bright shadow-[0_0_0_4px_rgb(139_92_246/0.18)]'
                  }`}
                />

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                  <span className="text-xs text-faint tabular-nums">
                    {exp.yearRange}
                  </span>
                  <span className="font-semibold text-base text-ink">
                    {exp.company}
                  </span>
                  <span className="text-sm text-accent-bright">
                    {exp.role}
                  </span>
                </div>

                {!exp.isLegacy && exp.context && (
                  <p className="text-sm text-faint mb-2 max-w-2xl">
                    {exp.context}
                  </p>
                )}

                {exp.impacts.length > 0 && (
                  <ul className="space-y-1.5">
                    {exp.impacts.map((impact, i) => (
                      <li key={i} className="text-sm text-muted flex items-start gap-2.5">
                        <span className="mt-[0.45rem] h-1 w-1 rounded-full bg-accent-bright/60 flex-shrink-0" />
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
