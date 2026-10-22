import { Router } from "express";
import { me, requireAuth } from "../auth";
import { HttpError } from "../errors";
import { getMessages, listConversations, sendMessage, startConversation } from "../services/chat";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get("/", async (req, res) => {
  res.json(await listConversations(me(req).id));
});

conversationsRouter.post("/", async (req, res) => {
  const adId = Number(req.body?.adId);
  if (!Number.isInteger(adId)) throw new HttpError(422, "adId required");
  res.status(201).json({ id: await startConversation(me(req).id, adId) });
});

conversationsRouter.get("/:id/messages", async (req, res) => {
  const after = Number(req.query.after ?? 0) || 0;
  res.json(await getMessages(me(req).id, Number(req.params.id), after));
});

conversationsRouter.post("/:id/messages", async (req, res) => {
  res.status(201).json(await sendMessage(me(req).id, Number(req.params.id), String(req.body?.body ?? "")));
});
