import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { config } from "./config";
import { HttpError } from "./errors";

/**
 * Reject cross-site state-changing requests. Requests without an Origin header
 * (curl, server-to-server, same-origin GET) pass; browsers always send it on
 * cross-origin writes. The session cookie is also SameSite=Lax.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const origin = req.get("origin");
  if (origin && !config.appOrigins.includes(origin)) return next(new HttpError(403, "Cross-origin request blocked"));
  next();
}

export const notFound = (_req: Request, _res: Response, next: NextFunction) => next(new HttpError(404, "Not found"));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message, fields: err.fields });
  if (err instanceof MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Each photo must be under 3 MB." : "Too many or unexpected files (max 4 photos).";
    return void res.status(422).json({ error: "Invalid photos", fields: { images: msg } });
  }
  if (err?.type === "entity.parse.failed") return void res.status(400).json({ error: "Invalid JSON body" });
  if (err?.type === "entity.too.large") return void res.status(413).json({ error: "Request body too large" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
