import { Router } from "express";
import { me, requireAuth } from "../auth";
import { Ad, Favorite } from "../db";
import { HttpError } from "../errors";
import { getAdsByIds, searchAds } from "../services/ads";

export const myAdsRouter = Router();
myAdsRouter.get("/", requireAuth, async (req, res) => {
  res.json(await searchAds({ userId: me(req).id, includeSold: true, limit: 100 }));
});

export const favoritesRouter = Router();

favoritesRouter.get("/", requireAuth, async (req, res) => {
  const ids = (await Favorite.findAll({ where: { userId: me(req).id } })).map((f) => f.adId);
  if (req.query.ids === "only") return void res.json({ ids });
  res.json({ ids, ads: await getAdsByIds(ids) });
});

const adIdOf = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(404, "Ad not found");
  return n;
};

favoritesRouter.put("/:adId", requireAuth, async (req, res) => {
  const adId = adIdOf(req.params.adId);
  if (!(await Ad.findByPk(adId))) throw new HttpError(404, "Ad not found");
  await Favorite.findOrCreate({ where: { userId: me(req).id, adId } });
  res.json({ ok: true });
});

favoritesRouter.delete("/:adId", requireAuth, async (req, res) => {
  await Favorite.destroy({ where: { userId: me(req).id, adId: adIdOf(req.params.adId) } });
  res.json({ ok: true });
});
