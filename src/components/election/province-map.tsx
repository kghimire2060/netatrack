"use client";

import Link from "next/link";
import { useState } from "react";
import { localizeDigits } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

type Tile = {
  slug: string;
  nameEn: string;
  nameNe: string;
  number: number;
  seats: number;
  candidates: number;
  voters: number | null;
  declared: number;
};

/**
 * Provincial seat cartogram.
 *
 * Deliberately not a geographic map. Accurate Nepal boundary data is not in
 * this project, and drawing an approximation of a country's borders on a
 * political platform asserts something we cannot source — a wrong border is a
 * political claim, not a rendering bug. Tiles run in real west-to-east
 * provincial order so the spatial reading survives without false geography.
 *
 * Seat count is printed on every tile and encoded redundantly by the fill, so
 * the shading is never the only carrier. Selecting a province filters the
 * explorer below via a normal link, which keeps the whole state in the URL.
 */
export function ProvinceMap({
  tiles,
  activeProvince,
  labels,
}: {
  tiles: Tile[];
  activeProvince?: string | null;
  labels: {
    seats: string;
    candidates: string;
    voters: string;
    declared: string;
    viewAll: string;
    note: string;
  };
}) {
  const { locale } = useLocale();
  const [hover, setHover] = useState<string | null>(null);
  const n = (v: number) => localizeDigits(v.toLocaleString("en-US"), locale);
  const max = Math.max(1, ...tiles.map((t) => t.seats));

  const shown = tiles.find((t) => t.slug === (hover ?? activeProvince)) ?? null;

  return (
    <div className="cartogram">
      <ul className="cartogram-grid">
        {tiles.map((t) => {
          const active = activeProvince === t.slug;
          // A sequential wash, one hue, light to dark by seat count.
          const wash = 0.14 + (t.seats / max) * 0.62;
          return (
            <li key={t.slug}>
              <Link
                href={active ? "?" : `?province=${t.slug}`}
                scroll={false}
                className={`cartogram-tile${active ? " is-active" : ""}`}
                style={{ "--wash": wash } as React.CSSProperties}
                onMouseEnter={() => setHover(t.slug)}
                onMouseLeave={() => setHover(null)}
                aria-label={`${locale === "ne" ? t.nameNe : t.nameEn}: ${t.seats} ${labels.seats}`}
              >
                <span className="cartogram-num" aria-hidden>
                  {localizeDigits(String(t.number), locale)}
                </span>
                <span className="cartogram-name">
                  {locale === "ne" ? t.nameNe : t.nameEn}
                </span>
                <span className="cartogram-seats">{n(t.seats)}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="cartogram-readout" aria-live="polite">
        {shown ? (
          <>
            <strong>{locale === "ne" ? shown.nameNe : shown.nameEn}</strong>
            <span>
              {labels.seats}: <b>{n(shown.seats)}</b>
            </span>
            <span>
              {labels.candidates}: <b>{n(shown.candidates)}</b>
            </span>
            <span>
              {labels.declared}: <b>{n(shown.declared)}</b>
            </span>
            {shown.voters !== null ? (
              <span>
                {labels.voters}: <b>{n(shown.voters)}</b>
              </span>
            ) : null}
          </>
        ) : (
          <span className="faint">{labels.note}</span>
        )}
        {activeProvince ? (
          <Link href="?" scroll={false} className="cartogram-clear">
            {labels.viewAll}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
