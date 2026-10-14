import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { supportAccountsTable } from "./support";

// One support conversation per customer account (see support.ts). Only
// customers who activated support chat with a paid order can write.
export const chatConversationsTable = pgTable(
  "chat_conversations",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .unique()
      .references(() => supportAccountsTable.id, { onDelete: "cascade" }),
    name: text("name"),
    email: text("email"),
    lang: text("lang").notNull(),
    status: text("status", { enum: ["open", "closed"] })
      .notNull()
      .default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Highest message id the admin has opened; later customer messages are unread.
    adminLastReadId: integer("admin_last_read_id").notNull().default(0),
  },
  (t) => [index("chat_conversations_last_message_idx").on(t.lastMessageAt)],
);

export const chatMessagesTable = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => chatConversationsTable.id, { onDelete: "cascade" }),
    // "visitor" is the customer.
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
