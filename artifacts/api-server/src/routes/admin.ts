import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db, chatConversationsTable, chatMessagesTable, ordersTable, supportAccountsTable } from "@workspace/db";
import {
  GetAdminSessionResponse,
  ListAdminConversationsResponse,
  ListAdminMessagesParams,
  ListAdminMessagesResponse,
  SendAdminMessageBody,
  SendAdminMessageParams,
  SendAdminMessageResponse,
  TranslateAdminMessagesBody,
  TranslateAdminMessagesParams,
  TranslateAdminMessagesResponse,
  UpdateAdminConversationBody,
  UpdateAdminConversationParams,
  UpdateAdminConversationResponse,
} from "@workspace/api-zod";
import { cleanText, limitByIp, requireSameOrigin } from "../lib/security";
import { customerLanguage, translateMessages, translateReply } from "../lib/chatTranslate";
import { adminSessionOf, endAdminSession, requireAdmin } from "../lib/adminAuth";

// The admin's session and the support inbox. The admin signs in on the customer sign-in
// form (see routes/account.ts); the emailed code there also opens the admin session.

const MINUTE = 60_000;

const router: IRouter = Router();

/* ---------------- session ---------------- */

router.get("/admin/session", requireAdmin, (_req, res): void => {
  const session = adminSessionOf(res);
  res.json(GetAdminSessionResponse.parse({ email: session.account.email, expiresAt: session.expiresAt }));
});

router.delete("/admin/session", requireSameOrigin, async (req, res): Promise<void> => {
  await endAdminSession(req, res);
  res.status(204).end();
});

/* ---------------- inbox ---------------- */

// Drizzle prints columns unqualified in single-table selects, which would bind
// to the message table inside these subqueries, so the outer columns are spelled out.
const outerId = sql.raw(`"chat_conversations"."id"`);
const outerLastReadId = sql.raw(`"chat_conversations"."admin_last_read_id"`);
const outerAccountId = sql.raw(`"chat_conversations"."account_id"`);

// The customer's newest order on this site, else the Whop order their chat was opened with.
const latestOrder = (column: "code" | "package_name" | "sample_name") =>
  sql`(select o.${sql.raw(column)} from ${ordersTable} o where o.account_id = ${outerAccountId} order by o.created_at desc limit 1)`;

const conversationColumns = {
  id: chatConversationsTable.id,
  name: chatConversationsTable.name,
  email: chatConversationsTable.email,
  orderCode: sql<string | null>`coalesce(${latestOrder("code")}, (select a.order_id from ${supportAccountsTable} a where a.id = ${outerAccountId}))`,
  packageName: sql<string | null>`coalesce(${latestOrder("package_name")}, (select a.package_name from ${supportAccountsTable} a where a.id = ${outerAccountId}))`,
  sampleName: sql<string | null>`case when ${latestOrder("code")} is not null then ${latestOrder("sample_name")} else (select a.sample_name from ${supportAccountsTable} a where a.id = ${outerAccountId}) end`,
  lang: chatConversationsTable.lang,
  status: chatConversationsTable.status,
  createdAt: chatConversationsTable.createdAt,
  lastMessageAt: chatConversationsTable.lastMessageAt,
  lastMessage: sql<string | null>`(select left(m.body, 160) from ${chatMessagesTable} m where m.conversation_id = ${outerId} order by m.id desc limit 1)`,
  lastSender: sql<"visitor" | "admin" | null>`(select m.sender from ${chatMessagesTable} m where m.conversation_id = ${outerId} order by m.id desc limit 1)`,
  unread: sql<number>`(select count(*)::int from ${chatMessagesTable} m where m.conversation_id = ${outerId} and m.sender = 'visitor' and m.id > ${outerLastReadId})`,
};

router.get("/admin/conversations", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select(conversationColumns)
    .from(chatConversationsTable)
    .orderBy(desc(chatConversationsTable.lastMessageAt))
    .limit(200);
  res.json(ListAdminConversationsResponse.parse(rows));
});

router.patch(
  "/admin/conversations/:id",
  requireSameOrigin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateAdminConversationParams.safeParse(req.params);
    const body = UpdateAdminConversationBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [updated] = await db
      .update(chatConversationsTable)
      .set({ status: body.data.status })
      .where(eq(chatConversationsTable.id, params.data.id))
      .returning({ id: chatConversationsTable.id });
    if (!updated) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const [row] = await db
      .select(conversationColumns)
      .from(chatConversationsTable)
      .where(eq(chatConversationsTable.id, updated.id));
    res.json(UpdateAdminConversationResponse.parse(row));
  },
);

const messageColumns = {
  id: chatMessagesTable.id,
  sender: chatMessagesTable.sender,
  body: chatMessagesTable.body,
  createdAt: chatMessagesTable.createdAt,
  lang: chatMessagesTable.lang,
  translation: chatMessagesTable.translation,
  translationLang: chatMessagesTable.translationLang,
  translationStatus: chatMessagesTable.translationStatus,
};

router.get("/admin/conversations/:id/messages", requireAdmin, async (req, res): Promise<void> => {
  const params = ListAdminMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [conversation] = await db
    .select({ id: chatConversationsTable.id, lastRead: chatConversationsTable.adminLastReadId })
    .from(chatConversationsTable)
    .where(eq(chatConversationsTable.id, params.data.id));
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const newestFirst = await db
    .select(messageColumns)
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.conversationId, conversation.id))
    .orderBy(desc(chatMessagesTable.id))
    .limit(500);
  const newestId = newestFirst[0]?.id ?? 0;
  if (newestId > conversation.lastRead) {
    await db
      .update(chatConversationsTable)
      .set({ adminLastReadId: newestId })
      .where(
        and(
          eq(chatConversationsTable.id, conversation.id),
          lt(chatConversationsTable.adminLastReadId, newestId),
        ),
      );
  }
  res.json(ListAdminMessagesResponse.parse(newestFirst.reverse()));
});

router.post(
  "/admin/conversations/:id/messages",
  requireSameOrigin,
  requireAdmin,
  limitByIp("admin-send", MINUTE, 60),
  async (req, res): Promise<void> => {
    const params = SendAdminMessageParams.safeParse(req.params);
    const parsed = SendAdminMessageBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const body = cleanText(parsed.data.message);
    if (!body) {
      res.status(400).json({ error: "Message is empty" });
      return;
    }
    const [target] = await db
      .select({ id: chatConversationsTable.id, lang: chatConversationsTable.lang })
      .from(chatConversationsTable)
      .where(eq(chatConversationsTable.id, params.data.id));
    if (!target) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    // The owner writes Vietnamese; the customer reads the reply in their own language.
    // Translated before the transaction so no row lock is held while waiting on it.
    const translated = await translateReply(body, await customerLanguage(target.id, target.lang));
    const message = await db.transaction(async (tx) => {
      const [conversation] = await tx
        .select({ id: chatConversationsTable.id })
        .from(chatConversationsTable)
        .where(eq(chatConversationsTable.id, target.id))
        .for("update");
      if (!conversation) return null;
      const [created] = await tx
        .insert(chatMessagesTable)
        .values({ conversationId: conversation.id, sender: "admin", body, ...translated })
        .returning(messageColumns);
      // Replying reopens a closed conversation.
      await tx
        .update(chatConversationsTable)
        .set({ lastMessageAt: sql`now()`, status: "open" })
        .where(eq(chatConversationsTable.id, conversation.id));
      return created;
    });
    if (!message) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.status(201).json(SendAdminMessageResponse.parse(message));
  },
);

router.post(
  "/admin/conversations/:id/translations",
  requireSameOrigin,
  requireAdmin,
  limitByIp("admin-translate", MINUTE, 40),
  async (req, res): Promise<void> => {
    const params = TranslateAdminMessagesParams.safeParse(req.params);
    const parsed = TranslateAdminMessagesBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [conversation] = await db
      .select({ id: chatConversationsTable.id, lang: chatConversationsTable.lang })
      .from(chatConversationsTable)
      .where(eq(chatConversationsTable.id, params.data.id));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const ofThisConversation = and(
      eq(chatMessagesTable.conversationId, conversation.id),
      inArray(chatMessagesTable.id, [...new Set(parsed.data.messageIds)]),
    );
    const asked = await db.select(messageColumns).from(chatMessagesTable).where(ofThisConversation);
    const todo = asked.filter((m) => m.translationStatus === null || m.translationStatus === "failed");
    if (todo.length) {
      const replyLang = todo.some((m) => m.sender === "admin" && !m.translationLang)
        ? await customerLanguage(conversation.id, conversation.lang)
        : conversation.lang;
      await translateMessages(todo, replyLang);
    }
    const fresh = await db
      .select(messageColumns)
      .from(chatMessagesTable)
      .where(ofThisConversation)
      .orderBy(chatMessagesTable.id);
    res.json(TranslateAdminMessagesResponse.parse(fresh));
  },
);

export default router;
