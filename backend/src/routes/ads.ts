import { Router } from "express";
import multer from "multer";
import { me, requireAuth } from "../auth";
import { Ad, User } from "../db";
import { HttpError } from "../errors";
import {
  createAd, deleteAd, getAd, getAdsByIds, MAX_IMAGE_BYTES, MAX_IMAGES, relatedAds, saveImages, searchAds, updateAd, validateAd, type AdInput,
} from "../services/ads";

export const adsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES, fields: 20, parts: 40 } });

const num = (v: unknown) => (typeof v === "string" && v !== "" && Number.isFinite(+v) ? +v : undefined);
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const idParam = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(404, "Ad not found");
  return n;
};

adsRouter.get("/", async (req, res) => {
  const q = req.query;
  if (typeof q.ids === "string")
    return void res.json(await getAdsByIds(q.ids.split(",").map(Number).filter(Number.isInteger).slice(0, 100)));
  res.json(
    await searchAds({
      q: str(q.q), category: str(q.category), city: str(q.city), condition: str(q.condition), min: num(q.min), max: num(q.max),
      sort: q.sort === "price-asc" || q.sort === "price-desc" ? q.sort : "new", limit: num(q.limit), offset: num(q.offset),
    }),
  );
});

adsRouter.post("/", requireAuth, upload.array("images", MAX_IMAGES), async (req, res) => {
  const input = validateAd(req.body ?? {}) as AdInput;
  const files = await saveImages((req.files as { buffer: Buffer }[] | undefined) ?? []);
  res.status(201).json(await createAd(me(req).id, input, files));
});

adsRouter.get("/:id", async (req, res) => {
  const ad = await getAd(idParam(req.params.id));
  if (!ad) throw new HttpError(404, "Ad not found");
  res.json(ad);
});

adsRouter.get("/:id/related", async (req, res) => {
  const ad = await getAd(idParam(req.params.id));
  if (!ad) throw new HttpError(404, "Ad not found");
  res.json(await relatedAds(ad));
});

// Seller phone numbers are only revealed to logged-in users.
adsRouter.get("/:id/phone", requireAuth, async (req, res) => {
  const ad = await Ad.findByPk(idParam(req.params.id), { include: [{ model: User, attributes: ["phone"] }] });
  if (!ad?.User) throw new HttpError(404, "Ad not found");
  res.json({ phone: ad.User.phone });
});

async function ownedAd(req: import("express").Request) {
  const id = idParam(req.params.id);
  const ad = await getAd(id);
  if (!ad) throw new HttpError(404, "Ad not found");
  if (ad.userId !== me(req).id) throw new HttpError(403, "This isn't your ad");
  return id;
}

adsRouter.patch("/:id", requireAuth, async (req, res) => {
  const id = await ownedAd(req);
  const b = req.body ?? {};
  const patch: Parameters<typeof updateAd>[1] = validateAd(b, true);
  if (b.status !== undefined) {
    if (b.status !== "active" && b.status !== "sold") throw new HttpError(422, "Invalid status");
    patch.status = b.status;
  }
  await updateAd(id, patch);
  res.json(await getAd(id));
});

adsRouter.delete("/:id", requireAuth, async (req, res) => {
  await deleteAd(await ownedAd(req));
  res.json({ ok: true });
});
