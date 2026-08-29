import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getActor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "NetaTrack — Election & Citizen Accountability Platform",
    template: "%s · NetaTrack",
  },
  description:
    "Know. Vote. Track. Independent election information, candidate profiles, public opinion and citizen issue tracking for Nepal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B2A5B",
};

/** Every page reads the session cookie, so the tree renders per request. */
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  const unread = actor
    ? await prisma.notification
        .count({ where: { userId: actor.userId, readAt: null } })
        .catch(() => 0)
    : 0;

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <SiteNav user={actor ? { fullName: actor.fullName, role: actor.role, unread } : null} />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
