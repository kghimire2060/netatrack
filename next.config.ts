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
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
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
