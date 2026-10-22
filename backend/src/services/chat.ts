import { Ad, Conversation, isId, Message, type IConversation } from "../db";
import { HttpError } from "../errors";

export interface ConversationDto {
  id: string; adId: string; adTitle: string; other: string; lastMessage: string | null; lastAt: string; mine: "buyer" | "seller";
}
export interface MessageDto { id: number; senderId: string; body: string; createdAt: string }

const toDto = (m: { seq: number; senderId: unknown; body: string; createdAt: Date }): MessageDto => ({
  id: m.seq, senderId: String(m.senderId), body: m.body, createdAt: m.createdAt.toISOString(),
});

export async function startConversation(buyerId: string, adId: string): Promise<string> {
  const ad = isId(adId) ? await Ad.findById(adId).lean() : null;
  if (!ad) throw new HttpError(404, "Ad not found");
  if (String(ad.userId) === buyerId) throw new HttpError(400, "You can't message yourself about your own ad");
  // Atomic upsert: concurrent requests converge on one conversation per (ad, buyer).
  const c = await Conversation.findOneAndUpdate(
    { adId, buyerId },
    { $setOnInsert: { adId, buyerId, sellerId: ad.userId, msgSeq: 0 } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return String(c._id);
}

async function memberOf(userId: string, id: string): Promise<IConversation> {
  const c = isId(id) ? await Conversation.findById(id).lean() : null;
  // 404 rather than 403 so conversation IDs can't be probed.
  if (!c || (String(c.buyerId) !== userId && String(c.sellerId) !== userId)) throw new HttpError(404, "Conversation not found");
  return c as IConversation;
}

export async function listConversations(userId: string): Promise<ConversationDto[]> {
  const rows = await Conversation.find({ $or: [{ buyerId: userId }, { sellerId: userId }] })
    .populate("adId", "title").populate("buyerId", "name").populate("sellerId", "name").lean();
  type P = { _id: unknown; adId: { _id: unknown; title: string } | null; buyerId: { _id: unknown; name: string }; sellerId: { _id: unknown; name: string };
    lastMessage: string | null; lastMessageAt: Date | null; createdAt: Date };
  return (rows as unknown as P[])
    .map((c): ConversationDto => {
      const isBuyer = String(c.buyerId._id) === userId;
      return {
        id: String(c._id), adId: String(c.adId?._id ?? ""), adTitle: c.adId?.title ?? "", other: (isBuyer ? c.sellerId : c.buyerId).name,
        lastMessage: c.lastMessage, lastAt: (c.lastMessageAt ?? c.createdAt).toISOString(), mine: isBuyer ? "buyer" : "seller",
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function getMessages(userId: string, id: string, afterSeq = 0): Promise<MessageDto[]> {
  await memberOf(userId, id);
  const rows = await Message.find({ conversationId: id, seq: { $gt: afterSeq } }).sort({ seq: 1 }).limit(200).lean();
  return rows.map(toDto);
}

export async function sendMessage(userId: string, id: string, text: string): Promise<MessageDto> {
  await memberOf(userId, id);
  const body = text.trim();
  if (!body || body.length > 2000) throw new HttpError(422, "Message must be 1–2000 characters");
  // $inc hands out a gap-free-enough, strictly increasing sequence number even under concurrency.
  const c = await Conversation.findOneAndUpdate({ _id: id }, { $inc: { msgSeq: 1 } }, { returnDocument: "after" }).lean();
  if (!c) throw new HttpError(404, "Conversation not found");
  const m = await Message.create({ conversationId: id, seq: c.msgSeq, senderId: userId, body });
  await Conversation.updateOne({ _id: id, msgSeq: { $lte: c.msgSeq } }, { $set: { lastMessage: body.slice(0, 200), lastMessageAt: m.createdAt } });
  return toDto(m);
}
