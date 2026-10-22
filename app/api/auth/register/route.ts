import { Op } from "sequelize";
import { hashPassword, startSession } from "@/lib/server/auth";
import { ready, User } from "@/lib/server/db";
import { body, clientIp, HttpError, json, rateLimit, route } from "@/lib/server/http";

export const POST = route({}, async (req) => {
  rateLimit(`reg:${clientIp(req)}`, 10, 3600_000);
  const b = await body(req);
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
  await ready();
  if (await User.findOne({ where: { email: { [Op.eq]: email } } })) throw new HttpError(409, "That email is already registered", { email: "Already registered." });
  const u = await User.create({ name, email, phone, passwordHash: await hashPassword(password) });
  await startSession(u.id);
  return json({ user: { id: u.id, name, email, phone } }, 201);
});
