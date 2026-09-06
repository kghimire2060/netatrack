import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n";
import { formatCount, type Locale } from "@/lib/i18n";

/**
 * Profile tab navigation.
 *
 * Server-rendered links carrying `?tab=`, not client state. Three reasons:
 * a tab is addressable, so a citizen can link someone straight to a
 * politician's project record; every tab is in the HTML a crawler sees; and it
 * works with JavaScript disabled, which matters on the connections a lot of
 * this audience is actually on.
 *
 * The count beside each label is the honest one — a tab with nothing behind it
 * still renders, greyed, rather than disappearing, because "we have no project
 * records for this person" is itself information a reader should be able to
 * find.
 */

export const PROFILE_TABS = [
  "overview",
  "promises",
  "projects",
  "parliament",
  "facts",
  "activity",
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export function isProfileTab(value: string | undefined): value is ProfileTab {
  return PROFILE_TABS.includes((value ?? "") as ProfileTab);
}

const TAB_LABEL: Record<ProfileTab, TranslationKey> = {
  overview: "cand.tabOverview",
  promises: "cand.tabPromises",
  projects: "cand.tabProjects",
  parliament: "cand.tabParliament",
  facts: "cand.tabFacts",
  activity: "cand.tabActivity",
};

export function ProfileTabs({
  slug,
  active,
  counts,
  t,
  locale,
}: {
  slug: string;
  active: ProfileTab;
  /** Records behind each tab. Overview has no count of its own. */
  counts: Record<Exclude<ProfileTab, "overview">, number>;
  t: (key: TranslationKey) => string;
  locale: Locale;
}) {
  return (
    <nav className="profile-tabs" aria-label={t("cand.tabsLabel")}>
      {PROFILE_TABS.map((tab) => {
        const count = tab === "overview" ? null : counts[tab];
        const empty = count === 0;
        return (
          <Link
            key={tab}
            href={tab === "overview" ? `/candidates/${slug}` : `/candidates/${slug}?tab=${tab}`}
            className={`profile-tab${tab === active ? " active" : ""}${empty ? " empty" : ""}`}
            aria-current={tab === active ? "page" : undefined}
          >
            {t(TAB_LABEL[tab])}
            {count !== null ? (
              <span className="profile-tab-count">{formatCount(count, locale)}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
