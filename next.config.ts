import type { NextConfig } from "next";

// Development only: lets a Cloudflare quick tunnel (cloudflared tunnel --url http://localhost:3000) reach the
// dev server. Both lists are skipped in production so a real deployment only trusts its own host.
const tunnel = process.env.NODE_ENV === "production" ? [] : ["*.trycloudflare.com"];

const isProd = process.env.NODE_ENV === "production";

// Headers every response carries. Together they stop the site being framed by another page (clickjacking, which
// matters most for the admin login), stop browsers guessing file types, limit what is sent to other sites in
// the Referer header, switch off device features the shop never uses, and (in production, over HTTPS) tell
// browsers to only ever use HTTPS. The Content-Security-Policy here sets the directives that are safe for
// every page; a script-src policy needs per-request nonces and is a separate piece of work.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: tunnel,
  experimental: { serverActions: { allowedOrigins: tunnel } },
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Staff pages and the export hold customer details: never keep a copy in a browser or shared cache.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
