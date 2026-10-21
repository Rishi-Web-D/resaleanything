import type { Ad } from "./types";
import { SEED_ADS } from "./seed";

// In-memory store, shared across requests in one server process. Swap for a
// real database in production; the functions below are the whole data API.
const g = globalThis as unknown as { __ads?: Ad[] };
const ads = (g.__ads ??= [...SEED_ADS]);

export interface Query {
  q?: string;
  category?: string;
  city?: string;
  condition?: string;
  min?: number;
  max?: number;
  sort?: "new" | "price-asc" | "price-desc";
}

export function searchAds(query: Query = {}): Ad[] {
  const q = query.q?.trim().toLowerCase();
  const out = ads.filter((a) => {
    if (q && !`${a.title} ${a.description}`.toLowerCase().includes(q)) return false;
    if (query.category && a.category !== query.category) return false;
    if (query.city && a.city !== query.city) return false;
    if (query.condition && a.condition !== query.condition) return false;
    if (query.min !== undefined && a.price < query.min) return false;
    if (query.max !== undefined && a.price > query.max) return false;
    return true;
  });
  const sort = query.sort ?? "new";
  out.sort((a, b) =>
    sort === "price-asc" ? a.price - b.price : sort === "price-desc" ? b.price - a.price : +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  return out;
}

export const getAd = (id: string) => ads.find((a) => a.id === id);
export const getAdsByIds = (ids: string[]) => ads.filter((a) => ids.includes(a.id));
export const relatedAds = (ad: Ad, n = 4) => ads.filter((a) => a.category === ad.category && a.id !== ad.id).slice(0, n);

export function createAd(input: Omit<Ad, "id" | "createdAt" | "hue" | "featured">): Ad {
  const ad: Ad = {
    ...input,
    id: String(Math.max(0, ...ads.map((a) => +a.id)) + 1),
    createdAt: new Date().toISOString(),
    hue: Math.floor(Math.random() * 360),
  };
  ads.unshift(ad);
  return ad;
}
