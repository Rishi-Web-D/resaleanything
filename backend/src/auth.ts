import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { Session, User } from "./db";
import { HttpError } from "./errors";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const COOKIE = "ra_session";

export interface AuthUser { id: string; name: string; email: string; phone: string }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `s1$${salt.toString("hex")}$${(await scrypt(pw, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [v, salt, key] = stored.split("$");
  if (v !== "s1" || !salt || !key) return false;
  const got = await scrypt(pw, Buffer.from(salt, "hex"), 64);
  const want = Buffer.from(key, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function startSession(res: Response, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + config.sessionTtlMs);
  await Session.create({ _id: sha(token), userId, expiresAt: expires });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: config.secureCookies, path: "/", expires });
}

export async function endSession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE];
  if (typeof token === "string") await Session.deleteOne({ _id: sha(token) });
  res.clearCookie(COOKIE, { path: "/" });
}

/** Populates req.user when a valid session cookie is present. Never rejects. */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    if (typeof token === "string") {
      // The TTL monitor runs about once a minute, so expiry is also checked here.
      const s = await Session.findOne({ _id: sha(token), expiresAt: { $gt: new Date() } }).lean();
      const u = s && (await User.findById(s.userId).lean());
      if (u) req.user = { id: String(u._id), name: u.name, email: u.email, phone: u.phone };
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  next(req.user ? undefined : new HttpError(401, "Please log in"));
}

export const me = (req: Request) => req.user!;
