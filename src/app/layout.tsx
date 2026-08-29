import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getActor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/locale-server";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "NetaTrack — नेता, नीति र जनताको सम्पर्कको डिजिटल प्लेटफर्म",
    template: "%s · NetaTrack",
  },
  description:
    "नेतालाई ट्र्याक गर्नुहोस्, प्रतिबद्धता विश्लेषण गर्नुहोस् र सचेत नागरिक बनौं। Independent election information and citizen accountability for Nepal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070f1e" },
  ],
};

export const dynamic = "force-dynamic";

/**
 * Applies the stored theme before first paint. Without this the page renders
 * light and then flips, which is worse than no dark mode at all.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('netatrack-theme');
if(!s){s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.dataset.theme=s;}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [actor, { locale, t }] = await Promise.all([getActor(), getTranslator()]);
  const unread = actor
    ? await prisma.notification
        .count({ where: { userId: actor.userId, readAt: null } })
        .catch(() => 0)
    : 0;

  return (
    <html lang={locale} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <LocaleProvider locale={locale}>
          <a className="skip-link" href="#main">
            {t("nav.skipToContent")}
          </a>
          <SiteNav
            user={actor ? { fullName: actor.fullName, role: actor.role, unread } : null}
          />
          <main id="main">{children}</main>
          <SiteFooter />
        </LocaleProvider>
      </body>
    </html>
  );
}
