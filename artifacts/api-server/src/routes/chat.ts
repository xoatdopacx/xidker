import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import {
  db,
  chatConversationsTable,
  chatMessagesTable,
  type ChatConversationRow,
} from "@workspace/db";
import {
  GetChatThreadResponse,
  SendChatMessageBody,
  SendChatMessageResponse,
  StartChatThreadBody,
  StartChatThreadResponse,
} from "@workspace/api-zod";
import {
  cleanLine,
  cleanText,
  clientIpHash,
  cookieOptions,
  limitByIp,
  randomToken,
  readCookie,
  requireSameOrigin,
  sha256,
} from "../lib/security";

// The visitor's only credential: a random token in an httpOnly cookie.
const CHAT_COOKIE = "__Host-xid_chat";
const CHAT_COOKIE_MAX_AGE_MS = 180 * 24 * 60 * 60_000;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
// Hard limits, counted in the database so they hold across server instances.
const MAX_NEW_PER_ADDRESS_PER_HOUR = 5;
const MAX_NEW_SITEWIDE_PER_HOUR = 300;
const MAX_MESSAGES_PER_10_MIN = 30;
const MAX_MESSAGES_PER_DAY = 300;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router: IRouter = Router();

async function findConversation(req: Request): Promise<ChatConversationRow | null> {
  const token = readCookie(req, CHAT_COOKIE);
  if (!token) return null;
  const [conversation] = await db
    .select()
    .from(chatConversationsTable)
    .where(eq(chatConversationsTable.visitorTokenHash, sha256(token)))
    .limit(1);
  return conversation ?? null;
}

async function threadOf(conversation: ChatConversationRow) {
  const newestFirst = await db
    .select({
      id: chatMessagesTable.id,
      sender: chatMessagesTable.sender,
      body: chatMessagesTable.body,
      createdAt: chatMessagesTable.createdAt,
    })
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.conversationId, conversation.id))
    .orderBy(desc(chatMessagesTable.id))
    .limit(200);
  return {
    status: conversation.status,
    name: conversation.name,
    messages: newestFirst.reverse(),
  };
}

/** Null when this conversation may take another visitor message, else the reason. */
async function visitorMessageLimit(conversationId: string): Promise<string | null> {
  const since = (ms: number) => new Date(Date.now() - ms);
  const [[recent], [today]] = await Promise.all([
    db
      .select({ n: count() })
      .from(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.conversationId, conversationId),
          eq(chatMessagesTable.sender, "visitor"),
          gt(chatMessagesTable.createdAt, since(10 * MINUTE)),
        ),
      ),
    db
      .select({ n: count() })
      .from(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.conversationId, conversationId),
          eq(chatMessagesTable.sender, "visitor"),
          gt(chatMessagesTable.createdAt, since(24 * HOUR)),
        ),
      ),
  ]);
  if (recent.n >= MAX_MESSAGES_PER_10_MIN) return "Too many messages, wait a few minutes";
  if (today.n >= MAX_MESSAGES_PER_DAY) return "Too many messages today, try again tomorrow";
  return null;
}

async function addVisitorMessage(conversationId: string, body: string) {
  return db.transaction(async (tx) => {
    const [message] = await tx
      .insert(chatMessagesTable)
      .values({ conversationId, sender: "visitor", body })
      .returning({
        id: chatMessagesTable.id,
        sender: chatMessagesTable.sender,
        body: chatMessagesTable.body,
        createdAt: chatMessagesTable.createdAt,
      });
    // A visitor writing again reopens a closed conversation.
    await tx
      .update(chatConversationsTable)
      .set({ lastMessageAt: sql`now()`, status: "open" })
      .where(eq(chatConversationsTable.id, conversationId));
    return message;
  });
}

router.get("/chat/thread", async (req, res): Promise<void> => {
  const conversation = await findConversation(req);
  if (!conversation) {
    res.status(404).json({ error: "This browser has no conversation" });
    return;
  }
  res.json(GetChatThreadResponse.parse(await threadOf(conversation)));
});

router.post(
  "/chat/thread",
  requireSameOrigin,
  limitByIp("chat-start", 10 * MINUTE, 10),
  async (req, res): Promise<void> => {
    const parsed = StartChatThreadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    // Hidden field: people never see it, form-filling bots do.
    if (parsed.data.website?.trim()) {
      req.log.warn("Chat start rejected: hidden field was filled");
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const body = cleanText(parsed.data.message);
    const name = cleanLine(parsed.data.name ?? "") || null;
    const email = cleanLine(parsed.data.email ?? "") || null;
    if (!body) {
      res.status(400).json({ error: "Message is empty" });
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Email address is not valid" });
      return;
    }

    // Same browser starting again: keep the one conversation.
    const existing = await findConversation(req);
    if (existing) {
      const limited = await visitorMessageLimit(existing.id);
      if (limited) {
        res.status(429).json({ error: limited });
        return;
      }
      await addVisitorMessage(existing.id, body);
      const [fresh] = await db
        .select()
        .from(chatConversationsTable)
        .where(eq(chatConversationsTable.id, existing.id));
      res.status(201).json(StartChatThreadResponse.parse(await threadOf(fresh)));
      return;
    }

    const ipHash = clientIpHash(req);
    const hourAgo = new Date(Date.now() - HOUR);
    const [[fromAddress], [sitewide]] = await Promise.all([
      db
        .select({ n: count() })
        .from(chatConversationsTable)
        .where(
          and(
            eq(chatConversationsTable.ipHash, ipHash),
            gt(chatConversationsTable.createdAt, hourAgo),
          ),
        ),
      db
        .select({ n: count() })
        .from(chatConversationsTable)
        .where(gt(chatConversationsTable.createdAt, hourAgo)),
    ]);
    if (fromAddress.n >= MAX_NEW_PER_ADDRESS_PER_HOUR || sitewide.n >= MAX_NEW_SITEWIDE_PER_HOUR) {
      req.log.warn(
        { fromAddress: fromAddress.n, sitewide: sitewide.n },
        "Chat start rejected: conversation limit reached",
      );
      res.status(429).json({ error: "Too many new conversations, try again later" });
      return;
    }

    const token = randomToken();
    const conversation = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(chatConversationsTable)
        .values({
          id: randomUUID(),
          visitorTokenHash: sha256(token),
          name,
          email,
          lang: parsed.data.lang,
          ipHash,
        })
        .returning();
      // now() is fixed for the whole transaction, so the conversation's
      // lastMessageAt equals this first message's createdAt.
      await tx
        .insert(chatMessagesTable)
        .values({ conversationId: created.id, sender: "visitor", body });
      return created;
    });

    req.log.info({ conversationId: conversation.id, lang: conversation.lang }, "Chat conversation started");
    res.cookie(CHAT_COOKIE, token, cookieOptions(CHAT_COOKIE_MAX_AGE_MS));
    res.status(201).json(StartChatThreadResponse.parse(await threadOf(conversation)));
  },
);

router.post(
  "/chat/thread/messages",
  requireSameOrigin,
  limitByIp("chat-send", MINUTE, 20),
  async (req, res): Promise<void> => {
    const parsed = SendChatMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const body = cleanText(parsed.data.message);
    if (!body) {
      res.status(400).json({ error: "Message is empty" });
      return;
    }
    const conversation = await findConversation(req);
    if (!conversation) {
      res.status(404).json({ error: "This browser has no conversation" });
      return;
    }
    const limited = await visitorMessageLimit(conversation.id);
    if (limited) {
      res.status(429).json({ error: limited });
      return;
    }
    const message = await addVisitorMessage(conversation.id, body);
    res.status(201).json(SendChatMessageResponse.parse(message));
  },
);

export default router;
