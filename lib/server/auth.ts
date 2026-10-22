import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Op } from "sequelize";
import { ready, Session, User as UserModel } from "./db";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const COOKIE = "ra_session";
const TTL_MS = 30 * 24 * 3600 * 1000;

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
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

export async function startSession(userId: number) {
  await ready();
  const token = randomBytes(32).toString("base64url");
  const expires = Date.now() + TTL_MS;
  await Session.create({ tokenHash: sha(token), userId, expiresAt: expires });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  await ready();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await Session.destroy({ where: { tokenHash: sha(token) } });
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  await connection(); // session expiry reads the clock, so this is strictly request-time
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await ready();
  const s = await Session.findOne({ where: { tokenHash: sha(token), expiresAt: { [Op.gt]: Date.now() } } });
  if (!s) return null;
  const u = await UserModel.findByPk(s.userId);
  return u ? { id: u.id, name: u.name, email: u.email, phone: u.phone } : null;
}
