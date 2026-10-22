import { Ad, Favorite, ready } from "@/lib/server/db";
import { HttpError, json, route } from "@/lib/server/http";

type P = { adId: string };

export const PUT = route<P>({ auth: true }, async (_req, { params, user }) => {
  await ready();
  const adId = Number(params.adId);
  if (!Number.isInteger(adId) || !(await Ad.findByPk(adId))) throw new HttpError(404, "Ad not found");
  await Favorite.findOrCreate({ where: { userId: user.id, adId } });
  return json({ ok: true });
});

export const DELETE = route<P>({ auth: true }, async (_req, { params, user }) => {
  await ready();
  await Favorite.destroy({ where: { userId: user.id, adId: Number(params.adId) } });
  return json({ ok: true });
});
