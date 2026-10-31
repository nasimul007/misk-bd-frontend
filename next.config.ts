import type { NextConfig } from "next";

// Development only: lets a Cloudflare quick tunnel (cloudflared tunnel --url http://localhost:3000) reach the
// dev server. Both lists are skipped in production so a real deployment only trusts its own host.
const tunnel = process.env.NODE_ENV === "production" ? [] : ["*.trycloudflare.com"];

const nextConfig: NextConfig = {
  allowedDevOrigins: tunnel,
  experimental: { serverActions: { allowedOrigins: tunnel } },
  cacheComponents: true,
  partialPrefetching: true,
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
