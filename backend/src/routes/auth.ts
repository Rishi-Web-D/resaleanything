import { Router } from "express";
import rateLimit from "express-rate-limit";
import { endSession, hashPassword, startSession, verifyPassword } from "../auth";
import { config } from "../config";
import { User } from "../db";
import type { Types } from "mongoose";
import { HttpError } from "../errors";

export const authRouter = Router();

const limiter = (windowMs: number, limit: number) =>
  rateLimit({ windowMs, limit, standardHeaders: "draft-7", legacyHeaders: false, handler: (_q, _r, next) => next(new HttpError(429, "Too many attempts, try again later")) });

const publicUser = (u: { _id: Types.ObjectId; name: string; email: string; phone: string }) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone });

authRouter.post("/register", limiter(3600_000, config.authRateMax), async (req, res) => {
  const b = req.body ?? {};
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = String(b.phone ?? "").replace(/\D/g, "");
  const password = String(b.password ?? "");
  const fields: Record<string, string> = {};
  if (name.length < 2 || name.length > 60) fields.name = "Enter your name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) fields.email = "Enter a valid email.";
  if (!/^[6-9]\d{9}$/.test(phone)) fields.phone = "Enter a valid 10-digit Indian mobile number.";
  if (password.length < 8 || password.length > 100) fields.password = "Password must be 8–100 characters.";
  if (Object.keys(fields).length) throw new HttpError(422, "Please fix the highlighted fields", fields);
  const taken = new HttpError(409, "That email is already registered", { email: "Already registered." });
  if (await User.exists({ email })) throw taken;
  let u;
  try {
    u = await User.create({ name, email, phone, passwordHash: await hashPassword(password) });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw taken; // lost a race with another signup
    throw e;
  }
  await startSession(res, String(u._id));
  res.status(201).json({ user: publicUser(u) });
});

let dummyHash: Promise<string> | undefined;

authRouter.post("/login", limiter(15 * 60_000, config.authRateMax), async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const u = await User.findOne({ email });
  // Always run one scrypt so unknown emails aren't distinguishable by timing.
  const ok = await verifyPassword(password, u?.passwordHash ?? (await (dummyHash ??= hashPassword("x"))));
  if (!u || !ok) throw new HttpError(401, "Wrong email or password");
  await startSession(res, String(u._id));
  res.json({ user: publicUser(u) });
});

authRouter.post("/logout", async (req, res) => {
  await endSession(req, res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  res.json({ user: req.user ?? null });
});
