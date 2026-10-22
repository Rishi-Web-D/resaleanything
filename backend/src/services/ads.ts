import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { QueryFilter } from "mongoose";
import { config } from "../config";
import { CATEGORIES, CITIES, CONDITIONS } from "../constants";
import { Ad, Conversation, Favorite, isId, Message, type IAd } from "../db";
import { HttpError } from "../errors";

export const UPLOAD_DIR = path.join(config.dataDir, "uploads");
export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export interface AdDto {
  id: string; userId: string; title: string; description: string; price: number; category: string;
  condition: string; city: string; seller: string; status: "active" | "sold"; featured: boolean;
  createdAt: string; images: string[];
}

type PopulatedAd = Omit<IAd, "userId"> & { userId: { _id: IAd["userId"]; name: string } | null };

const toDto = (r: PopulatedAd): AdDto => ({
  id: String(r._id), userId: String(r.userId?._id ?? ""), title: r.title, description: r.description, price: r.price,
  category: r.category, condition: r.condition, city: r.city, seller: r.userId?.name ?? "Seller", status: r.status,
  featured: r.featured, createdAt: r.createdAt.toISOString(), images: r.images ?? [],
});

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface Query {
  q?: string; category?: string; city?: string; condition?: string; min?: number; max?: number;
  sort?: "new" | "price-asc" | "price-desc"; userId?: string; includeSold?: boolean; limit?: number; offset?: number;
}

export async function searchAds(f: Query = {}): Promise<AdDto[]> {
  const filter: QueryFilter<IAd> = {};
  if (!f.includeSold) filter.status = "active";
  const q = f.q?.trim();
  if (q) {
    // Escaped, case-insensitive substring match: user-typed regex characters are plain text.
    const re = new RegExp(escapeRegExp(q), "i");
    filter.$or = [{ title: re }, { description: re }];
  }
  if (f.category) filter.category = f.category;
  if (f.city) filter.city = f.city;
  if (f.condition) filter.condition = f.condition;
  if (f.min !== undefined || f.max !== undefined) {
    filter.price = { ...(f.min !== undefined && { $gte: f.min }), ...(f.max !== undefined && { $lte: f.max }) };
  }
  if (f.userId !== undefined) filter.userId = f.userId;
  const sort: Record<string, 1 | -1> =
    f.sort === "price-asc" ? { price: 1, _id: -1 } : f.sort === "price-desc" ? { price: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  const rows = await Ad.find(filter)
    .sort(sort)
    .skip(Math.max(f.offset ?? 0, 0))
    .limit(Math.min(Math.max(f.limit ?? 60, 1), 100))
    .populate("userId", "name")
    .lean();
  return (rows as unknown as PopulatedAd[]).map(toDto);
}

export async function getAd(id: string): Promise<AdDto | undefined> {
  if (!isId(id)) return undefined;
  const r = await Ad.findById(id).populate("userId", "name").lean();
  return r ? toDto(r as unknown as PopulatedAd) : undefined;
}

export async function getAdsByIds(ids: string[]): Promise<AdDto[]> {
  const valid = ids.filter(isId);
  if (!valid.length) return [];
  const rows = await Ad.find({ _id: { $in: valid } }).sort({ createdAt: -1 }).populate("userId", "name").lean();
  return (rows as unknown as PopulatedAd[]).map(toDto);
}

export async function relatedAds(ad: AdDto, n = 4): Promise<AdDto[]> {
  const rows = await Ad.find({ category: ad.category, status: "active", _id: { $ne: ad.id } })
    .sort({ createdAt: -1 }).limit(n).populate("userId", "name").lean();
  return (rows as unknown as PopulatedAd[]).map(toDto);
}

export interface AdInput { title: string; description: string; price: number; category: string; condition: string; city: string }

export function validateAd(raw: Record<string, unknown>, partial = false): Partial<AdInput> {
  const errors: Record<string, string> = {};
  const out: Partial<AdInput> = {};
  const has = (k: string) => !partial || raw[k] !== undefined;
  const str = (k: string) => String(raw[k] ?? "").trim();
  const check = (k: string, ok: (v: string) => boolean, msg: string, conv?: (v: string) => unknown) => {
    if (!has(k)) return;
    const v = str(k);
    if (ok(v)) (out as Record<string, unknown>)[k] = conv ? conv(v) : v;
    else errors[k] = msg;
  };
  check("title", (v) => v.length >= 5 && v.length <= 80, "Title must be 5–80 characters.");
  check("description", (v) => v.length >= 20 && v.length <= 4000, "Describe the item in 20–4000 characters.");
  check("price", (v) => { const n = Number(v); return v !== "" && Number.isInteger(n) && n > 0 && n <= 100_000_000; }, "Enter a whole-rupee price.", Number);
  check("category", (v) => (CATEGORIES as readonly string[]).includes(v), "Pick a category.");
  check("condition", (v) => (CONDITIONS as readonly string[]).includes(v), "Pick a condition.");
  check("city", (v) => (CITIES as readonly string[]).includes(v), "Pick a city.");
  if (Object.keys(errors).length) throw new HttpError(422, "Please fix the highlighted fields", errors);
  return out;
}

function sniff(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/** Validates uploaded buffers by magic bytes (not client-supplied type) and writes them to disk. */
export async function saveImages(files: { buffer: Buffer }[]): Promise<string[]> {
  const exts = files.map((f) => sniff(f.buffer));
  if (exts.some((e) => !e)) throw new HttpError(422, "Unsupported photo", { images: "Photos must be JPEG, PNG or WebP." });
  await mkdir(UPLOAD_DIR, { recursive: true });
  const names = files.map((_, i) => `${randomBytes(12).toString("hex")}.${exts[i]}`);
  await Promise.all(files.map((f, i) => writeFile(path.join(UPLOAD_DIR, names[i]), f.buffer)));
  return names;
}

export const removeImages = (names: string[]) => Promise.all(names.map((n) => unlink(path.join(UPLOAD_DIR, n)).catch(() => {})));

export async function readUpload(name: string) {
  if (!/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name)) return null;
  try {
    return { data: await readFile(path.join(UPLOAD_DIR, name)), ext: name.split(".")[1] };
  } catch {
    return null;
  }
}

export async function createAd(userId: string, input: AdInput, files: string[]): Promise<AdDto> {
  try {
    const ad = await Ad.create({ userId, ...input, images: files });
    return (await getAd(String(ad._id)))!;
  } catch (e) {
    await removeImages(files);
    throw e;
  }
}

export const updateAd = (id: string, patch: Partial<AdInput> & { status?: "active" | "sold" }) =>
  Ad.updateOne({ _id: id }, { $set: patch }, { runValidators: true });

/** Deletes the ad, everything that hangs off it, and its photo files. */
export async function deleteAd(id: string) {
  const ad = await Ad.findByIdAndDelete(id).lean();
  if (!ad) return;
  const convs = await Conversation.find({ adId: id }, "_id").lean();
  await Promise.all([
    Favorite.deleteMany({ adId: id }),
    Message.deleteMany({ conversationId: { $in: convs.map((c) => c._id) } }),
    Conversation.deleteMany({ adId: id }),
    removeImages(ad.images),
  ]);
}
