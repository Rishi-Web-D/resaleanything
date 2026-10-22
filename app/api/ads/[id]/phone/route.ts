import { Ad, ready, User } from "@/lib/server/db";
import { HttpError, json, route } from "@/lib/server/http";

// Seller phone numbers are only revealed to logged-in users.
export const GET = route<{ id: string }>({ auth: true }, async (_req, { params }) => {
  await ready();
  const ad = await Ad.findByPk(Number(params.id), { include: [{ model: User, attributes: ["phone"] }] });
  if (!ad?.User) throw new HttpError(404, "Ad not found");
  return json({ phone: ad.User.phone });
});
