import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { loadUser } from "./auth";
import { config } from "./config";
import { errorHandler, notFound, originCheck } from "./middleware";
import { adsRouter } from "./routes/ads";
import { authRouter } from "./routes/auth";
import { conversationsRouter } from "./routes/conversations";
import { favoritesRouter, myAdsRouter } from "./routes/me";
import { uploadsRouter } from "./routes/uploads";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy); // reverse proxies in front: Next.js, plus the host's front end when deployed
  // Images are loaded by the frontend origin through its /api proxy, so same-site is enough.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(originCheck);
  app.use(loadUser);

  app.get("/api/health", (_req, res) => void res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/ads", adsRouter);
  app.use("/api/my/ads", myAdsRouter);
  app.use("/api/favorites", favoritesRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/uploads", uploadsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
