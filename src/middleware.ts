import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge caching for the public reference pages.
 *
 * Reading searchParams makes a page dynamic, and Vercel then answers with
 * `private, no-cache, no-store` regardless of what next.config's headers()
 * says — the framework's own header wins for SSR routes. Setting it here, at
 * the edge, is the one place the CDN honours.
 *
 * These pages are anonymous and identical for every reader of the same URL, so
 * they belong in the CDN. Measured without it: 12-14s on a cold origin (Neon
 * waking from suspend plus a lambda cold start) and ~1s warm, on every single
 * view. With it, one reader per minute pays that and everyone else is served
 * from their nearest edge.
 *
 * Deliberately narrow. Anything authenticated, any API route and anything
 * under /admin must never be shared between readers, so the matcher lists only
 * the two public trees rather than excluding the sensitive ones.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // A session cookie means a personalised render — never cache that.
  if (request.cookies.has("netatrack_session")) return response;

  const isElection = request.nextUrl.pathname.startsWith("/elections");
  response.headers.set(
    "Cache-Control",
    isElection
      ? "public, s-maxage=60, stale-while-revalidate=300"
      : "public, s-maxage=300, stale-while-revalidate=3600"
  );
  return response;
}

export const config = {
  matcher: ["/elections/:path*", "/constituency/:path*"],
};
