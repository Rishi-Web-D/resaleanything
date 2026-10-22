import mongoose, { Schema, Types, type Model } from "mongoose";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { config } from "./config";
import { SEED_ADS } from "./seed-data";

export interface IUser { _id: Types.ObjectId; name: string; email: string; phone: string; passwordHash: string; createdAt: Date }
export interface ISession { _id: string; userId: Types.ObjectId; expiresAt: Date }
export interface IAd {
  _id: Types.ObjectId; userId: Types.ObjectId; title: string; description: string; price: number; category: string;
  condition: string; city: string; status: "active" | "sold"; featured: boolean; images: string[]; createdAt: Date;
}
export interface IFavorite { userId: Types.ObjectId; adId: Types.ObjectId; createdAt: Date }
export interface IConversation {
  _id: Types.ObjectId; adId: Types.ObjectId; buyerId: Types.ObjectId; sellerId: Types.ObjectId;
  msgSeq: number; lastMessage: string | null; lastMessageAt: Date | null; createdAt: Date;
}
export interface IMessage { _id: Types.ObjectId; conversationId: Types.ObjectId; seq: number; senderId: Types.ObjectId; body: string; createdAt: Date }

const ref = (to: string, extra = {}) => ({ type: Schema.Types.ObjectId, ref: to, required: true, ...extra });
const created = { timestamps: { createdAt: true, updatedAt: false } } as const;

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
}, created);

// The session id is the SHA-256 of the cookie token. MongoDB's TTL monitor deletes expired sessions.
const sessionSchema = new Schema<ISession>({
  _id: { type: String },
  userId: ref("User", { index: true }),
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { versionKey: false });

const adSchema = new Schema<IAd>({
  userId: ref("User"),
  title: { type: String, required: true, maxlength: 80 },
  description: { type: String, required: true, maxlength: 4000 },
  price: { type: Number, required: true, min: 1, validate: Number.isInteger },
  category: { type: String, required: true },
  condition: { type: String, required: true },
  city: { type: String, required: true },
  status: { type: String, enum: ["active", "sold"], default: "active" },
  featured: { type: Boolean, default: false },
  images: { type: [String], default: [] },
}, created);
adSchema.index({ status: 1, category: 1, createdAt: -1 });
adSchema.index({ status: 1, createdAt: -1 });
adSchema.index({ userId: 1, createdAt: -1 });

const favoriteSchema = new Schema<IFavorite>({ userId: ref("User"), adId: ref("Ad", { index: true }) }, { ...created, versionKey: false });
favoriteSchema.index({ userId: 1, adId: 1 }, { unique: true });

const conversationSchema = new Schema<IConversation>({
  adId: ref("Ad"),
  buyerId: ref("User", { index: true }),
  sellerId: ref("User", { index: true }),
  msgSeq: { type: Number, default: 0 }, // per-conversation message counter: gives a total order for polling
  lastMessage: { type: String, default: null },
  lastMessageAt: { type: Date, default: null },
}, created);
conversationSchema.index({ adId: 1, buyerId: 1 }, { unique: true });

const messageSchema = new Schema<IMessage>({
  conversationId: ref("Conversation"),
  seq: { type: Number, required: true },
  senderId: ref("User"),
  body: { type: String, required: true, maxlength: 2000 },
}, { ...created, versionKey: false });
messageSchema.index({ conversationId: 1, seq: 1 }, { unique: true });

const metaSchema = new Schema({ _id: String, at: Date }, { versionKey: false });

const model = <T>(name: string, s: Schema<T>) => (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, s);

export const User = model("User", userSchema);
export const Session = model("Session", sessionSchema);
export const Ad = model("Ad", adSchema);
export const Favorite = model("Favorite", favoriteSchema);
export const Conversation = model("Conversation", conversationSchema);
export const Message = model("Message", messageSchema);
const Meta = mongoose.models.Meta ?? mongoose.model("Meta", metaSchema);

export const isId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

/** Connects, builds indexes (unique constraints, TTL) and seeds demo ads into an empty database. */
export async function initDb() {
  mkdirSync(config.dataDir, { recursive: true });
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDb, serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 });
  await Promise.all([User, Session, Ad, Favorite, Conversation, Message].map((m) => m.init()));
  await seedIfEmpty();
}

export const dbHost = () => mongoose.connection.host;
export const disconnectDb = () => mongoose.disconnect();

// Seed sellers cannot log in: their password hash is not a valid scrypt value.
async function seedIfEmpty() {
  if ((await Ad.estimatedDocumentCount()) > 0) return;
  // A one-row lock so two instances starting together don't both seed.
  const prior = await Meta.findOneAndUpdate({ _id: "seed" }, { $setOnInsert: { at: new Date() } }, { upsert: true, returnDocument: "before" });
  if (prior) return;
  try {
    const users = new Map<string, Types.ObjectId>();
    const ads: Partial<IAd>[] = [];
    for (const a of SEED_ADS) {
      let uid = users.get(a.seller);
      if (!uid) {
        uid = (await User.create({ name: a.seller, email: `${a.seller.toLowerCase()}.${randomBytes(3).toString("hex")}@seed.invalid`, phone: a.phone, passwordHash: "!seed" }))._id;
        users.set(a.seller, uid);
      }
      ads.push({ userId: uid, title: a.title, description: a.description, price: a.price, category: a.category,
        condition: a.condition, city: a.city, featured: a.featured, createdAt: new Date(a.createdAt) });
    }
    await Ad.insertMany(ads);
  } catch (e) {
    await Meta.deleteOne({ _id: "seed" }); // let the next start retry
    throw e;
  }
}
