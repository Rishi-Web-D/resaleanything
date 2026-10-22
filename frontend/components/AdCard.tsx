import Link from "next/link";
import type { Ad } from "@/lib/types";
import { inr, timeAgo } from "@/lib/format";
import { categoryEmoji } from "@/lib/categories";
import FavoriteButton from "./FavoriteButton";

export function Thumb({ ad, big }: { ad: Ad; big?: boolean }) {
  const hue = (ad.id * 47) % 360;
  return (
    <div
      className={`relative grid place-items-center overflow-hidden ${big ? "h-72 text-9xl" : "h-40 text-6xl"}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 90%), hsl(${(hue + 40) % 360} 70% 80%))` }}
      >
      {ad.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/uploads/${ad.images[0]}`} alt={ad.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        categoryEmoji(ad.category)
      )}
    </div>
  );
}

export default function AdCard({ ad }: { ad: Ad }) {
  return (
    <Link href={`/ads/${ad.id}`} className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-lg">
      <div className="absolute right-2 top-2 z-10"><FavoriteButton id={ad.id} /></div>
      {ad.status === "sold" && <span className="absolute left-2 top-2 z-10 rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">SOLD</span>}
      {ad.featured && ad.status !== "sold" && <span className="absolute left-2 top-2 z-10 rounded bg-amber-400 px-2 py-0.5 text-xs font-bold">FEATURED</span>}
      <Thumb ad={ad} />
      <div className="p-3">
        <p className="text-lg font-bold text-slate-900">{inr(ad.price)}</p>
        <p className="truncate text-sm text-slate-700 group-hover:text-teal-700">{ad.title}</p>
        <p className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{ad.city}</span>
          <span>{timeAgo(ad.createdAt)}</span>
        </p>
      </div>
    </Link>
  );
}
