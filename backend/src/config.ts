import path from "node:path";

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 4000),
  // Listen on loopback by default: the Next.js frontend proxies /api here, and
  // rate limiting trusts the forwarded client IP that proxy sets.
  host: env.HOST ?? "127.0.0.1",
  dataDir: env.DATA_DIR ?? path.resolve(__dirname, "..", "data"),
  appOrigins: (env.APP_ORIGIN ?? "http://localhost:3000").split(",").map((s) => s.trim()).filter(Boolean),
  secureCookies: env.NODE_ENV === "production" && env.INSECURE_COOKIES !== "1",
  authRateMax: Number(env.AUTH_RATE_MAX ?? 10),
  sessionTtlMs: 30 * 24 * 3600 * 1000,
};
