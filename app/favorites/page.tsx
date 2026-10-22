import { redirect } from "next/navigation";
import AdCard from "@/components/AdCard";
import { getAdsByIds } from "@/lib/server/ads";
import { currentUser } from "@/lib/server/auth";
import { Favorite, ready } from "@/lib/server/db";

export default async function Favorites() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/favorites");
  await ready();
  const ids = (await Favorite.findAll({ where: { userId: user.id } })).map((f) => f.adId);
  const ads = await getAdsByIds(ids);
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
