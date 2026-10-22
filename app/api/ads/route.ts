import { createAd, saveImages, searchAds, validateAd, type AdInput } from "@/lib/server/ads";
import { HttpError, json, route } from "@/lib/server/http";
import { getAdsByIds } from "@/lib/server/ads";

const num = (v: string | null) => (v !== null && v !== "" && Number.isFinite(+v) ? +v : undefined);

export const GET = route({}, async (req) => {
  const p = new URL(req.url).searchParams;
  const ids = p.get("ids");
  if (ids) return json(await getAdsByIds(ids.split(",").map(Number).filter(Number.isInteger).slice(0, 100)));
  const sort = p.get("sort");
  return json(
    await searchAds({
      q: p.get("q") ?? undefined, category: p.get("category") ?? undefined, city: p.get("city") ?? undefined,
      condition: p.get("condition") ?? undefined, min: num(p.get("min")), max: num(p.get("max")),
      sort: sort === "price-asc" || sort === "price-desc" ? sort : "new",
      limit: num(p.get("limit")), offset: num(p.get("offset")),
    }),
  );
});

export const POST = route({ auth: true }, async (req, { user }) => {
  const ct = req.headers.get("content-type") ?? "";
  let raw: Record<string, unknown>;
  let files: File[] = [];
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
    files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  } else if (ct.includes("application/json")) {
    raw = await req.json().catch(() => { throw new HttpError(400, "Invalid JSON body"); });
  } else throw new HttpError(415, "Use JSON or multipart/form-data");
  const input = validateAd(raw) as AdInput;
  const saved = await saveImages(files);
  return json(await createAd(user.id, input, saved), 201);
});
