import Link from "next/link";
import type { ProvinceNode } from "@/lib/constituencies";
import { formatCount, type Locale, type Translator } from "@/lib/i18n";

/**
 * Province → District → Constituency navigation.
 *
 * Rendered from the grouped query in lib/constituencies.ts rather than a
 * hardcoded map, so a district appears here the moment rows exist for it and
 * disappears when they do not. Each district links into the existing filtered
 * index, which keeps one list implementation instead of a second one per
 * district.
 *
 * Uses <details> so the whole tree works before hydration and without
 * JavaScript — 77 districts is too many to show expanded, and a click-to-open
 * list should not depend on a bundle.
 */
export function GeographyNav({
  t,
  locale,
  provinces,
  activeProvince,
}: {
  t: Translator;
  locale: Locale;
  provinces: ProvinceNode[];
  activeProvince?: string | null;
}) {
  if (provinces.length === 0) return null;

  return (
    <div className="geo-nav">
      {provinces.map((p) => {
        const open = activeProvince
          ? p.province.slug === activeProvince.toLowerCase()
          : false;
        return (
          <details key={p.province.slug} className="geo-province" open={open}>
            <summary>
              <span className="geo-num" aria-hidden>
                {formatCount(p.province.number, locale)}
              </span>
              <span className="geo-name">
                {locale === "ne" ? p.province.nameNe : p.province.nameEn}
              </span>
              <span className="geo-counts">
                {p.counts.federal > 0 ? (
                  <span title={t("con.federalSeats")}>
                    {t("con.federalSeats")} {formatCount(p.counts.federal, locale)}
                  </span>
                ) : null}
                {p.counts.provincial > 0 ? (
                  <span title={t("con.provincialSeats")}>
                    {t("con.provincialSeats")} {formatCount(p.counts.provincial, locale)}
                  </span>
                ) : null}
                {p.counts.local > 0 ? (
                  <span title={t("con.localBodiesShort")}>
                    {t("con.localBodiesShort")} {formatCount(p.counts.local, locale)}
                  </span>
                ) : null}
              </span>
            </summary>

            <ul className="geo-districts">
              {p.districts.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/constituencies?province=${encodeURIComponent(
                      p.province.slug
                    )}&q=${encodeURIComponent(d.name)}`}
                  >
                    {d.name}
                    <span className="faint"> {formatCount(d.counts.total, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
