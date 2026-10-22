import { Op } from "sequelize";
import { Ad, Conversation, Message, User, ready } from "./db";
import { HttpError } from "./http";

export interface ConversationView {
  id: number; adId: string; adTitle: string; other: string; lastMessage: string | null; lastAt: string; mine: "buyer" | "seller";
}
export interface MessageView { id: number; senderId: number; body: string; createdAt: string }

export async function startConversation(buyerId: number, adId: number): Promise<number> {
  await ready();
  const ad = await Ad.findByPk(adId);
  if (!ad) throw new HttpError(404, "Ad not found");
  if (ad.userId === buyerId) throw new HttpError(400, "You can't message yourself about your own ad");
  const [c] = await Conversation.findOrCreate({ where: { adId, buyerId }, defaults: { adId, buyerId, sellerId: ad.userId } });
  return c.id;
}

async function memberOf(userId: number, id: number) {
  await ready();
  const c = await Conversation.findByPk(id);
  // 404 rather than 403 so conversation IDs can't be probed.
  if (!c || (c.buyerId !== userId && c.sellerId !== userId)) throw new HttpError(404, "Conversation not found");
  return c;
}

export async function listConversations(userId: number): Promise<ConversationView[]> {
  await ready();
  const rows = await Conversation.findAll({
    where: { [Op.or]: [{ buyerId: userId }, { sellerId: userId }] },
    include: [{ model: Ad, attributes: ["title"] }, { model: User, as: "buyer", attributes: ["name"] }, { model: User, as: "seller", attributes: ["name"] }],
  });
  const views = await Promise.all(rows.map(async (c) => {
    const last = await Message.findOne({ where: { conversationId: c.id }, order: [["id", "DESC"]] });
    const buyer = c.buyerId === userId;
    return {
      id: c.id, adId: String(c.adId), adTitle: (c as unknown as { Ad: Ad }).Ad.title,
      other: buyer ? (c as unknown as { seller: User }).seller.name : (c as unknown as { buyer: User }).buyer.name,
      lastMessage: last?.body ?? null, lastAt: (last?.createdAt ?? c.createdAt).toISOString(), mine: buyer ? "buyer" : "seller",
    } as ConversationView;
  }));
  return views.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function getMessages(userId: number, id: number, afterId = 0): Promise<MessageView[]> {
  await memberOf(userId, id);
  const rows = await Message.findAll({ where: { conversationId: id, id: { [Op.gt]: afterId } }, order: [["id", "ASC"]], limit: 200 });
  return rows.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString() }));
}

export async function sendMessage(userId: number, id: number, text: string): Promise<MessageView> {
  await memberOf(userId, id);
  const body = text.trim();
  if (!body || body.length > 2000) throw new HttpError(422, "Message must be 1–2000 characters");
  const m = await Message.create({ conversationId: id, senderId: userId, body });
  return { id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString() };
}
