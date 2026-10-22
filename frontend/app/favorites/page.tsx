import { redirect } from "next/navigation";
import AdCard from "@/components/AdCard";
import { api } from "@/lib/api";
import type { Ad } from "@/lib/types";

export default async function Favorites() {
  const r = await api<{ ids: number[]; ads: Ad[] }>("/api/favorites", { auth: true });
  if (r.status === 401) redirect("/login?next=/favorites");
  const ads = r.data?.ads ?? [];
  return (
    <div>
      <h1 className="mb-3 text-lg font-bold">Your favourites</h1>
      {ads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Tap ♡ on any ad to save it here.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{ads.map((a) => <AdCard key={a.id} ad={a} />)}</div>
      )}
    </div>
  );
}
