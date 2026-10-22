import path from "node:path";

const env = process.env;
const production = env.NODE_ENV === "production";

if (production && !env.MONGODB_URI) throw new Error("MONGODB_URI is required in production");

export const config = {
  port: Number(env.PORT ?? 4000),
  // Listen on loopback by default: the Next.js frontend proxies /api here, and
  // rate limiting trusts the forwarded client IP that proxy sets.
  host: env.HOST ?? "127.0.0.1",
  // Atlas: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/resaleanything
  mongoUri: env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/resaleanything",
  // Only needed when the URI has no database name (the default is "resaleanything").
  mongoDb: env.MONGODB_DB,
  // Photo uploads are stored on local disk (not in MongoDB).
  dataDir: env.DATA_DIR ?? path.resolve(__dirname, "..", "data"),
  // Number of reverse proxies in front of Express. Local dev: 1 (Next). Azure App Service: 2 (Azure front end + Next).
  trustProxy: Number(env.TRUST_PROXY ?? 1),
  appOrigins: (env.APP_ORIGIN ?? "http://localhost:3000").split(",").map((s) => s.trim()).filter(Boolean),
  secureCookies: production && env.INSECURE_COOKIES !== "1",
  authRateMax: Number(env.AUTH_RATE_MAX ?? 10),
  sessionTtlMs: 30 * 24 * 3600 * 1000,
};
