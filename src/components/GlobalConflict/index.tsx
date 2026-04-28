'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ConflictHotspot, ConflictPayload } from '@/lib/conflict-data';
import StatCard from './StatCard';
import NewsFeed from './NewsFeed';
import ConflictMap, { project } from './ConflictMap';
import Sparkline from './Sparkline';
import './global-conflict.css';

const NEWS_FILTERS = ['all', 'reuters', 'ap', 'bbc', 'ocha'] as const;
type NewsFilter = (typeof NEWS_FILTERS)[number];

interface GlobalConflictModuleProps {
  initialData: ConflictPayload;
}

export default function GlobalConflictModule({ initialData }: GlobalConflictModuleProps) {
  const data = initialData;
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [filter, setFilter] = useState<NewsFilter>('all');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [updateBlip, setUpdateBlip] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setUpdateBlip(true);
      setTimeout(() => setUpdateBlip(false), 1200);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const focusedHotspot = useMemo(
    () => (focused ? data.hotspots.find((h) => h.id === focused) ?? null : null),
    [focused, data.hotspots],
  );
  const hoveredHotspot = useMemo(
    () => (hovered ? data.hotspots.find((h) => h.id === hovered) ?? null : null),
    [hovered, data.hotspots],
  );

  const filteredNews = useMemo(
    () =>
      filter === 'all'
        ? data.news
        : data.news.filter((n) => n.source.toLowerCase().includes(filter)),
    [filter, data.news],
  );

  const updatedAt = new Date(data.lastUpdated);
  const secondsAgo = Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 1000));
  const updatedLabel =
    secondsAgo < 60
      ? `${secondsAgo}s ago`
      : secondsAgo < 3600
        ? `${Math.floor(secondsAgo / 60)}m ago`
        : `${Math.floor(secondsAgo / 3600)}h ${Math.floor((secondsAgo % 3600) / 60)}m ago`;

  return (
    <div className="gc-root">
      <header className="gc-header">
        <div>
          <div className="gc-kicker">
            <span
              className="gc-kicker-dot"
              style={{
                boxShadow: updateBlip ? '0 0 0 6px rgba(217,70,53,0.2)' : 'none',
              }}
            />
            Live · auto-updated by Claude routine
          </div>
          <h1 className="gc-title">Global Conflict Index</h1>
          <p className="gc-lede">
            A continuously-updated synthesis of armed conflict data and breaking
            reportage, refreshed every few minutes by an automated research agent.
          </p>
        </div>
        <div className="gc-meta">
          <div>SYNCED&nbsp;&nbsp;{updatedLabel}</div>
          <div>SOURCES&nbsp;&nbsp;ACLED · UCDP · OCHA</div>
          <div>METHOD&nbsp;&nbsp;agentic · LLM-assisted</div>
          <div className="gc-meta-source">FEED&nbsp;&nbsp;{data.source.toUpperCase()}</div>
        </div>
      </header>

      <div className="gc-stats">
        <StatCard
          label="Active armed conflicts"
          value={data.totalActive}
          sub="state-based + non-state"
          delta={data.weeklyDelta.conflicts}
          deltaLabel="vs last week"
          big
        />
        <StatCard
          label="Casualties · 7-day"
          value={data.casualties7d}
          sub="reported fatalities"
          delta={data.weeklyDelta.casualties}
          deltaLabel="vs prev. 7-day"
          big
        />
        <StatCard
          label="Forcibly displaced"
          value={data.displaced}
          sub="cumulative · global"
          delta={data.weeklyDelta.displaced}
          deltaLabel="this week"
          format={(n) => (n / 1_000_000).toFixed(1) + 'M'}
          big
        />
        <StatCard
          label="Countries involved"
          value={data.countriesInvolved}
          sub="as principal or proxy"
          big
        />
      </div>

      <section className="gc-map-section">
        <div className="gc-map-header">
          <div className="gc-fig-label">
            Fig. 01 &nbsp;/&nbsp; Geographic distribution of active hostilities
          </div>
          <div className="gc-legend">
            <span className="gc-legend-item">
              <span className="gc-legend-dot" style={{ background: 'var(--gc-accent)' }} />
              Active hotspot
            </span>
            <span className="gc-legend-item">
              <span className="gc-legend-dot" style={{ background: '#3a3a3a' }} />
              Stable
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

          {hoveredHotspot && !focusedHotspot && <HoverTooltip h={hoveredHotspot} />}
          {focusedHotspot && (
            <DetailPanel h={focusedHotspot} onClose={() => setFocused(null)} />
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
          <span>{data.hotspots.length} ZONES MAPPED</span>
        </div>
      </section>

      <section className="gc-news-section">
        <div className="gc-news-header">
          <div>
            <div className="gc-section-kicker">Wire · last 24 hours</div>
            <h2 className="gc-news-title">Breaking from the field</h2>
          </div>
          <div className="gc-news-filters">
            {NEWS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="gc-filter-btn"
                data-active={filter === f ? 'true' : undefined}
              >
                {f === 'all' ? 'All sources' : f}
              </button>
            ))}
          </div>
        </div>

        <NewsFeed items={filteredNews} density="comfortable" />

        <div className="gc-news-footer">
          <span>Headlines aggregated from public sources · agent-curated for relevance</span>
          <span>
            {filteredNews.length} of {data.news.length} items
          </span>
        </div>
      </section>

      <footer className="gc-footer">
        {[
          [
            'Methodology',
            "Conflict events sourced from ACLED & UCDP datasets and recent reportage, refreshed on a 15-minute cadence by an automated agent. Casualty figures are reported lower bounds — actual figures are typically higher.",
          ],
          [
            "About 'peace'",
            'The absence of red marks on this map is not the presence of peace. Many regions experience structural violence, repression, and political instability not captured by armed-conflict datasets.',
          ],
          [
            "Author's note",
            "This module is part of an exploration in agentic data journalism — what becomes possible when an LLM acts as a continuous, opinionated editor over public datasets and news feeds.",
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

function HoverTooltip({ h }: { h: ConflictHotspot }) {
  const [x, y] = project(h.lng, h.lat);
  const left = (x / 1200) * 100;
  const top = (y / 600) * 100;
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
        <span className="gc-tooltip-key">CASUALTIES 7D</span>
        <span className="gc-tooltip-val">{h.casualties7d.toLocaleString()}</span>
        <span className="gc-tooltip-key">INTENSITY</span>
        <span className="gc-tooltip-val">
          {'█'.repeat(h.intensity)}
          {'░'.repeat(5 - h.intensity)}
        </span>
        <span className="gc-tooltip-key">TYPE</span>
        <span className="gc-tooltip-val">{h.type}</span>
      </div>
    </div>
  );
}

function DetailPanel({ h, onClose }: { h: ConflictHotspot; onClose: () => void }) {
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
          ['Conflict type', h.type],
          ['Casualties · 7d', h.casualties7d.toLocaleString()],
          ['Intensity', `${h.intensity} / 5`],
          ['Latitude', h.lat.toFixed(2) + '°'],
          ['Longitude', h.lng.toFixed(2) + '°'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="gc-detail-k">{k}</div>
            <div className="gc-detail-v">{v}</div>
          </div>
        ))}
      </div>
      <div className="gc-detail-spark-label">Bar chart · 7d casualty trend</div>
      <Sparkline seed={h.id} />
    </div>
  );
}
