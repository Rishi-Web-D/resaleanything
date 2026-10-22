import { DataTypes, Model, Sequelize, Transaction, type CreationOptional, type InferAttributes, type InferCreationAttributes, type ForeignKey } from "sequelize";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { SEED_ADS } from "../seed";

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare email: string;
  declare phone: string;
  declare passwordHash: string;
  declare createdAt: CreationOptional<Date>;
}
export class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  declare tokenHash: string;
  declare userId: ForeignKey<User["id"]>;
  declare expiresAt: number;
}
export class Ad extends Model<InferAttributes<Ad>, InferCreationAttributes<Ad>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User["id"]>;
  declare title: string;
  declare description: string;
  declare price: number;
  declare category: string;
  declare condition: string;
  declare city: string;
  declare status: CreationOptional<"active" | "sold">;
  declare featured: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare User?: User;
  declare AdImages?: AdImage[];
}
export class AdImage extends Model<InferAttributes<AdImage>, InferCreationAttributes<AdImage>> {
  declare id: CreationOptional<number>;
  declare adId: ForeignKey<Ad["id"]>;
  declare file: string;
  declare position: number;
}
export class Favorite extends Model<InferAttributes<Favorite>, InferCreationAttributes<Favorite>> {
  declare userId: ForeignKey<User["id"]>;
  declare adId: ForeignKey<Ad["id"]>;
}
export class Conversation extends Model<InferAttributes<Conversation>, InferCreationAttributes<Conversation>> {
  declare id: CreationOptional<number>;
  declare adId: ForeignKey<Ad["id"]>;
  declare buyerId: ForeignKey<User["id"]>;
  declare sellerId: ForeignKey<User["id"]>;
  declare createdAt: CreationOptional<Date>;
}
export class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id: CreationOptional<number>;
  declare conversationId: ForeignKey<Conversation["id"]>;
  declare senderId: ForeignKey<User["id"]>;
  declare body: string;
  declare createdAt: CreationOptional<Date>;
}

// modelName is explicit on every model: Sequelize otherwise derives it from the class name,
// which production minification mangles (breaking aliases such as `Ad.title`).
const T = DataTypes;

function init(): Sequelize {
  mkdirSync(DATA_DIR, { recursive: true });
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.DB_STORAGE ?? path.join(DATA_DIR, "resale.db"),
    logging: false,
    define: { underscored: true },
  });
  const id = { type: T.INTEGER, primaryKey: true, autoIncrement: true } as const;

  User.init({ id, name: { type: T.STRING, allowNull: false }, email: { type: T.STRING, allowNull: false, unique: true },
    phone: { type: T.STRING, allowNull: false }, passwordHash: { type: T.STRING, allowNull: false }, createdAt: T.DATE }, { sequelize, modelName: "User", tableName: "users", updatedAt: false });
  Session.init({ tokenHash: { type: T.STRING, primaryKey: true }, expiresAt: { type: T.BIGINT, allowNull: false } },
    { sequelize, modelName: "Session", tableName: "sessions", timestamps: false });
  Ad.init({ id, title: { type: T.STRING(80), allowNull: false }, description: { type: T.TEXT, allowNull: false },
    price: { type: T.INTEGER, allowNull: false, validate: { min: 1 } }, category: { type: T.STRING, allowNull: false },
    condition: { type: T.STRING, allowNull: false }, city: { type: T.STRING, allowNull: false },
    status: { type: T.ENUM("active", "sold"), allowNull: false, defaultValue: "active" },
    featured: { type: T.BOOLEAN, allowNull: false, defaultValue: false }, createdAt: T.DATE },
    { sequelize, modelName: "Ad", tableName: "ads", updatedAt: false, indexes: [{ fields: ["category", "status", "created_at"] }, { fields: ["user_id"] }] });
  AdImage.init({ id, file: { type: T.STRING, allowNull: false }, position: { type: T.INTEGER, allowNull: false, defaultValue: 0 } },
    { sequelize, modelName: "AdImage", tableName: "ad_images", timestamps: false });
  Favorite.init({ userId: { type: T.INTEGER, primaryKey: true }, adId: { type: T.INTEGER, primaryKey: true } }, { sequelize, modelName: "Favorite", tableName: "favorites", timestamps: false });
  Conversation.init({ id, createdAt: T.DATE }, { sequelize, modelName: "Conversation", tableName: "conversations", updatedAt: false,
    indexes: [{ unique: true, fields: ["ad_id", "buyer_id"] }] });
  Message.init({ id, body: { type: T.TEXT, allowNull: false }, createdAt: T.DATE },
    { sequelize, modelName: "Message", tableName: "messages", updatedAt: false, indexes: [{ fields: ["conversation_id", "id"] }] });

  const cascade = { onDelete: "CASCADE", foreignKey: { allowNull: false } } as const;
  User.hasMany(Session, { ...cascade, foreignKey: { name: "userId", allowNull: false } }); Session.belongsTo(User, { foreignKey: "userId" });
  User.hasMany(Ad, { ...cascade, foreignKey: { name: "userId", allowNull: false } }); Ad.belongsTo(User, { foreignKey: "userId" });
  Ad.hasMany(AdImage, { ...cascade, foreignKey: { name: "adId", allowNull: false } }); AdImage.belongsTo(Ad, { foreignKey: "adId" });
  Favorite.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });
  Favorite.belongsTo(Ad, { foreignKey: "adId", onDelete: "CASCADE" });
  Ad.hasMany(Favorite, { foreignKey: "adId", onDelete: "CASCADE" });
  Ad.hasMany(Conversation, { ...cascade, foreignKey: { name: "adId", allowNull: false } }); Conversation.belongsTo(Ad, { foreignKey: "adId" });
  Conversation.belongsTo(User, { as: "buyer", foreignKey: { name: "buyerId", allowNull: false }, onDelete: "CASCADE" });
  Conversation.belongsTo(User, { as: "seller", foreignKey: { name: "sellerId", allowNull: false }, onDelete: "CASCADE" });
  Conversation.hasMany(Message, { ...cascade, foreignKey: { name: "conversationId", allowNull: false } }); Message.belongsTo(Conversation, { foreignKey: "conversationId" });
  Message.belongsTo(User, { as: "sender", foreignKey: { name: "senderId", allowNull: false }, onDelete: "CASCADE" });
  return sequelize;
}

async function boot(): Promise<Sequelize> {
  const sequelize = init();
  // Pages and route handlers are bundled separately, so this module can be instantiated
  // more than once per process. Each instance owns its models and connection to the same
  // SQLite file; the busy timeout lets them share it, and seeding is atomic.
  sequelize.addHook("afterConnect", (conn: unknown) => {
    (conn as { run(sql: string): void }).run("PRAGMA busy_timeout = 10000");
  });
  await sequelize.query("PRAGMA journal_mode = WAL");
  await sequelize.sync();
  await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    if ((await Ad.count({ transaction })) === 0) await seed(transaction);
  });
  return sequelize;
}

// Seed sellers cannot log in: their password hash is not a valid scrypt value.
async function seed(transaction: Transaction) {
  const users = new Map<string, User>();
  for (const a of SEED_ADS) {
    let u = users.get(a.seller);
    if (!u) {
      u = await User.create({ name: a.seller, email: `${a.seller.toLowerCase()}.${randomBytes(3).toString("hex")}@seed.invalid`, phone: a.phone ?? "9800000000", passwordHash: "!seed" }, { transaction });
      users.set(a.seller, u);
    }
    await Ad.create({ userId: u.id, title: a.title, description: a.description, price: a.price, category: a.category,
      condition: a.condition, city: a.city, featured: !!a.featured, createdAt: new Date(a.createdAt) }, { transaction });
  }
}

let booting: Promise<Sequelize> | undefined;

/** Resolves once this module instance's models are initialised and the schema/seed exist. */
export function ready(): Promise<Sequelize> {
  return (booting ??= boot());
}
