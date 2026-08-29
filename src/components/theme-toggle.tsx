"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./locale-provider";

type Theme = "light" | "dark";
const THEME_KEY = "netatrack-theme";

/**
 * Light/dark toggle. The initial value is applied by an inline script in the
 * document head (see layout) so there is no flash of the wrong theme; this
 * component only reflects and changes it.
 */
export function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private browsing or blocked storage — the choice just will not persist.
    }
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={t("nav.toggleTheme")}
      title={t("nav.toggleTheme")}
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2m15.07-7.07-1.77 1.77M8.7 15.3l-1.77 1.77m10.14 0-1.77-1.77M8.7 8.7 6.93 6.93"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
