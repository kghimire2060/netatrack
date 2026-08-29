"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Brand } from "./brand";
import { BellIcon, MenuIcon, SearchIcon } from "./icons";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { useLocale } from "./locale-provider";
import type { TranslationKey } from "@/lib/i18n";

const LINKS: { href: string; key: TranslationKey }[] = [
  { href: "/", key: "nav.home" },
  { href: "/candidates", key: "nav.candidates" },
  { href: "/constituencies", key: "nav.constituencies" },
  { href: "/news", key: "nav.news" },
  { href: "/opinion", key: "nav.opinion" },
  { href: "/calendar", key: "nav.calendar" },
  { href: "/results", key: "nav.results" },
];

export type NavUser = { fullName: string; role: string; unread: number } | null;

export function SiteNav({ user }: { user: NavUser }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isStaff = user && ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(user.role);
  const close = () => setOpen(false);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    if (typeof query === "string" && query.trim().length > 1) {
      close();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className={`nav${open ? " open" : ""}`} aria-label={t("nav.home")}>
      <div className="nav-inner">
        <Brand locale={locale} />

        <button
          className="icon-btn nav-toggle"
          aria-expanded={open}
          aria-label={t("nav.toggleMenu")}
          onClick={() => setOpen((value) => !value)}
          style={{ marginInlineStart: "auto" }}
        >
          <MenuIcon />
        </button>

        <div className="nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className={active(link.href) ? "active" : ""}
            >
              {t(link.key)}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <form onSubmit={search} className="nav-search row" role="search" style={{ gap: ".25rem" }}>
            <input
              name="q"
              type="search"
              aria-label={t("nav.search")}
              placeholder={t("nav.searchPlaceholder")}
              autoComplete="off"
            />
            <button className="icon-btn" type="submit" aria-label={t("nav.search")}>
              <SearchIcon />
            </button>
          </form>

          <LocaleSwitcher />
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/account/notifications"
                className="icon-btn"
                aria-label={
                  user.unread > 0 ? `${t("nav.notifications")} (${user.unread})` : t("nav.notifications")
                }
                onClick={close}
                style={{ position: "relative" }}
              >
                <BellIcon />
                {user.unread > 0 ? <span className="nav-bell-count">{user.unread > 9 ? "9+" : user.unread}</span> : null}
              </Link>
              {isStaff ? (
                <Link href="/admin" className="btn btn-sm btn-ghost" onClick={close}>
                  {t("nav.admin")}
                </Link>
              ) : null}
              <Link href="/account" className="btn btn-sm btn-ghost" onClick={close}>
                {user.fullName.split(" ")[0]}
              </Link>
              <button className="btn btn-sm btn-quiet" onClick={logout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-sm" onClick={close} lang={locale}>
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
