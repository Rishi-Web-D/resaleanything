import Link from "next/link";
import { redirect } from "next/navigation";
import AdCard from "@/components/AdCard";
import { api } from "@/lib/api";
import type { Ad } from "@/lib/types";

export default async function MyAds() {
  const r = await api<Ad[]>("/api/my/ads", { auth: true });
  if (r.status === 401) redirect("/login?next=/my-ads");
  const ads = r.data ?? [];
  return (
    <div>
      <h1 className="mb-3 text-lg font-bold">My ads</h1>
      {ads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          You haven&apos;t posted anything yet. <Link href="/post" className="text-teal-700">Post your first ad</Link>.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{ads.map((a) => <AdCard key={a.id} ad={a} />)}</div>
      )}
    </div>
  );
}
