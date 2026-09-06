import type { MediaKind, VerificationTier } from "@prisma/client";
import { MediaKindBadge } from "@/components/status";
import { VerifiedBadge } from "@/components/dashboard/trust";
import type { Locale, Translator } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

/**
 * Photographic evidence of projects and activity.
 *
 * Two rules, both about not letting a picture make a claim the record does
 * not support.
 *
 *  1. **Never caption a photo with its upload date.** `capturedAt` and
 *     `createdAt` are separate columns for this reason: a photo uploaded today
 *     may show work finished three years ago. With no capture date, the date
 *     line is omitted rather than filled in.
 *  2. **Always show the credit and the tier.** An uncredited or unverified
 *     photograph is still worth publishing, but it is labelled as such — a
 *     reader can then weigh it, which is not possible if every image looks
 *     equally authoritative.
 *
 * Plain `<img>` rather than `next/image`: these URLs are editorial data and
 * point at arbitrary hosts, which `next/image` would need enumerated in
 * `remotePatterns` ahead of time. The CSP already allows `img-src https:`.
 */

export type MediaRow = {
  id: string;
  kind: MediaKind;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  captionNe: string | null;
  altText: string | null;
  capturedAt: Date | null;
  credit: string | null;
  sourceUrl: string | null;
  tier: VerificationTier;
};

function captionFor(item: MediaRow, locale: Locale) {
  return locale === "ne" && item.captionNe ? item.captionNe : item.caption;
}

/** Full gallery, used on the activity tab. */
export function MediaGallery({
  t,
  locale,
  media,
}: {
  t: Translator;
  locale: Locale;
  media: MediaRow[];
}) {
  return (
    <ul className="media-gallery">
      {media.map((item) => {
        const caption = captionFor(item, locale);
        return (
          <li key={item.id} className="media-card">
            <div className="media-frame">
              <img
                src={item.thumbnailUrl ?? item.imageUrl}
                // An empty alt would hide evidence from a screen reader. Where
                // no alt text was written, fall back to the caption rather
                // than presenting the image as decorative.
                alt={item.altText ?? caption ?? t("cand.mediaNoAlt")}
                loading="lazy"
              />
              <span className="media-kind">
                <MediaKindBadge kind={item.kind} />
              </span>
            </div>
            <div className="media-body">
              {caption ? <p className="media-caption">{caption}</p> : null}
              <div className="media-meta small faint">
                {/* Omitted entirely when unknown — never the upload date. */}
                {item.capturedAt ? <span>{formatDate(item.capturedAt)}</span> : null}
                <span>
                  {item.credit ? (
                    `© ${item.credit}`
                  ) : (
                    <span className="withheld">{t("cand.mediaNoCredit")}</span>
                  )}
                </span>
                <VerifiedBadge tier={item.tier} t={t} />
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                    {t("common.source")}
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact strip shown inside a project card. */
export function ProjectMediaStrip({
  t,
  locale,
  media,
}: {
  t: Translator;
  locale: Locale;
  media: MediaRow[];
}) {
  return (
    <div className="media-strip">
      {media.map((item) => {
        const caption = captionFor(item, locale);
        return (
          <figure key={item.id} className="media-thumb">
            <img
              src={item.thumbnailUrl ?? item.imageUrl}
              alt={item.altText ?? caption ?? t("cand.mediaNoAlt")}
              loading="lazy"
            />
            <figcaption className="small faint">
              {item.capturedAt ? formatDate(item.capturedAt) : t("cand.mediaUndated")}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
