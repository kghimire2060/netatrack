"use client";

import { useId, useState } from "react";
import { localizeDigits } from "@/lib/i18n";
import { useLocale } from "../locale-provider";

/**
 * Inline-SVG chart marks. No chart library: these are a handful of simple
 * forms, and hand-rolling them keeps the bundle small and the theming honest
 * (every colour is a CSS variable, so dark mode is a token swap).
 *
 * Palette note: the categorical and diverging sets used here were validated for
 * colour-vision separation and contrast against both surfaces. The categorical
 * set carries a CVD warning in the 6–8 band, which is why every series is
 * direct-labelled — colour never carries identity alone.
 */

const fmt = (n: number, locale: "ne" | "en") => localizeDigits(n.toLocaleString("en-US"), locale);

// --------------------------- diverging sentiment ---------------------------

export function SentimentBar({
  slices,
  labels,
}: {
  slices: { key: string; label: string; count: number }[];
  labels: Record<string, string>;
}) {
  const { locale } = useLocale();
  const total = slices.reduce((s, x) => s + x.count, 0);
  const [hover, setHover] = useState<string | null>(null);
  if (total === 0) return null;

  const tone: Record<string, string> = {
    negative: "var(--dv-neg)",
    neutral: "var(--dv-mid)",
    positive: "var(--dv-pos)",
  };

  return (
    <div>
      <div className="seg-bar" role="img" aria-label={slices.map((s) => `${labels[s.key] ?? s.label} ${Math.round((s.count / total) * 100)}%`).join(", ")}>
        {slices.map((s) =>
          s.count === 0 ? null : (
            <span
              key={s.key}
              className="seg"
              style={{ width: `${(s.count / total) * 100}%`, background: tone[s.key] }}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              title={`${labels[s.key] ?? s.label}: ${fmt(s.count, locale)}`}
            />
          )
        )}
      </div>
      <ul className="legend">
        {slices.map((s) => (
          <li key={s.key} className={hover === s.key ? "on" : undefined}>
            <span className="swatch" style={{ background: tone[s.key] }} aria-hidden />
            <span className="legend-label">{labels[s.key] ?? s.label}</span>
            <span className="legend-value">
              {fmt(s.count, locale)}
              <span className="faint"> · {Math.round((s.count / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------- radial gauge -------------------------------

/** A single ratio against its limit. One hue, not a pie. */
export function Gauge({ value, max = 100, label, sub }: { value: number; max?: number; label: string; sub?: string }) {
  const { locale } = useLocale();
  const id = useId();
  const pct = max === 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const r = 52;
  const c = 2 * Math.PI * r;

  return (
    <div className="gauge">
      <svg viewBox="0 0 128 128" width="128" height="128" role="img" aria-label={`${label}: ${value} of ${max}`}>
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--dv-1)" />
            <stop offset="100%" stopColor="var(--dv-3)" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--dv-track)" strokeWidth="11" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke={`url(#g-${id})`} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dasharray .9s cubic-bezier(.2,.8,.2,1)" }}
        />
        <text x="64" y="62" textAnchor="middle" className="gauge-value">
          {localizeDigits(String(Math.round(pct * 100)), locale)}%
        </text>
        <text x="64" y="82" textAnchor="middle" className="gauge-sub">{sub ?? ""}</text>
      </svg>
      <div className="gauge-label">{label}</div>
    </div>
  );
}

// ------------------------------ horizontal bars -----------------------------

/** Magnitude comparison, one hue, sorted. Direct-labelled, no axis furniture. */
export function BarList({
  rows,
  max,
  unit,
}: {
  rows: { key: string; label: string; value: number; href?: string }[];
  max?: number;
  unit?: string;
}) {
  const { locale } = useLocale();
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bar-list">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${fmt(r.value, locale)}${unit ? " " + unit : ""}`}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(r.value / top) * 100}%` }} />
          </span>
          <span className="bar-value">
            {fmt(r.value, locale)}
            {unit ? <span className="faint"> {unit}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

// --------------------------- dimension score rows ---------------------------

export function ScoreRows({ rows }: { rows: { key: string; label: string; average: number; weight: number }[] }) {
  const { locale } = useLocale();
  return (
    <ul className="bar-list">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${r.average.toFixed(1)} / 5`}>
          <span className="bar-label">
            {r.label}
            <span className="faint"> · {localizeDigits(String(Math.round(r.weight * 100)), locale)}%</span>
          </span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(r.average / 5) * 100}%`, background: "var(--dv-3)" }} />
          </span>
          <span className="bar-value">{localizeDigits(r.average.toFixed(1), locale)}</span>
        </li>
      ))}
    </ul>
  );
}
