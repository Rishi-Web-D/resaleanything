import { deleteAd, getAd, updateAd, validateAd } from "@/lib/server/ads";
import { body, HttpError, json, route } from "@/lib/server/http";

type P = { id: string };

export const GET = route<P>({}, async (_req, { params }) => {
  const ad = await getAd(params.id);
  if (!ad) throw new HttpError(404, "Ad not found");
  return json(ad);
});

async function owned(id: string, userId: number) {
  const ad = await getAd(id);
  if (!ad) throw new HttpError(404, "Ad not found");
  if (ad.userId !== userId) throw new HttpError(403, "This isn't your ad");
  return ad;
}

export const PATCH = route<P>({ auth: true }, async (req, { params, user }) => {
  await owned(params.id, user.id);
  const b = await body(req);
  const patch: Parameters<typeof updateAd>[1] = validateAd(b, true);
  if (b.status !== undefined) {
    if (b.status !== "active" && b.status !== "sold") throw new HttpError(422, "Invalid status");
    patch.status = b.status;
  }
  await updateAd(+params.id, patch);
  return json(await getAd(params.id));
});

export const DELETE = route<P>({ auth: true }, async (_req, { params, user }) => {
  await owned(params.id, user.id);
  await deleteAd(+params.id);
  return json({ ok: true });
});
