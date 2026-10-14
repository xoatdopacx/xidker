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
    // Language of the body: detected for customer messages, "vi" for replies; null while unknown.
    lang: text("lang"),
    // Machine translation shown next to the body: customer messages in Vietnamese
    // for the admin, replies in the customer's language (what the customer reads).
    translation: text("translation"),
    translationLang: text("translation_lang"),
    // null: not tried yet (customer messages are translated once the admin opens
    // them); "same": nothing to translate; "failed": the customer reads the original.
    translationStatus: text("translation_status", { enum: ["done", "same", "failed"] }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chat_messages_conversation_idx").on(t.conversationId, t.id)],
);

export type ChatConversationRow = typeof chatConversationsTable.$inferSelect;
export type ChatMessageRow = typeof chatMessagesTable.$inferSelect;
