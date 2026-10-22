import { Op } from "sequelize";
import { Ad, Conversation, Message, User } from "../db";
import { HttpError } from "../errors";

export interface ConversationDto {
  id: number; adId: number; adTitle: string; other: string; lastMessage: string | null; lastAt: string; mine: "buyer" | "seller";
}
export interface MessageDto { id: number; senderId: number; body: string; createdAt: string }

const toDto = (m: Message): MessageDto => ({ id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString() });

export async function startConversation(buyerId: number, adId: number): Promise<number> {
  const ad = await Ad.findByPk(adId);
  if (!ad) throw new HttpError(404, "Ad not found");
  if (ad.userId === buyerId) throw new HttpError(400, "You can't message yourself about your own ad");
  const [c] = await Conversation.findOrCreate({ where: { adId, buyerId }, defaults: { adId, buyerId, sellerId: ad.userId } });
  return c.id;
}

async function memberOf(userId: number, id: number) {
  const c = Number.isInteger(id) ? await Conversation.findByPk(id) : null;
  // 404 rather than 403 so conversation IDs can't be probed.
  if (!c || (c.buyerId !== userId && c.sellerId !== userId)) throw new HttpError(404, "Conversation not found");
  return c;
}

export async function listConversations(userId: number): Promise<ConversationDto[]> {
  const rows = await Conversation.findAll({
    where: { [Op.or]: [{ buyerId: userId }, { sellerId: userId }] },
    include: [{ model: Ad, attributes: ["title"] }, { model: User, as: "buyer", attributes: ["name"] }, { model: User, as: "seller", attributes: ["name"] }],
  });
  const views = await Promise.all(rows.map(async (c): Promise<ConversationDto> => {
    const last = await Message.findOne({ where: { conversationId: c.id }, order: [["id", "DESC"]] });
    const isBuyer = c.buyerId === userId;
    return {
      id: c.id, adId: c.adId, adTitle: c.Ad?.title ?? "", other: (isBuyer ? c.seller : c.buyer)?.name ?? "",
      lastMessage: last?.body ?? null, lastAt: (last?.createdAt ?? c.createdAt).toISOString(), mine: isBuyer ? "buyer" : "seller",
    };
  }));
  return views.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function getMessages(userId: number, id: number, afterId = 0): Promise<MessageDto[]> {
  await memberOf(userId, id);
  const rows = await Message.findAll({ where: { conversationId: id, id: { [Op.gt]: afterId } }, order: [["id", "ASC"]], limit: 200 });
  return rows.map(toDto);
}

export async function sendMessage(userId: number, id: number, text: string): Promise<MessageDto> {
  await memberOf(userId, id);
  const body = text.trim();
  if (!body || body.length > 2000) throw new HttpError(422, "Message must be 1–2000 characters");
  return toDto(await Message.create({ conversationId: id, senderId: userId, body }));
}
