import { notFound } from "next/navigation";
import { connection } from "next/server";
import AdCard, { Thumb } from "@/components/AdCard";
import ContactSeller from "@/components/ContactSeller";
import FavoriteButton from "@/components/FavoriteButton";
import { categoryName } from "@/lib/categories";
import { inr, timeAgo } from "@/lib/format";
import { getAd, relatedAds } from "@/lib/store";
import { CONDITIONS } from "@/lib/types";

export default async function AdPage({ params }: PageProps<"/ads/[id]">) {
  await connection();
  const { id } = await params;
  const ad = getAd(id);
  if (!ad) notFound();
  const related = relatedAds(ad);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Thumb ad={ad} big />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 font-bold">Details</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500">Category</dt><dd>{categoryName(ad.category)}</dd>
              <dt className="text-slate-500">Condition</dt><dd>{CONDITIONS.find((c) => c.value === ad.condition)?.label}</dd>
              <dt className="text-slate-500">Ad ID</dt><dd>{ad.id}</dd>
            </dl>
            <h2 className="mb-1 mt-5 font-bold">Description</h2>
            <p className="whitespace-pre-line text-sm text-slate-700">{ad.description}</p>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <p className="text-3xl font-extrabold">{inr(ad.price)}</p>
              <FavoriteButton id={ad.id} />
            </div>
            <h1 className="mt-1 font-medium">{ad.title}</h1>
            <p className="mt-2 text-xs text-slate-500">{ad.city} · {timeAgo(ad.createdAt)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 font-bold">Posted by {ad.seller}</p>
            <ContactSeller phone={ad.phone} seller={ad.seller} />
          </div>
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Safety tip: meet in a public place and pay only after inspecting the item.</p>
        </aside>
      </div>
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Similar ads</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((a) => <AdCard key={a.id} ad={a} />)}</div>
        </section>
      )}
    </div>
  );
}
