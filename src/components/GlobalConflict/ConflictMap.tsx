'use client';

import { useEffect, useMemo, useState } from 'react';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import type { ConflictHotspot } from '@/lib/conflict-data';

const MAP_W = 1200;
const MAP_H = 600;

export function project(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return [x, y];
}

interface CountryShape {
  key: string;
  id: string | number | undefined;
  d: string | null;
}

interface ConflictMapProps {
  hotspots: ConflictHotspot[];
  hovered: string | null;
  setHovered: (id: string | null) => void;
  focused: string | null;
  setFocused: (id: string | null) => void;
  pulse?: boolean;
  showPeace?: boolean;
}

export default function ConflictMap({
  hotspots,
  hovered,
  setHovered,
  focused,
  setFocused,
  pulse = true,
  showPeace = false,
}: ConflictMapProps) {
  const [countries, setCountries] = useState<CountryShape[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/countries-110m.json')
      .then((r) => r.json() as Promise<Topology>)
      .then((topo) => {
        if (cancelled) return;
        // topojson-client's feature() returns either a single Feature or a FeatureCollection
        // depending on input geometry; for "countries" object it returns a FeatureCollection.
        const fc = feature(
          topo,
          topo.objects.countries,
        ) as FeatureCollection<Geometry, { name?: string }>;
        const projection = geoEquirectangular()
          .scale(MAP_W / (2 * Math.PI))
          .translate([MAP_W / 2, MAP_H / 2]);
        const pathGen = geoPath(projection);
        const shapes: CountryShape[] = fc.features.map(
          (f: Feature<Geometry, { name?: string }>, i: number) => ({
            key: f.id != null ? `c-${f.id}` : `c-idx-${i}`,
            id: f.id ?? undefined,
            d: pathGen(f) ?? null,
          }),
        );
        setCountries(shapes);
      })
      .catch((err) => {
        console.error('Failed to load topojson:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const countryIntensity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of hotspots) {
      for (const code of h.iso || []) {
        const k = String(parseInt(code, 10));
        map[k] = Math.max(map[k] || 0, h.intensity);
      }
    }
    return map;
  }, [hotspots]);

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="gc-heatGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--gc-accent)" stopOpacity="0.5" />
          <stop offset="40%" stopColor="var(--gc-accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--gc-accent)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gc-peaceGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#22c55e" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
      </defs>

      {showPeace && (
        <g style={{ mixBlendMode: 'screen' }}>
          {[
            [180, 130, 170],
            [220, 350, 130],
            [950, 230, 160],
            [800, 140, 150],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="url(#gc-peaceGrad)" />
          ))}
        </g>
      )}

      <g>
        {countries
          ? countries.map((c) => {
              if (!c.d) return null;
              const k = c.id != null ? String(parseInt(String(c.id), 10)) : '';
              const intensity = countryIntensity[k];
              const fill = intensity ? 'var(--gc-accent)' : '#1a1a1a';
              const opacity = intensity ? 0.18 + intensity * 0.13 : 1;
              return (
                <path
                  key={c.key}
                  d={c.d}
                  fill={fill}
                  opacity={opacity}
                  stroke="#0a0a0a"
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })
          : (
            <text
              x={MAP_W / 2}
              y={MAP_H / 2}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              fill="#52525b"
            >
              loading geography…
            </text>
          )}
      </g>

      <g style={{ mixBlendMode: 'screen' }}>
        {hotspots.map((h) => {
          const [x, y] = project(h.lng, h.lat);
          const r = 28 + h.intensity * 12;
          return <circle key={h.id} cx={x} cy={y} r={r} fill="url(#gc-heatGrad)" />;
        })}
      </g>

      <g>
        {hotspots.map((h) => {
          const [x, y] = project(h.lng, h.lat);
          const isHovered = hovered === h.id;
          const isFocused = focused === h.id;
          const baseR = 2.2 + h.intensity * 0.85;
          return (
            <g
              key={h.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(h.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setFocused(focused === h.id ? null : h.id)}
            >
              {pulse && h.intensity >= 4 && (
                <circle cx={x} cy={y} r={baseR} fill="var(--gc-accent)">
                  <animate
                    attributeName="r"
                    from={baseR}
                    to={baseR + 16}
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.6"
                    to="0"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <circle cx={x} cy={y} r={baseR + 2} fill="var(--gc-accent)" opacity={0.35} />
              <circle
                cx={x}
                cy={y}
                r={isHovered || isFocused ? baseR + 1.5 : baseR}
                fill="var(--gc-accent)"
                stroke="#0a0a0a"
                strokeWidth="0.7"
              />
              <circle cx={x} cy={y} r={14} fill="transparent" />
            </g>
          );
        })}
      </g>

      {focused && (() => {
        const h = hotspots.find((x) => x.id === focused);
        if (!h) return null;
        const [x, y] = project(h.lng, h.lat);
        return (
          <g pointerEvents="none">
            <line x1={x - 22} y1={y} x2={x - 8} y2={y} stroke="var(--gc-accent)" strokeWidth="0.8" />
            <line x1={x + 8} y1={y} x2={x + 22} y2={y} stroke="var(--gc-accent)" strokeWidth="0.8" />
            <line x1={x} y1={y - 22} x2={x} y2={y - 8} stroke="var(--gc-accent)" strokeWidth="0.8" />
            <line x1={x} y1={y + 8} x2={x} y2={y + 22} stroke="var(--gc-accent)" strokeWidth="0.8" />
          </g>
        );
      })()}
    </svg>
  );
}
