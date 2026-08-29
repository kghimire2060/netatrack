import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

/**
 * Brand lockup, from the supplied artwork.
 *
 * Two things drive which file is used:
 *  - locale: the artwork has separate English and Nepali wordmarks
 *    (NetaTrack / नेता ट्र्याक), not a translated caption, so the whole
 *    lockup swaps.
 *  - theme: the wordmark is deep navy and disappears on a dark surface. The
 *    -dark variants lighten only the wordmark; the icon keeps its flag
 *    colours. Both are rendered and CSS shows one, because the theme is a
 *    client-side attribute and the server cannot know it at render time.
 */
const LOCKUP: Record<Locale, { light: string; dark: string; width: number }> = {
  en: { light: "/logo-en.png", dark: "/logo-en-dark.png", width: 734 },
  ne: { light: "/logo-ne.png", dark: "/logo-ne-dark.png", width: 745 },
};
const LOCKUP_HEIGHT = 240;

export function Brand({
  locale,
  href = "/",
  height = 40,
}: {
  locale: Locale;
  href?: string;
  height?: number;
}) {
  const art = LOCKUP[locale];
  const width = Math.round((art.width / LOCKUP_HEIGHT) * height);

  return (
    <Link href={href} className="brand" aria-label="NetaTrack">
      <Image
        src={art.light}
        alt="NetaTrack"
        width={width}
        height={height}
        className="brand-logo brand-logo-light"
        priority
      />
      <Image
        src={art.dark}
        alt=""
        aria-hidden
        width={width}
        height={height}
        className="brand-logo brand-logo-dark"
      />
    </Link>
  );
}

/** Icon only — for tight spaces and as the app icon. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      aria-hidden
      width={size}
      height={Math.round(size * (512 / 343))}
      className="brand-mark"
    />
  );
}
