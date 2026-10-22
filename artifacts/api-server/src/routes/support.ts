import { randomUUID } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import {
  db,
  chatConversationsTable,
  chatMessagesTable,
  type ChatConversationRow,
  type SupportAccountRow,
} from "@workspace/db";
import { GetSupportThreadResponse, SendSupportMessageBody, SendSupportMessageResponse } from "@workspace/api-zod";
import { cleanText, limitByIp, requireSameOrigin } from "../lib/security";
import { accountOf, canChat, requireAccount } from "../lib/accounts";
import { fail } from "../lib/http";

// The support chat of a signed-in customer. It opens once the account has placed an order
// (or bought on Whop before), so the inbox only holds real customers.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const MAX_MESSAGES_PER_10_MIN = 30;
const MAX_MESSAGES_PER_DAY = 300;

const router: IRouter = Router();

async function requireChat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!(await canChat(accountOf(res)))) {
    fail(res, 403, "no_order", "The chat opens after your first order");
    return;
  }
  next();
}

/* ---------------- conversation ---------------- */

async function threadOf(conversation: ChatConversationRow) {
  const newestFirst = await db
    .select({
      id: chatMessagesTable.id,
      sender: chatMessagesTable.sender,
      body: chatMessagesTable.body,
      createdAt: chatMessagesTable.createdAt,
      translation: chatMessagesTable.translation,
      translationStatus: chatMessagesTable.translationStatus,
    })
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.conversationId, conversation.id))
    .orderBy(desc(chatMessagesTable.id))
    .limit(200);
  // Replies are written in Vietnamese; the customer reads them translated when that worked.
  const messages = newestFirst.reverse().map(({ translation, translationStatus, ...m }) =>
    m.sender === "admin" && translationStatus === "done" && translation
      ? { ...m, body: translation, translated: true }
      : { ...m, translated: false },
  );
  return { status: conversation.status, messages };
}

/** The account's conversation id, created on its first message. */
async function conversationIdFor(account: SupportAccountRow, lang: string): Promise<string> {
  const [created] = await db
    .insert(chatConversationsTable)
    .values({ id: randomUUID(), accountId: account.id, email: account.email, lang })
    .onConflictDoNothing({ target: chatConversationsTable.accountId })
    .returning({ id: chatConversationsTable.id });
  if (created) return created.id;
  const [existing] = await db
    .select({ id: chatConversationsTable.id })
    .from(chatConversationsTable)
    .where(eq(chatConversationsTable.accountId, account.id));
  return existing.id;
}

/** Null when this conversation may take another customer message, else the reason. */
async function customerMessageLimit(conversationId: string): Promise<string | null> {
  const since = (ms: number) => new Date(Date.now() - ms);
  const countSince = (ms: number) =>
    db
      .select({ n: count() })
      .from(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.conversationId, conversationId),
          eq(chatMessagesTable.sender, "visitor"),
          gt(chatMessagesTable.createdAt, since(ms)),
        ),
      );
  const [[recent], [today]] = await Promise.all([countSince(10 * MINUTE), countSince(24 * HOUR)]);
  if (recent.n >= MAX_MESSAGES_PER_10_MIN) return "Too many messages, wait a few minutes";
  if (today.n >= MAX_MESSAGES_PER_DAY) return "Too many messages today, try again tomorrow";
  return null;
}

router.get("/support/thread", requireAccount, requireChat, async (_req, res): Promise<void> => {
  const account = accountOf(res);
  const [conversation] = await db
    .select()
    .from(chatConversationsTable)
    .where(eq(chatConversationsTable.accountId, account.id))
    .limit(1);
  const thread = conversation ? await threadOf(conversation) : { status: "open", messages: [] };
  res.json(GetSupportThreadResponse.parse(thread));
});

router.post(
  "/support/thread/messages",
  requireSameOrigin,
  requireAccount,
  requireChat,
  limitByIp("support-send", MINUTE, 20),
  async (req, res): Promise<void> => {
    const parsed = SendSupportMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const body = cleanText(parsed.data.message);
    if (!body) {
      res.status(400).json({ error: "Message is empty" });
      return;
    }
    const account = accountOf(res);
    const conversationId = await conversationIdFor(account, parsed.data.lang);
    const limited = await customerMessageLimit(conversationId);
    if (limited) {
      res.status(429).json({ error: limited });
      return;
    }
    const message = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(chatMessagesTable)
        .values({ conversationId, sender: "visitor", body })
        .returning({
          id: chatMessagesTable.id,
          sender: chatMessagesTable.sender,
          body: chatMessagesTable.body,
          createdAt: chatMessagesTable.createdAt,
        });
      // Writing again reopens a closed conversation. The site language is kept up to date:
      // replies go out in it until a message of theirs shows the language they write in.
      await tx
        .update(chatConversationsTable)
        .set({ lastMessageAt: sql`now()`, status: "open", lang: parsed.data.lang })
        .where(eq(chatConversationsTable.id, conversationId));
      return created;
    });
    res.status(201).json(SendSupportMessageResponse.parse({ ...message, translated: false }));
  },
);

export default router;
