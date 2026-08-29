"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

/**
 * Writes the locale cookie and refreshes so the server re-renders in the new
 * language. URLs stay canonical, so a shared link opens in the reader's own
 * preference rather than the sharer's.
 */
export function LocaleSwitcher() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="lang-switch" role="group" aria-label={t("nav.language")}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={code === locale}
          className={code === locale ? "active" : ""}
          disabled={pending}
          lang={code}
        >
          {code === "ne" ? "नेपा" : "EN"}
          <span className="visually-hidden"> {LOCALE_LABELS[code]}</span>
        </button>
      ))}
    </div>
  );
}
