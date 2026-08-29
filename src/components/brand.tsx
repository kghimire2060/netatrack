import Link from "next/link";
import type { Translator } from "@/lib/i18n";

/**
 * Brand lockup: Nepal flag mark + wordmark + tagline.
 *
 * PLACEHOLDER — the supplied logo file has not landed yet. This is a faithful
 * stand-in built from the design (double-pennon flag, crimson field, blue
 * border, sun and moon) so layout and spacing are final. To swap in the real
 * asset, drop it at `public/logo.svg` and replace `<FlagMark />` with an
 * `<Image src="/logo.svg" .../>`; nothing else needs to change.
 */
export function FlagMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 40 48"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <path
        d="M3 2h27L16.5 17.5H30L3 46V2Z"
        fill="#DC143C"
        stroke="#003893"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* moon in the upper pennon */}
      <path d="M12 9.6a4 4 0 1 0 3.4 6.1 4.7 4.7 0 0 1-3.4-6.1Z" fill="#fff" />
      {/* sun in the lower pennon */}
      <circle cx="11.5" cy="30" r="3.6" fill="#fff" />
      <path
        d="M11.5 24.4v1.5M11.5 34.1v1.5M5.9 30h1.5M15.6 30h1.5M7.5 26l1.1 1.1M14.4 32.9l1.1 1.1M15.5 26l-1.1 1.1M8.6 32.9 7.5 34"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Brand({ t, href = "/" }: { t: Translator; href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="NetaTrack">
      <FlagMark />
      <span className="brand-text">
        <span className="brand-name">
          Neta<em>Track</em>
        </span>
        <span className="brand-tag">{t("brand.tagline")}</span>
      </span>
    </Link>
  );
}
