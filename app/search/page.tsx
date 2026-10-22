import { connection } from "next/server";
import AdCard from "@/components/AdCard";
import { CATEGORIES, CITIES, categoryName } from "@/lib/categories";
import { CONDITIONS } from "@/lib/types";
import { searchAds, type Query } from "@/lib/server/ads";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | undefined) => (v !== undefined && v !== "" && !Number.isNaN(+v) ? +v : undefined);

export default async function Search({ searchParams }: PageProps<"/search">) {
  await connection();
  const sp = await searchParams;
  const sort = one(sp.sort);
  const query: Query = {
    q: one(sp.q),
    category: one(sp.category),
    city: one(sp.city),
    condition: one(sp.condition),
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    sort: sort === "price-asc" || sort === "price-desc" ? sort : "new",
  };
  const ads = await searchAds(query);
  const field = "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm";

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <form className="h-fit space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold">Filters</h2>
        <input name="q" defaultValue={query.q} placeholder="Keywords" className={field} />
        <select name="category" defaultValue={query.category ?? ""} className={field}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="city" defaultValue={query.city ?? ""} className={field}>
          <option value="">All cities</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="condition" defaultValue={query.condition ?? ""} className={field}>
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="flex gap-2">
          <input name="min" type="number" min={0} defaultValue={query.min} placeholder="Min ₹" className={field} />
          <input name="max" type="number" min={0} defaultValue={query.max} placeholder="Max ₹" className={field} />
        </div>
        <select name="sort" defaultValue={query.sort} className={field}>
          <option value="new">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
        <button className="w-full rounded-lg bg-teal-700 py-2 text-sm font-semibold text-white">Apply</button>
      </form>

      <section>
        <h1 className="mb-3 text-lg font-bold">
          {ads.length} result{ads.length === 1 ? "" : "s"}
          {query.q && <> for “{query.q}”</>}
          {query.category && <> in {categoryName(query.category)}</>}
        </h1>
        {ads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Nothing matched. Try loosening your filters.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {ads.map((a) => <AdCard key={a.id} ad={a} />)}
          </div>
        )}
      </section>
    </div>
  );
}
