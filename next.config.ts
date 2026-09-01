import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The application loads nothing from a third-party origin — no CDN, no web
 * font service, no analytics — so the policy can be tight without breaking a
 * page. Two deliberate exceptions:
 *
 *  - `img-src` allows https:, because candidate photo URLs are editorial data
 *    and may point at any host.
 *  - `script-src` and `style-src` allow 'unsafe-inline'. Next.js injects an
 *    inline bootstrap script and the codebase uses inline style attributes;
 *    removing the exception needs nonces threaded through middleware and the
 *    root layout. That is worth doing, but it is a change to every request
 *    path on a live site and belongs in its own step. The remaining
 *    directives — frame-ancestors, object-src, base-uri, form-action — still
 *    hold, and they are the ones that stop clickjacking and form hijacking.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Two years, preloadable. The domain is already HTTPS-only behind Vercel.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * cPanel/Passenger needs a self-contained server bundle it can start from a
   * single file. Gated behind an env var so Vercel keeps its own optimised
   * build path — setting it unconditionally changes how both hosts package the
   * app, and only one of them needs it.
   */
  ...(process.env.BUILD_STANDALONE === "true"
    ? {
        output: "standalone" as const,
        /**
         * Shared hosting caps how many processes an account may hold open, and
         * the build's parallel workers trip it: the compile dies with
         * `spawn node EAGAIN` (errno -11), which reads like a missing binary
         * but is really the process limit. One worker is slower and completes.
         */
        experimental: { cpus: 1, workerThreads: false },
      }
    : {}),
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      /**
       * Public reference pages are identical for every reader of the same URL,
       * so they belong in the CDN. Without this Next sends `no-store` for any
       * page that reads searchParams, and every request from Kathmandu crosses
       * to us-east-1 to re-render byte-identical HTML — the election dashboard
       * was measuring 5-60s that way.
       *
       * stale-while-revalidate keeps the edge serving instantly while one
       * request refreshes behind it, which is the behaviour a counting night
       * needs: never a queue, never older than a minute.
       */
      {
        source: "/elections/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/constituency/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=3600",
          },
        ],
      },
      // Nothing under /api should ever be cached by a shared proxy: these
      // responses are per-session and some are permission-dependent.
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
