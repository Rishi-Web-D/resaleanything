import Link from "next/link";
import { connection } from "next/server";
import AdCard from "@/components/AdCard";
import { CATEGORIES } from "@/lib/categories";
import { searchAds } from "@/lib/store";

export default async function Home() {
  await connection();
  const ads = searchAds();
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-r from-teal-700 to-teal-500 p-8 text-white">
        <h1 className="text-3xl font-extrabold">Buy it. Sell it. Give it a second life.</h1>
        <p className="mt-2 max-w-xl text-teal-50">Pre-owned phones, bikes, furniture and more — right in your city.</p>
        <Link href="/post" className="mt-4 inline-block rounded-full bg-amber-400 px-5 py-2 font-bold text-slate-900">Post a free ad</Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Browse categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/search?category=${c.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:border-teal-600">
              <div className="text-3xl">{c.emoji}</div>
              <div className="mt-1 text-sm font-medium">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Fresh recommendations</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {ads.slice(0, 12).map((a) => (
            <AdCard key={a.id} ad={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
