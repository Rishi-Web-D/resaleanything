import { hashPassword, startSession, verifyPassword } from "@/lib/server/auth";
import { ready, User } from "@/lib/server/db";
import { body, clientIp, HttpError, json, rateLimit, route } from "@/lib/server/http";

let dummy: Promise<string> | undefined;

export const POST = route({}, async (req) => {
  rateLimit(`login:${clientIp(req)}`, 10, 15 * 60_000);
  const b = await body(req);
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  await ready();
  const u = await User.findOne({ where: { email } });
  // Always run one scrypt so unknown emails aren't distinguishable by timing.
  const ok = await verifyPassword(password, u?.passwordHash ?? (await (dummy ??= hashPassword("x"))));
  if (!u || !ok) throw new HttpError(401, "Wrong email or password");
  await startSession(u.id);
  return json({ user: { id: u.id, name: u.name, email: u.email, phone: u.phone } });
});
