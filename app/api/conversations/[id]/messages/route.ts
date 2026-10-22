import { getMessages, sendMessage } from "@/lib/server/chat";
import { body, json, route } from "@/lib/server/http";

type P = { id: string };

export const GET = route<P>({ auth: true }, async (req, { params, user }) => {
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  return json(await getMessages(user.id, +params.id, after));
});

export const POST = route<P>({ auth: true }, async (req, { params, user }) => {
  const b = await body(req);
  return json(await sendMessage(user.id, +params.id, String(b.body ?? "")), 201);
});
