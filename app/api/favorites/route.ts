import { getAdsByIds } from "@/lib/server/ads";
import { Favorite, ready } from "@/lib/server/db";
import { json, route } from "@/lib/server/http";

export const GET = route({ auth: true }, async (req, { user }) => {
  await ready();
  const favs = await Favorite.findAll({ where: { userId: user.id } });
  const ids = favs.map((f) => f.adId);
  if (new URL(req.url).searchParams.get("ids") === "only") return json({ ids });
  return json({ ids, ads: await getAdsByIds(ids) });
});
