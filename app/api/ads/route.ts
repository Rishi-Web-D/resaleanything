import { NextResponse } from "next/server";
import { getAdsByIds, searchAds } from "@/lib/store";

export function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const ids = p.get("ids");
  if (ids) return NextResponse.json(getAdsByIds(ids.split(",")));
  const n = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);
  const sort = p.get("sort");
  return NextResponse.json(
    searchAds({
      q: p.get("q") ?? undefined,
      category: p.get("category") ?? undefined,
      city: p.get("city") ?? undefined,
      condition: p.get("condition") ?? undefined,
      min: n("min"),
      max: n("max"),
      sort: sort === "price-asc" || sort === "price-desc" ? sort : "new",
    }),
  );
}
