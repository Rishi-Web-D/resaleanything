// Plain JavaScript so `next start` needs no TypeScript installed on the server.

// The Express API runs as a separate server. Proxying /api through Next keeps the
// browser on a single origin, so the session cookie works without CORS.
// BACKEND_URL is read at build time (rewrites are baked into the build).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // 4 photos x 3 MB (enforced by the backend) must fit through the /api proxy; default is 10 MB.
  experimental: { proxyClientMaxBodySize: "16mb" },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
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
