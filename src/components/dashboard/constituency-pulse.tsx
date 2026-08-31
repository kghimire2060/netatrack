"use client";

import Link from "next/link";
import { useState } from "react";
import { localizeDigits } from "@/lib/i18n";
import { useLocale } from "../locale-provider";
import type { ProvincePulse } from "@/lib/dashboard";

/**
 * Province explorer.
 *
 * Deliberately a cartogram, not a geographic map: accurate Nepal boundary data
 * is not in the project, and a hand-drawn approximation of a country's borders
 * on a political platform is a claim we cannot stand behind. The tiles are
 * arranged west-to-east in Nepal's real provincial order, so the spatial
 * intuition survives without asserting false geography.
 *
 * Tile area is not encoded — seat count is stated on every tile, and the
 * sequential wash encodes it redundantly.
 */
export function ConstituencyPulse({
  provinces,
  labels,
}: {
  provinces: ProvincePulse[];
  labels: {
    seats: string;
    candidates: string;
    issues: string;
    voters: string;
    explore: string;
    districts: string;
    federal: string;
    provincial: string;
    pick: string;
  };
}) {
  const { locale } = useLocale();
  const [active, setActive] = useState(provinces[0]?.province ?? "");
  const selected = provinces.find((p) => p.province === active) ?? provinces[0];
  const maxSeats = Math.max(1, ...provinces.map((p) => p.federal));
  const n = (v: number) => localizeDigits(v.toLocaleString("en-US"), locale);

  // west → east, the order these provinces actually sit in
  const ORDER = ["sudurpashchim", "karnali", "lumbini", "gandaki", "bagmati", "madhesh", "koshi"];
  const ordered = [...provinces].sort(
    (a, b) => ORDER.indexOf(a.province.toLowerCase()) - ORDER.indexOf(b.province.toLowerCase())
  );

  return (
    <div className="pulse">
      <div className="pulse-map" role="group" aria-label={labels.pick}>
        {ordered.map((p) => {
          const intensity = p.federal / maxSeats;
          const on = p.province === active;
          return (
            <button
              key={p.province}
              type="button"
              className={`pulse-tile${on ? " on" : ""}`}
              onClick={() => setActive(p.province)}
              onMouseEnter={() => setActive(p.province)}
              aria-pressed={on}
              style={{ "--wash": `${0.12 + intensity * 0.68}` } as React.CSSProperties}
            >
              <span className="pulse-name">{p.province}</span>
              <span className="pulse-seats">{n(p.federal)}</span>
              <span className="pulse-unit">{labels.seats}</span>
              {p.issues > 0 ? <span className="pulse-dot" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      {selected ? (
        <aside className="pulse-detail" aria-live="polite">
          <div className="pulse-detail-head">
            <h3>{selected.province}</h3>
            <span className="badge badge-navy">
              {n(selected.federal)} {labels.federal} · {n(selected.provincial)} {labels.provincial}
            </span>
          </div>

          <dl className="pulse-stats">
            <div>
              <dt>{labels.candidates}</dt>
              <dd>{n(selected.candidates)}</dd>
            </div>
            <div>
              <dt>{labels.voters}</dt>
              <dd>{selected.voters > 0 ? n(selected.voters) : "—"}</dd>
            </div>
            <div>
              <dt>{labels.issues}</dt>
              <dd>{n(selected.issues + selected.complaints)}</dd>
            </div>
          </dl>

          {selected.topDistricts.length > 0 ? (
            <>
              <div className="pulse-sub">{labels.districts}</div>
              <ul className="pulse-districts">
                {selected.topDistricts.map((d) => (
                  <li key={d.district}>
                    <span>{d.district}</span>
                    <span className="faint">{n(d.seats)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <Link
            className="btn btn-sm btn-ghost btn-block"
            href={`/constituencies?province=${encodeURIComponent(selected.province)}`}
          >
            {labels.explore}
          </Link>
        </aside>
      ) : null}
    </div>
  );
}
