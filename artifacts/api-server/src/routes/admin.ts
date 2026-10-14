import { randomInt } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, count, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import {
  db,
  adminLoginChallengesTable,
  adminLoginEventsTable,
  adminSessionsTable,
  chatConversationsTable,
  chatMessagesTable,
  supportAccountsTable,
} from "@workspace/db";
import {
  GetAdminSessionResponse,
  ListAdminConversationsResponse,
  ListAdminMessagesParams,
  ListAdminMessagesResponse,
  RequestAdminCodeBody,
  RequestAdminCodeResponse,
  SendAdminMessageBody,
  SendAdminMessageParams,
  SendAdminMessageResponse,
  TranslateAdminMessagesBody,
  TranslateAdminMessagesParams,
  TranslateAdminMessagesResponse,
  UpdateAdminConversationBody,
  UpdateAdminConversationParams,
  UpdateAdminConversationResponse,
  VerifyAdminCodeBody,
  VerifyAdminCodeResponse,
} from "@workspace/api-zod";
import {
  cleanText,
  clientIpHash,
  cookieOptions,
  keyedHash,
  limitByIp,
  randomToken,
  readCookie,
  requireSameOrigin,
  safeEqual,
  sha256,
} from "../lib/security";
import { customerLanguage, translateMessages, translateReply } from "../lib/chatTranslate";
import {
  ADMIN_CHALLENGE_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  adminConfig,
  credentialHash,
  maskEmail,
  normalizeAdminToken,
  requireAdmin,
} from "../lib/adminAuth";
import { MailNotConfiguredError, sendMail } from "../lib/mailer";

const MINUTE = 60_000;
const CODE_TTL_MS = 10 * MINUTE;
const MAX_CODE_ATTEMPTS = 5;
// Hard limits, counted in the database so they hold across server instances.
const MAX_BAD_TOKENS_PER_ADDRESS_15_MIN = 5;
const MAX_BAD_TOKENS_SITEWIDE_15_MIN = 100;
const MAX_CODES_15_MIN = 5;
const MAX_CODES_PER_DAY = 30;
const MAX_BAD_CODES_15_MIN = 20;

type LoginEvent = (typeof adminLoginEventsTable.$inferInsert)["kind"];

const router: IRouter = Router();

async function countEvents(kind: LoginEvent, withinMs: number, ipHash?: string): Promise<number> {
  const conditions = [
    eq(adminLoginEventsTable.kind, kind),
    gt(adminLoginEventsTable.createdAt, new Date(Date.now() - withinMs)),
  ];
  if (ipHash) conditions.push(eq(adminLoginEventsTable.ipHash, ipHash));
  const [row] = await db
    .select({ n: count() })
    .from(adminLoginEventsTable)
    .where(and(...conditions));
  return row.n;
}

async function recordEvent(kind: LoginEvent, req: Request): Promise<void> {
  await db.insert(adminLoginEventsTable).values({ kind, ipHash: clientIpHash(req) });
}

function codeEmail(code: string) {
  const minutes = CODE_TTL_MS / MINUTE;
  const text = [
    `Mã xác nhận đăng nhập trang quản trị xidker: ${code}`,
    "",
    `Mã dùng được trong ${minutes} phút và chỉ dùng được một lần.`,
    "Nếu không phải bạn vừa đăng nhập, khóa quản trị của bạn đã bị người khác biết. Hãy đổi khóa quản trị ngay.",
  ].join("\n");
  const html = `<!doctype html><html lang="vi"><body style="margin:0;padding:24px;background:#f2efe6;font-family:Arial,Helvetica,sans-serif;color:#10241a">
<div style="max-width:420px;margin:0 auto;background:#ffffff;border:4px solid #1b2a1c;padding:24px">
<p style="margin:0 0 12px;font-size:15px">Mã xác nhận đăng nhập trang quản trị <b>xidker</b>:</p>
<p style="margin:0 0 16px;font-size:34px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace">${code}</p>
<p style="margin:0 0 8px;font-size:14px">Mã dùng được trong ${minutes} phút và chỉ dùng được một lần.</p>
<p style="margin:0;font-size:13px;color:#7a2a1a">Nếu không phải bạn vừa đăng nhập, khóa quản trị của bạn đã bị người khác biết. Hãy đổi khóa quản trị ngay.</p>
</div></body></html>`;
  return { subject: "Mã xác nhận đăng nhập quản trị xidker", text, html };
}

/* ---------------- sign-in ---------------- */

router.post(
  "/admin/login",
  requireSameOrigin,
  limitByIp("admin-login", 15 * MINUTE, 10),
  async (req, res): Promise<void> => {
    const parsed = RequestAdminCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const config = adminConfig();
    if (!config) {
      res.status(503).json({ error: "Admin sign-in is not set up" });
      return;
    }

    const ipHash = clientIpHash(req);
    const [fromAddress, sitewide] = await Promise.all([
      countEvents("bad_token", 15 * MINUTE, ipHash),
      countEvents("bad_token", 15 * MINUTE),
    ]);
    if (fromAddress >= MAX_BAD_TOKENS_PER_ADDRESS_15_MIN || sitewide >= MAX_BAD_TOKENS_SITEWIDE_15_MIN) {
      req.log.warn({ fromAddress, sitewide }, "Admin sign-in paused: too many wrong tokens");
      res.status(429).json({ error: "Too many wrong attempts, wait 15 minutes" });
      return;
    }
    if (!safeEqual(normalizeAdminToken(parsed.data.token), config.token)) {
      await recordEvent("bad_token", req);
      req.log.warn("Admin sign-in: wrong token");
      res.status(401).json({ error: "Wrong token" });
      return;
    }

    const [recentCodes, todayCodes] = await Promise.all([
      countEvents("code_sent", 15 * MINUTE),
      countEvents("code_sent", 24 * 60 * MINUTE),
    ]);
    if (recentCodes >= MAX_CODES_15_MIN || todayCodes >= MAX_CODES_PER_DAY) {
      req.log.warn({ recentCodes, todayCodes }, "Admin sign-in paused: too many codes sent");
      res.status(429).json({ error: "Too many codes sent, wait 15 minutes" });
      return;
    }

    const challengeId = randomToken();
    const idHash = sha256(challengeId);
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Only the newest code works: older unused ones are retired.
    await db
      .update(adminLoginChallengesTable)
      .set({ usedAt: new Date() })
      .where(isNull(adminLoginChallengesTable.usedAt));
    await db.insert(adminLoginChallengesTable).values({
      idHash,
      codeHash: keyedHash(`admin-code:${idHash}:${code}`),
      expiresAt,
    });

    try {
      await sendMail({ to: config.email, ...codeEmail(code) });
    } catch (err) {
      await db.delete(adminLoginChallengesTable).where(eq(adminLoginChallengesTable.idHash, idHash));
      if (err instanceof MailNotConfiguredError) {
        req.log.error({ reason: err.message }, "Admin code not sent: email is not set up");
        res.status(503).json({ error: "Email sending is not set up" });
      } else {
        req.log.error({ err }, "Admin code not sent: email failed");
        res.status(503).json({ error: "Could not send the code email" });
      }
      return;
    }

    await recordEvent("code_sent", req);
    req.log.info("Admin sign-in code sent");
    res.cookie(ADMIN_CHALLENGE_COOKIE, challengeId, cookieOptions(CODE_TTL_MS));
    res
      .status(202)
      .json(RequestAdminCodeResponse.parse({ sentTo: maskEmail(config.email), expiresAt }));
  },
);

router.post(
  "/admin/login/verify",
  requireSameOrigin,
  limitByIp("admin-verify", 15 * MINUTE, 20),
  async (req, res): Promise<void> => {
    const parsed = VerifyAdminCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const config = adminConfig();
    if (!config) {
      res.status(503).json({ error: "Admin sign-in is not set up" });
      return;
    }
    const challengeId = readCookie(req, ADMIN_CHALLENGE_COOKIE);
    if (!challengeId) {
      res.status(401).json({ error: "No code was requested in this browser" });
      return;
    }
    if ((await countEvents("bad_code", 15 * MINUTE)) >= MAX_BAD_CODES_15_MIN) {
      req.log.warn("Admin sign-in paused: too many wrong codes");
      res.status(429).json({ error: "Too many wrong codes, wait 15 minutes" });
      return;
    }

    const idHash = sha256(challengeId);
    // Count the attempt before checking, atomically, so parallel guesses
    // cannot exceed the limit.
    const [challenge] = await db
      .update(adminLoginChallengesTable)
      .set({ attempts: sql`${adminLoginChallengesTable.attempts} + 1` })
      .where(
        and(
          eq(adminLoginChallengesTable.idHash, idHash),
          isNull(adminLoginChallengesTable.usedAt),
          gt(adminLoginChallengesTable.expiresAt, new Date()),
          lt(adminLoginChallengesTable.attempts, MAX_CODE_ATTEMPTS),
        ),
      )
      .returning();
    if (!challenge) {
      res.clearCookie(ADMIN_CHALLENGE_COOKIE, cookieOptions());
      res.status(429).json({ error: "This code expired or was used up, request a new one" });
      return;
    }
    if (!safeEqual(keyedHash(`admin-code:${idHash}:${parsed.data.code}`), challenge.codeHash)) {
      await recordEvent("bad_code", req);
      req.log.warn({ attempts: challenge.attempts }, "Admin sign-in: wrong code");
      res.status(401).json({ error: "Wrong code" });
      return;
    }
    const [claimed] = await db
      .update(adminLoginChallengesTable)
      .set({ usedAt: new Date() })
      .where(and(eq(adminLoginChallengesTable.idHash, idHash), isNull(adminLoginChallengesTable.usedAt)))
      .returning({ idHash: adminLoginChallengesTable.idHash });
    if (!claimed) {
      res.status(429).json({ error: "This code expired or was used up, request a new one" });
      return;
    }

    const sessionToken = randomToken();
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);
    await db.insert(adminSessionsTable).values({
      tokenHash: sha256(sessionToken),
      credentialHash: credentialHash(config.token),
      expiresAt,
    });
    await recordEvent("signed_in", req);

    // Housekeeping: drop expired sessions, old codes and month-old sign-in records.
    const now = new Date();
    await Promise.all([
      db.delete(adminSessionsTable).where(lt(adminSessionsTable.expiresAt, now)),
      db
        .delete(adminLoginChallengesTable)
        .where(lt(adminLoginChallengesTable.expiresAt, new Date(now.getTime() - 24 * 60 * MINUTE))),
      db
        .delete(adminLoginEventsTable)
        .where(lt(adminLoginEventsTable.createdAt, new Date(now.getTime() - 30 * 24 * 60 * MINUTE))),
    ]);

    req.log.info("Admin signed in");
    res.clearCookie(ADMIN_CHALLENGE_COOKIE, cookieOptions());
    res.cookie(ADMIN_SESSION_COOKIE, sessionToken, cookieOptions(ADMIN_SESSION_TTL_MS));
    res.json(VerifyAdminCodeResponse.parse({ expiresAt }));
  },
);

router.get("/admin/session", requireAdmin, (_req, res): void => {
  res.json(GetAdminSessionResponse.parse({ expiresAt: res.locals.adminSessionExpiresAt }));
});

router.delete("/admin/session", requireSameOrigin, async (req, res): Promise<void> => {
  const token = readCookie(req, ADMIN_SESSION_COOKIE);
  if (token) {
    await db.delete(adminSessionsTable).where(eq(adminSessionsTable.tokenHash, sha256(token)));
  }
  res.clearCookie(ADMIN_SESSION_COOKIE, cookieOptions());
  res.status(204).end();
});

/* ---------------- inbox ---------------- */

// Drizzle prints columns unqualified in single-table selects, which would bind
// to the message table inside these subqueries, so the outer columns are spelled out.
const outerId = sql.raw(`"chat_conversations"."id"`);
const outerLastReadId = sql.raw(`"chat_conversations"."admin_last_read_id"`);
const outerAccountId = sql.raw(`"chat_conversations"."account_id"`);

const conversationColumns = {
  id: chatConversationsTable.id,
  name: chatConversationsTable.name,
  email: chatConversationsTable.email,
  orderId: sql<string | null>`(select a.order_id from ${supportAccountsTable} a where a.id = ${outerAccountId})`,
  packageName: sql<string | null>`(select a.package_name from ${supportAccountsTable} a where a.id = ${outerAccountId})`,
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
