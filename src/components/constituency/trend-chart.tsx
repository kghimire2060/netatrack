"use client";

import { useId, useState } from "react";
import { localizeDigits } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

/**
 * Winning vote share and turnout across recorded elections.
 *
 * One y-axis on purpose: both series are percentages, so they share a scale
 * honestly. A second axis would let two unrelated ranges be drawn as if they
 * were comparable, which is the classic way a trend chart misleads.
 *
 * Points are plotted only where the figure was published. A gap in turnout
 * breaks the line rather than interpolating across it, because a straight
 * segment over a missing year asserts a value nobody recorded.
 */
type Point = {
  label: string;
  winnerShare: number | null;
  turnout: number | null;
  party: string | null;
};

const SERIES = [
  { key: "winnerShare" as const, colour: "var(--dv-1)", labelKey: "winner" },
  { key: "turnout" as const, colour: "var(--dv-3)", labelKey: "turnout" },
];

export function TrendChart({
  points,
  labels,
}: {
  points: Point[];
  labels: { winner: string; turnout: string; noTrend: string };
}) {
  const { locale } = useLocale();
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);

  // A trend needs at least two points to be a trend.
  if (points.length < 2) return <p className="small muted">{labels.noTrend}</p>;

  const W = 640;
  const H = 220;
  const padL = 38;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const x = (i: number) => padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;

  /** Contiguous runs of recorded values, so gaps stay gaps. */
  const runs = (key: "winnerShare" | "turnout") => {
    const out: { i: number; v: number }[][] = [];
    let cur: { i: number; v: number }[] = [];
    points.forEach((p, i) => {
      const v = p[key];
      if (v === null || v === undefined) {
        if (cur.length) out.push(cur);
        cur = [];
      } else cur.push({ i, v });
    });
    if (cur.length) out.push(cur);
    return out;
  };

  const active = hover === null ? null : points[hover];

  return (
    <div className="trend">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="trend-svg"
        role="img"
        aria-label={points
          .map(
            (p) =>
              `${p.label}: ${labels.winner} ${p.winnerShare ?? "—"}%, ${labels.turnout} ${p.turnout ?? "—"}%`
          )
          .join("; ")}
      >
        {/* recessive grid */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="trend-grid" />
            <text x={padL - 7} y={y(v) + 3.5} className="trend-axis" textAnchor="end">
              {localizeDigits(String(v), locale)}
            </text>
          </g>
        ))}

        {SERIES.map((s) =>
          runs(s.key).map((run, ri) => (
            <polyline
              key={`${s.key}-${ri}`}
              className="trend-line"
              stroke={s.colour}
              points={run.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
            />
          ))
        )}

        {SERIES.map((s) =>
          points.map((p, i) => {
            const v = p[s.key];
            return v === null || v === undefined ? null : (
              <circle
                key={`${s.key}-${i}`}
                cx={x(i)}
                cy={y(v)}
                r={hover === i ? 6 : 4.5}
                fill={s.colour}
                className="trend-dot"
              />
            );
          })
        )}

        {/* generous hit targets, wider than the marks */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={x(i) - plotW / (points.length * 2 || 1)}
            y={padT}
            width={plotW / (points.length || 1)}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {hover !== null ? (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padT}
            y2={padT + plotH}
            className="trend-crosshair"
          />
        ) : null}

        {points.map((p, i) => (
          <text key={`lab-${i}`} x={x(i)} y={H - 9} className="trend-axis" textAnchor="middle">
            {localizeDigits(p.label, locale)}
          </text>
        ))}
      </svg>

      <div className="trend-foot">
        <ul className="legend" aria-hidden={false}>
          {SERIES.map((s) => (
            <li key={s.key}>
              <span className="swatch" style={{ background: s.colour }} aria-hidden />
              <span className="legend-label">{labels[s.labelKey as "winner" | "turnout"]}</span>
            </li>
          ))}
        </ul>
        {active ? (
          <div className="trend-readout" key={`${id}-${hover}`}>
            <strong>{localizeDigits(active.label, locale)}</strong>
            {active.party ? <span className="faint"> · {active.party}</span> : null}
            <span>
              {labels.winner}:{" "}
              {active.winnerShare === null
                ? "—"
                : `${localizeDigits(active.winnerShare.toFixed(1), locale)}%`}
            </span>
            <span>
              {labels.turnout}:{" "}
              {active.turnout === null
                ? "—"
                : `${localizeDigits(active.turnout.toFixed(1), locale)}%`}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
