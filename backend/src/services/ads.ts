import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { col, fn, Op, where as sqlWhere, type WhereOptions } from "sequelize";
import { config } from "../config";
import { CATEGORIES, CITIES, CONDITIONS } from "../constants";
import { Ad as AdModel, AdImage, sequelize, User } from "../db";
import { HttpError } from "../errors";

export const UPLOAD_DIR = path.join(config.dataDir, "uploads");
export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export interface AdDto {
  id: number; userId: number; title: string; description: string; price: number; category: string;
  condition: string; city: string; seller: string; status: "active" | "sold"; featured: boolean;
  createdAt: string; images: string[];
}

const include = [
  { model: User, attributes: ["name"] },
  { model: AdImage, separate: true, order: [["position", "ASC"]] as [string, string][] },
];

const toDto = (r: AdModel): AdDto => ({
  id: r.id, userId: r.userId, title: r.title, description: r.description, price: r.price, category: r.category,
  condition: r.condition, city: r.city, seller: r.User?.name ?? "Seller", status: r.status, featured: r.featured,
  createdAt: r.createdAt.toISOString(), images: (r.AdImages ?? []).map((i) => i.file),
});

export interface Query {
  q?: string; category?: string; city?: string; condition?: string; min?: number; max?: number;
  sort?: "new" | "price-asc" | "price-desc"; userId?: number; includeSold?: boolean; limit?: number; offset?: number;
}

export async function searchAds(f: Query = {}): Promise<AdDto[]> {
  const and: WhereOptions[] = [];
  if (!f.includeSold) and.push({ status: "active" });
  const q = f.q?.trim().toLowerCase();
  if (q) {
    // instr() instead of LIKE so user-typed % and _ are plain characters.
    const hit = (c: string) => sqlWhere(fn("instr", fn("lower", col(c)), q), Op.gt, 0);
    and.push({ [Op.or]: [hit("Ad.title"), hit("Ad.description")] });
  }
  if (f.category) and.push({ category: f.category });
  if (f.city) and.push({ city: f.city });
  if (f.condition) and.push({ condition: f.condition });
  if (f.min !== undefined) and.push({ price: { [Op.gte]: f.min } });
  if (f.max !== undefined) and.push({ price: { [Op.lte]: f.max } });
  if (f.userId !== undefined) and.push({ userId: f.userId });
  const order: [string, string][] =
    f.sort === "price-asc" ? [["price", "ASC"]] : f.sort === "price-desc" ? [["price", "DESC"]] : [["createdAt", "DESC"], ["id", "DESC"]];
  const rows = await AdModel.findAll({
    where: { [Op.and]: and }, include, order,
    limit: Math.min(Math.max(f.limit ?? 60, 1), 100), offset: Math.max(f.offset ?? 0, 0),
  });
  return rows.map(toDto);
}

export async function getAd(id: number): Promise<AdDto | undefined> {
  if (!Number.isInteger(id)) return undefined;
  const r = await AdModel.findByPk(id, { include });
  return r ? toDto(r) : undefined;
}

export async function getAdsByIds(ids: number[]): Promise<AdDto[]> {
  if (!ids.length) return [];
  return (await AdModel.findAll({ where: { id: ids }, include, order: [["createdAt", "DESC"]] })).map(toDto);
}

export async function relatedAds(ad: AdDto, n = 4): Promise<AdDto[]> {
  const rows = await AdModel.findAll({
    where: { category: ad.category, status: "active", id: { [Op.ne]: ad.id } },
    include, order: [["createdAt", "DESC"]], limit: n,
  });
  return rows.map(toDto);
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

export async function createAd(userId: number, input: AdInput, files: string[]): Promise<AdDto> {
  try {
    const id = await sequelize.transaction(async (transaction) => {
      const ad = await AdModel.create({ userId, ...input }, { transaction });
      await AdImage.bulkCreate(files.map((file, position) => ({ adId: ad.id, file, position })), { transaction });
      return ad.id;
    });
    return (await getAd(id))!;
  } catch (e) {
    await removeImages(files);
    throw e;
  }
}

export const updateAd = (id: number, patch: Partial<AdInput> & { status?: "active" | "sold" }) => AdModel.update(patch, { where: { id } });

export async function deleteAd(id: number) {
  const files = (await AdImage.findAll({ where: { adId: id } })).map((i) => i.file);
  await AdModel.destroy({ where: { id } });
  await removeImages(files);
}
