'use client';

import { useMemo, useState } from 'react';
import type { ConflictActor, ConflictHotspot, ConflictPayload } from '@/lib/conflict-data';
import StatCard from './StatCard';
import ConflictMap, { project } from './ConflictMap';
import ConflictTimeline from './ConflictTimeline';
import Sparkline from './Sparkline';
import './global-conflict.css';

// UN member states + observers; rough denominator for "% of nations in active conflict".
const TOTAL_NATIONS = 195;

// Intl.DisplayNames accepts ISO 3166-1 alpha-2 OR UN M.49 numeric codes (which
// match ISO 3166-1 numeric for individual countries). Routine writes numeric.
const COUNTRY_DISPLAY = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

function isPlausibleIso(s: string): boolean {
  if (typeof s !== 'string') return false;
  const t = s.trim().toUpperCase();
  return /^\d{3}$/.test(t) || /^[A-Z]{2,3}$/.test(t);
}

/** Resolve an ISO code to a human-readable country name. Falls back to the raw
 * code if the API isn't available or the value is unrecognized. */
function formatCountry(iso: string): string {
  if (!iso) return '';
  if (!COUNTRY_DISPLAY) return iso;
  try {
    return COUNTRY_DISPLAY.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

interface GlobalConflictModuleProps {
  initialData: ConflictPayload;
}

export default function GlobalConflictModule({ initialData }: GlobalConflictModuleProps) {
  const data = initialData;
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const focusedHotspot = useMemo(
    () => (focused ? data.hotspots.find((h) => h.id === focused) ?? null : null),
    [focused, data.hotspots],
  );
  const hoveredHotspot = useMemo(
    () => (hovered ? data.hotspots.find((h) => h.id === hovered) ?? null : null),
    [hovered, data.hotspots],
  );

  const nationsAtWarPct = Math.min(
    100,
    Math.round((data.countriesInvolved / TOTAL_NATIONS) * 1000) / 10,
  );

  return (
    <div className="gc-root">
      <header className="gc-header">
        <h1 className="gc-title">Global Conflict Audit</h1>
        <p className="gc-lede">
          An up-to-date synthesis of armed conflict data and breaking reportage,
          refreshed daily by Anthropic&rsquo;s Claude AI.
        </p>
      </header>

      <div className="gc-stats">
        <StatCard
          label="Active armed conflicts"
          value={data.totalActive}
          sub="documented active armed conflicts between nation-states"
          delta={data.weeklyDelta.conflicts}
          deltaLabel="vs last week"
          big
        />
        <StatCard
          label="Casualties"
          value={data.casualties7d}
          sub="documented fatalities in armed-conflict regions over the last 7 days"
          delta={data.weeklyDelta.casualties}
          deltaLabel="vs prev. 7-day"
          big
        />
        <StatCard
          label="Forcibly displaced"
          value={data.weeklyDelta.displaced}
          sub="documented displaced people from armed-conflict regions over the last 7 days"
          format={(n) => (n / 1_000_000).toFixed(1) + 'M'}
          big
        />
        <StatCard
          label="Countries involved in active conflict"
          value={data.countriesInvolved}
          sub="countries documented to have been directly involved or provided material assistance or direction toward the conflict"
          big
        />
      </div>

      <section className="gc-map-section">
        <div className="gc-map-header">
          <div className="gc-fig-label">Active conflict world map</div>
          <div className="gc-legend">
            <span className="gc-legend-item">
              <span className="gc-legend-dot" style={{ background: 'var(--gc-accent)' }} />
              Active hotspot
            </span>
            <span className="gc-legend-item">
              <span className="gc-legend-dot" style={{ background: '#3a3a3a' }} />
              No documented hotspot
            </span>
          </div>
        </div>

        <div className="gc-map-wrap">
          <ConflictMap
            hotspots={data.hotspots}
            hovered={hovered}
            setHovered={setHovered}
            focused={focused}
            setFocused={setFocused}
          />

          {hoveredHotspot && !focusedHotspot && (
            <HoverTooltip h={hoveredHotspot} actors={data.actors} />
          )}
          {focusedHotspot && (
            <DetailPanel
              h={focusedHotspot}
              actors={data.actors}
              onClose={() => setFocused(null)}
            />
          )}
        </div>

        <div className="gc-intensity-row">
          <span>Intensity</span>
          <div className="gc-intensity-bars">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="gc-intensity-bar"
                style={{ opacity: 0.15 + i * 0.17 }}
              />
            ))}
          </div>
          <span>Low → Severe</span>
          <span style={{ flex: 1 }} />
          <span>{nationsAtWarPct}% of nations in active conflict</span>
        </div>
      </section>

      <ConflictTimeline
        initialNews={data.news}
        selectedHotspot={focusedHotspot}
        onClearSelection={() => setFocused(null)}
      />

      <footer className="gc-footer">
        {[
          [
            'Methodology',
            'Conflict events sourced from ACLED & UCDP datasets and recent reportage from reputable wire sources. Data is refreshed on a daily cadence by Anthropic’s Claude AI. Casualty figures are reported based on lower bounds — actual figures are typically higher.',
          ],
          [
            "About 'peace'",
            'The absence of red marks on this map is not an indication of the presence of peace. Many regions experience structural violence, repression, and political instability not captured by armed-conflict datasets.',
          ],
          [
            "Author's note",
            'This page is part of an exploration in agentic data journalism — what becomes possible when an LLM acts as a continuous, opinionated editor over public datasets and news feeds. Your feedback is invaluable in helping me develop and grow this program.',
          ],
        ].map(([title, body]) => (
          <div key={title}>
            <div className="gc-footer-title">{title}</div>
            <p className="gc-footer-body">{body}</p>
          </div>
        ))}
      </footer>
    </div>
  );
}

/** Distinct countries from conflict_actors that aren't already in the hotspot's
 * primary territory list — i.e., "other involved countries". Junk strings (URLs,
 * names, anything that doesn't shape like an ISO code) are dropped so the count
 * can't be inflated by malformed Routine output. */
function otherInvolvedCountries(h: ConflictHotspot, actors: ConflictActor[]): string[] {
  const territory = new Set(h.iso);
  const seen = new Set<string>();
  for (const a of actors) {
    if (a.conflictId !== h.id) continue;
    if (!isPlausibleIso(a.countryIso)) continue;
    if (territory.has(a.countryIso)) continue;
    if (seen.has(a.countryIso)) continue;
    seen.add(a.countryIso);
  }
  return Array.from(seen);
}

function HoverTooltip({
  h,
  actors,
}: {
  h: ConflictHotspot;
  actors: ConflictActor[];
}) {
  const [x, y] = project(h.lng, h.lat);
  const left = (x / 1200) * 100;
  const top = (y / 600) * 100;
  const others = otherInvolvedCountries(h, actors);
  return (
    <div
      className="gc-tooltip"
      style={{
        left: `${left}%`,
        top: `${top}%`,
      }}
    >
      <div className="gc-tooltip-kicker">Active · since {h.since}</div>
      <div className="gc-tooltip-name">{h.name}</div>
      <div className="gc-tooltip-grid">
        <span className="gc-tooltip-key">CASUALTIES (7-DAY TOTAL)</span>
        <span className="gc-tooltip-val">{h.casualties7d.toLocaleString()}</span>
        <span className="gc-tooltip-key">INTENSITY</span>
        <span className="gc-tooltip-val">
          {'█'.repeat(h.intensity)}
          {'░'.repeat(5 - h.intensity)}
        </span>
        <span className="gc-tooltip-key">DISPLACED (7-DAY TOTAL)</span>
        <span className="gc-tooltip-val">
          {h.displaced7d > 0 ? h.displaced7d.toLocaleString() : '—'}
        </span>
        <span className="gc-tooltip-key">OTHER INVOLVED</span>
        <span className="gc-tooltip-val">
          {others.length > 0
            ? `${others.length} ${others.length === 1 ? 'country' : 'countries'}`
            : '—'}
        </span>
      </div>
    </div>
  );
}

function DetailPanel({
  h,
  actors,
  onClose,
}: {
  h: ConflictHotspot;
  actors: ConflictActor[];
  onClose: () => void;
}) {
  const others = otherInvolvedCountries(h, actors);
  return (
    <div className="gc-detail">
      <div className="gc-detail-head">
        <div className="gc-detail-kicker">Hotspot detail</div>
        <button onClick={onClose} className="gc-detail-close">
          ✕ close
        </button>
      </div>
      <div className="gc-detail-name">{h.name}</div>

      <div className="gc-detail-grid">
        {[
          ['Active since', h.since],
          ['Casualties (7-Day total)', h.casualties7d.toLocaleString()],
          [
            'Displaced (7-Day total)',
            h.displaced7d > 0 ? h.displaced7d.toLocaleString() : '—',
          ],
          ['Intensity', `${h.intensity} / 5`],
          [
            'Other involved countries',
            others.length > 0 ? others.map(formatCountry).join(' · ') : '—',
          ],
          ['Conflict type', h.type],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="gc-detail-k">{k}</div>
            <div className="gc-detail-v">{v}</div>
          </div>
        ))}
      </div>

      <div className="gc-detail-section">
        <div className="gc-detail-section-title">Summary</div>
        <p className="gc-detail-section-body">
          {h.summary || (
            <span className="gc-detail-empty">Not yet documented.</span>
          )}
        </p>
      </div>

      <div className="gc-detail-section">
        <div className="gc-detail-section-title">Resolution outlook</div>
        <p className="gc-detail-section-body">
          {h.resolutionOutlook || (
            <span className="gc-detail-empty">
              There is no expected resolution documented at this time.
            </span>
          )}
        </p>
      </div>

      <div className="gc-detail-spark-label">Bar chart · 7d casualty trend</div>
      <Sparkline seed={h.id} />
      <button
        type="button"
        className="gc-detail-cta"
        onClick={() => {
          if (typeof document !== 'undefined') {
            const el = document.querySelector('.gc-news-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      >
        View full timeline ↓
      </button>
    </div>
  );
}
