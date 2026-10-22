import { listConversations, startConversation } from "@/lib/server/chat";
import { body, HttpError, json, route } from "@/lib/server/http";

export const GET = route({ auth: true }, async (_req, { user }) => json(await listConversations(user.id)));

export const POST = route({ auth: true }, async (req, { user }) => {
  const b = await body(req);
  const adId = Number(b.adId);
  if (!Number.isInteger(adId)) throw new HttpError(422, "adId required");
  return json({ id: await startConversation(user.id, adId) }, 201);
});
