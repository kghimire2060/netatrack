"use client";

import { createContext, useContext, type ReactNode } from "react";
import { translator, type Locale, type Translator } from "@/lib/i18n";

/**
 * Makes the server-resolved locale available to client components without
 * re-reading the cookie on the client, which would flash the wrong language.
 */
const LocaleContext = createContext<{ locale: Locale; t: Translator }>({
  locale: "ne",
  t: translator("ne"),
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <LocaleContext.Provider value={{ locale, t: translator(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
