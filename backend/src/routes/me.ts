import { Router } from "express";
import { me, requireAuth } from "../auth";
import { Ad, Favorite, isId } from "../db";
import { HttpError } from "../errors";
import { getAdsByIds, searchAds } from "../services/ads";

export const myAdsRouter = Router();
myAdsRouter.get("/", requireAuth, async (req, res) => {
  res.json(await searchAds({ userId: me(req).id, includeSold: true, limit: 100 }));
});

export const favoritesRouter = Router();

favoritesRouter.get("/", requireAuth, async (req, res) => {
  const ids = (await Favorite.find({ userId: me(req).id }).sort({ createdAt: -1 }).lean()).map((f) => String(f.adId));
  if (req.query.ids === "only") return void res.json({ ids });
  res.json({ ids, ads: await getAdsByIds(ids) });
});

const adIdOf = (v: unknown) => {
  if (!isId(v)) throw new HttpError(404, "Ad not found");
  return v;
};

favoritesRouter.put("/:adId", requireAuth, async (req, res) => {
  const adId = adIdOf(req.params.adId);
  if (!(await Ad.exists({ _id: adId }))) throw new HttpError(404, "Ad not found");
  await Favorite.updateOne({ userId: me(req).id, adId }, { $setOnInsert: { userId: me(req).id, adId } }, { upsert: true });
  res.json({ ok: true });
});

favoritesRouter.delete("/:adId", requireAuth, async (req, res) => {
  await Favorite.deleteOne({ userId: me(req).id, adId: adIdOf(req.params.adId) });
  res.json({ ok: true });
});
