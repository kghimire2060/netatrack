"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Main navigation (section 3). Collapses to a menu on phones. */
const LINKS = [
  { href: "/candidates", label: "Candidates" },
  { href: "/constituencies", label: "Constituencies" },
  { href: "/elections", label: "Elections" },
  { href: "/results", label: "Results" },
  { href: "/news", label: "News" },
  { href: "/opinion", label: "Public Opinion" },
  { href: "/calendar", label: "Calendar" },
  { href: "/track", label: "Track an Issue" },
  { href: "/analytics", label: "Analytics" },
  { href: "/about", label: "About" },
];

export type NavUser = { fullName: string; role: string; unread: number } | null;

export function SiteNav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    if (typeof query === "string" && query.trim().length > 1) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isStaff = user && ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(user.role);

  return (
    <nav className={`nav${open ? " open" : ""}`} aria-label="Main">
      <div className="nav-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          Neta<span>Track</span>
          <small>Know. Vote. Track.</small>
        </Link>

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
        >
          ☰
        </button>

        <div className="nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={
                pathname.startsWith(link.href)
                  ? { background: "rgba(255,255,255,.14)", color: "#fff" }
                  : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <form onSubmit={search} className="nav-search" role="search">
            <input
              name="q"
              type="search"
              aria-label="Search NetaTrack"
              placeholder="Search…"
              autoComplete="off"
            />
          </form>
          <Link href="/report" className="btn btn-sm" onClick={() => setOpen(false)}>
            Report an Issue
          </Link>
          {user ? (
            <>
              <Link
                href="/account/notifications"
                className="nav-bell"
                aria-label={
                  user.unread > 0
                    ? `Notifications, ${user.unread} unread`
                    : "Notifications"
                }
                onClick={() => setOpen(false)}
              >
                <span aria-hidden>&#9788;</span>
                {user.unread > 0 ? (
                  <span className="nav-bell-count">{user.unread > 9 ? "9+" : user.unread}</span>
                ) : null}
              </Link>
              {isStaff ? (
                <Link href="/admin" className="btn btn-sm btn-ghost" style={{ background: "#fff" }}>
                  Admin
                </Link>
              ) : null}
              <Link
                href="/account"
                className="btn btn-sm btn-ghost"
                style={{ background: "#fff" }}
                onClick={() => setOpen(false)}
              >
                {user.fullName.split(" ")[0]}
              </Link>
              <button className="btn btn-sm btn-quiet" style={{ color: "#cfdcf1" }} onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm btn-ghost" style={{ background: "#fff" }}>
                Log in
              </Link>
              <Link href="/register" className="btn btn-sm btn-navy" style={{ border: "1px solid rgba(255,255,255,.3)" }}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
