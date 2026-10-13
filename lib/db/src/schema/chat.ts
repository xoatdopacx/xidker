import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// One conversation per visitor browser. The visitor is identified only by a
// random token kept in an httpOnly cookie; the database stores its SHA-256 hash.
export const chatConversationsTable = pgTable(
  "chat_conversations",
  {
    id: text("id").primaryKey(),
    visitorTokenHash: text("visitor_token_hash").notNull().unique(),
    name: text("name"),
    email: text("email"),
    lang: text("lang").notNull(),
    status: text("status", { enum: ["open", "closed"] })
      .notNull()
      .default("open"),
    // Keyed hash of the visitor IP, only used for abuse limits.
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Highest message id the admin has opened; later visitor messages are unread.
    adminLastReadId: integer("admin_last_read_id").notNull().default(0),
  },
  (t) => [
    index("chat_conversations_last_message_idx").on(t.lastMessageAt),
    index("chat_conversations_ip_created_idx").on(t.ipHash, t.createdAt),
  ],
);

export const chatMessagesTable = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => chatConversationsTable.id, { onDelete: "cascade" }),
    sender: text("sender", { enum: ["visitor", "admin"] }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chat_messages_conversation_idx").on(t.conversationId, t.id)],
);

export type ChatConversationRow = typeof chatConversationsTable.$inferSelect;
export type ChatMessageRow = typeof chatMessagesTable.$inferSelect;
