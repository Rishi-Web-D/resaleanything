"use client";
import { useEffect, useState } from "react";
import AdCard from "@/components/AdCard";
import { useFavorites } from "@/components/FavoriteButton";
import type { Ad } from "@/lib/types";

export default function Favorites() {
  const favs = useFavorites();
  const key = favs.join(",");
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch(`/api/ads?ids=${key}`).then((r) => r.json()).then((d) => live && setAds(d));
    return () => { live = false; };
  }, [key]);
  const shown = ads.filter((a) => favs.includes(a.id));
  return (
    <div>
      <h1 className="mb-3 text-lg font-bold">Your favourites</h1>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Tap ♡ on any ad to save it here.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{shown.map((a) => <AdCard key={a.id} ad={a} />)}</div>
      )}
    </div>
  );
}
