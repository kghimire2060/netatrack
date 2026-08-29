"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./locale-provider";
import type { TranslationKey } from "@/lib/i18n";

/**
 * Admin navigation. Links are filtered by the permissions passed in from the
 * server — hiding a link is convenience only; every route re-checks server-side.
 */
const GROUPS: { group: TranslationKey; items: { href: string; label: TranslationKey; permission: string }[] }[] = [
  {
    group: "adm.overview",
    items: [
      { href: "/admin", label: "adm.dashboard", permission: "analytics.view" },
      { href: "/admin/analytics", label: "adm.analytics", permission: "analytics.view" },
    ],
  },
  {
    group: "adm.issuesGroup",
    items: [
      { href: "/admin/complaints", label: "adm.issueQueue", permission: "complaint.view.assigned" },
    ],
  },
  {
    group: "adm.electionGroup",
    items: [
      { href: "/admin/candidates", label: "adm.candidates", permission: "candidate.edit" },
      { href: "/admin/claims", label: "adm.claims", permission: "candidate.claim.review" },
      { href: "/admin/elections", label: "adm.elections", permission: "election.manage" },
      { href: "/admin/results", label: "adm.results", permission: "result.manage" },
    ],
  },
  {
    group: "adm.contentGroup",
    items: [
      { href: "/admin/news", label: "adm.news", permission: "news.edit" },
      { href: "/admin/fact-checks", label: "adm.factChecks", permission: "factcheck.review" },
      { href: "/admin/promises", label: "adm.promises", permission: "promise.manage" },
      { href: "/admin/polls", label: "adm.polls", permission: "poll.manage" },
      { href: "/admin/ratings", label: "adm.ratings", permission: "rating.moderate" },
    ],
  },
  {
    group: "adm.adminGroup",
    items: [
      { href: "/admin/users", label: "adm.users", permission: "user.view" },
      { href: "/admin/roles", label: "adm.roles", permission: "role.manage" },
      { href: "/admin/notifications", label: "adm.notifications", permission: "settings.manage" },
      { href: "/admin/audit", label: "adm.audit", permission: "audit.view.all" },
      { href: "/admin/settings", label: "adm.settings", permission: "settings.manage" },
    ],
  },
];

export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const allowed = new Set(permissions);

  return (
    <aside className="admin-side">
      {GROUPS.map((group) => {
        const items = group.items.filter((item) => allowed.has(item.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.group} style={{ width: "100%" }}>
            <div className="group">{t(group.group)}</div>
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.href === "/admin"
                    ? pathname === "/admin"
                      ? "active"
                      : ""
                    : pathname.startsWith(item.href)
                      ? "active"
                      : ""
                }
              >
                {t(item.label)}
              </Link>
            ))}
          </div>
        );
      })}
    </aside>
  );
}
