"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Admin navigation. Links are filtered by the permissions passed in from the
 * server — hiding a link is convenience only; every route re-checks server-side.
 */
const GROUPS: { group: string; items: { href: string; label: string; permission: string }[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", permission: "analytics.view" },
      { href: "/admin/analytics", label: "Analytics", permission: "analytics.view" },
    ],
  },
  {
    group: "Citizen issues",
    items: [
      { href: "/admin/complaints", label: "Issue queue", permission: "complaint.view.assigned" },
    ],
  },
  {
    group: "Election data",
    items: [
      { href: "/admin/candidates", label: "Candidates", permission: "candidate.edit" },
      { href: "/admin/claims", label: "Profile claims", permission: "candidate.claim.review" },
      { href: "/admin/elections", label: "Elections", permission: "election.manage" },
      { href: "/admin/results", label: "Results", permission: "result.manage" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/news", label: "News", permission: "news.edit" },
      { href: "/admin/fact-checks", label: "Fact checks", permission: "factcheck.review" },
      { href: "/admin/promises", label: "Promises", permission: "promise.manage" },
      { href: "/admin/polls", label: "Polls", permission: "poll.manage" },
      { href: "/admin/ratings", label: "Rating moderation", permission: "rating.moderate" },
    ],
  },
  {
    group: "Administration",
    items: [
      { href: "/admin/users", label: "Users", permission: "user.view" },
      { href: "/admin/roles", label: "Roles & permissions", permission: "role.manage" },
      { href: "/admin/notifications", label: "Email & notifications", permission: "settings.manage" },
      { href: "/admin/audit", label: "Audit log", permission: "audit.view.all" },
      { href: "/admin/settings", label: "System settings", permission: "settings.manage" },
    ],
  },
];

export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const allowed = new Set(permissions);

  return (
    <aside className="admin-side">
      {GROUPS.map((group) => {
        const items = group.items.filter((item) => allowed.has(item.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.group} style={{ width: "100%" }}>
            <div className="group">{group.group}</div>
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
                {item.label}
              </Link>
            ))}
          </div>
        );
      })}
    </aside>
  );
}
