import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, count, desc, eq, gt, or, sql } from "drizzle-orm";
import {
  db,
  chatConversationsTable,
  chatMessagesTable,
  checkoutSessionsTable,
  supportAccountsTable,
  supportAuthEventsTable,
  supportSessionsTable,
  type ChatConversationRow,
  type SupportAccountRow,
} from "@workspace/db";
import {
  ActivateSupportBody,
  ActivateSupportResponse,
  GetSupportSessionResponse,
  GetSupportThreadResponse,
  SendSupportMessageBody,
  SendSupportMessageResponse,
  SignInSupportBody,
  SignInSupportResponse,
} from "@workspace/api-zod";
import {
  cleanText,
  clientIpHash,
  cookieOptions,
  keyedHash,
  limitByIp,
  readCookie,
  requireSameOrigin,
  sha256,
} from "../lib/security";
import { dummyPasswordHash, hashPassword, verifyPassword } from "../lib/passwords";
import {
  SUPPORT_SESSION_COOKIE,
  readSupportSession,
  requireSupport,
  sendSignedOut,
  sessionView,
  setSupportCookie,
  startSupportSession,
  supportAccountOf,
} from "../lib/supportAuth";
import {
  findPaidPayment,
  findPaidPaymentById,
  listPackages,
  type VerifiedPayment,
} from "../lib/whopStore";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
// Hard limits, counted in the database so they hold across server instances.
const MAX_BAD_PASSWORDS_PER_EMAIL_15_MIN = 5;
const MAX_BAD_PASSWORDS_PER_ADDRESS_15_MIN = 20;
const MAX_BAD_ACTIVATIONS_PER_ADDRESS_HOUR = 10;
const MAX_BAD_ACTIVATIONS_SITEWIDE_HOUR = 300;
const MAX_MESSAGES_PER_10_MIN = 30;
const MAX_MESSAGES_PER_DAY = 300;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Whop payment id, shown as the order id on the thank-you page and in Whop.
const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]{6,60}$/;
// Our own checkout reference from the thank-you link (?ref=…).
const CHECKOUT_REF_RE = /^[A-Za-z0-9_-]{16,64}$/;

type AuthEvent = (typeof supportAuthEventsTable.$inferInsert)["kind"];

const router: IRouter = Router();

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function emailHash(email: string): string {
  return keyedHash(`support-email:${email}`);
}

async function countEvents(
  kind: AuthEvent,
  withinMs: number,
  filter: { ipHash?: string; emailHash?: string } = {},
): Promise<number> {
  const conditions = [
    eq(supportAuthEventsTable.kind, kind),
    gt(supportAuthEventsTable.createdAt, new Date(Date.now() - withinMs)),
  ];
  if (filter.ipHash) conditions.push(eq(supportAuthEventsTable.ipHash, filter.ipHash));
  if (filter.emailHash) conditions.push(eq(supportAuthEventsTable.emailHash, filter.emailHash));
  const [row] = await db
    .select({ n: count() })
    .from(supportAuthEventsTable)
    .where(and(...conditions));
  return row.n;
}

async function recordEvent(kind: AuthEvent, req: Request, email: string): Promise<void> {
  await db
    .insert(supportAuthEventsTable)
    .values({ kind, emailHash: emailHash(email), ipHash: clientIpHash(req) });
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Finds the paid Whop payment for what the customer typed as the order id:
 * the Whop payment id, or the reference from our thank-you link.
 */
async function resolveOrder(
  orderCode: string,
): Promise<{ payment: VerifiedPayment | null; packageName: string | null }> {
  if (PAYMENT_ID_RE.test(orderCode)) {
    return { payment: await findPaidPaymentById(orderCode), packageName: null };
  }
  if (CHECKOUT_REF_RE.test(orderCode)) {
    const [checkout] = await db
      .select()
      .from(checkoutSessionsTable)
      .where(eq(checkoutSessionsTable.ref, orderCode))
      .limit(1);
    if (!checkout) return { payment: null, packageName: null };
    return {
      payment: await findPaidPayment(checkout.checkoutConfigurationId),
      packageName: checkout.packageName,
    };
  }
  return { payment: null, packageName: null };
}

async function packageNameFor(payment: VerifiedPayment, fallback: string | null): Promise<string | null> {
  if (!payment.planId) return fallback;
  try {
    const packages = await listPackages("vi");
    return packages.find((p) => p.id === payment.planId)?.name ?? fallback;
  } catch {
    return fallback;
  }
}

/** The sample picked when the order was started on this site, for packages with a sample choice. */
async function sampleNameFor(payment: VerifiedPayment): Promise<string | null> {
  if (!payment.checkoutConfigurationId) return payment.sampleName;
  const [checkout] = await db
    .select({ sampleName: checkoutSessionsTable.sampleName })
    .from(checkoutSessionsTable)
    .where(eq(checkoutSessionsTable.checkoutConfigurationId, payment.checkoutConfigurationId))
    .limit(1);
  return checkout?.sampleName ?? payment.sampleName;
}

router.post(
  "/support/activate",
  requireSameOrigin,
  limitByIp("support-activate", 15 * MINUTE, 20),
  async (req, res): Promise<void> => {
    const parsed = ActivateSupportBody.safeParse(req.body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      res.status(400).json({
        error:
          field === "password"
            ? "Password must be 8 to 128 characters"
            : field === "email"
              ? "Email address is not valid"
              : "Invalid input",
      });
      return;
    }
    const email = normalizeEmail(parsed.data.email);
    const orderCode = parsed.data.orderId.replace(/\s+/g, "").replace(/^#/, "");
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Email address is not valid" });
      return;
    }

    const ipHash = clientIpHash(req);
    const [fromAddress, sitewide] = await Promise.all([
      countEvents("bad_activation", HOUR, { ipHash }),
      countEvents("bad_activation", HOUR),
    ]);
    if (
      fromAddress >= MAX_BAD_ACTIVATIONS_PER_ADDRESS_HOUR ||
      sitewide >= MAX_BAD_ACTIVATIONS_SITEWIDE_HOUR
    ) {
      req.log.warn({ fromAddress, sitewide }, "Support activation refused: too many failed attempts");
      res.status(429).json({ error: "Too many attempts, try again later" });
      return;
    }

    let order: Awaited<ReturnType<typeof resolveOrder>>;
    try {
      order = await resolveOrder(orderCode);
    } catch (err) {
      req.log.error({ err }, "Failed to check an order with Whop");
      res.status(503).json({ error: "Order check is temporarily unavailable" });
      return;
    }
    const { payment } = order;
    if (payment && !payment.email) {
      // Without the buyer email there is nothing to match against; say so instead of guessing.
      req.log.error(
        { paymentId: payment.id },
        "Whop returned no buyer email for a paid order; the Whop API key needs permission to read member emails",
      );
      res.status(503).json({ error: "Order check is temporarily unavailable" });
      return;
    }
    if (!payment || normalizeEmail(payment.email ?? "") !== email) {
      await recordEvent("bad_activation", req, email);
      res.status(404).json({ error: "No paid order matches this email and order ID" });
      return;
    }

    // Asked only after the order matched, so nobody can probe which emails are customers.
    const [taken] = await db
      .select({ id: supportAccountsTable.id })
      .from(supportAccountsTable)
      .where(or(eq(supportAccountsTable.email, email), eq(supportAccountsTable.orderId, payment.id)))
      .limit(1);
    if (taken) {
      res.status(409).json({ error: "Support chat is already on for this email, sign in instead" });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const [packageName, sampleName] = await Promise.all([
      packageNameFor(payment, order.packageName),
      sampleNameFor(payment),
    ]);
    let created: { account: SupportAccountRow; token: string };
    try {
      created = await db.transaction(async (tx) => {
        const [account] = await tx
          .insert(supportAccountsTable)
          .values({ id: randomUUID(), email, passwordHash, orderId: payment.id, packageName, sampleName })
          .returning();
        const token = await startSupportSession(tx, account.id);
        return { account, token };
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "Support chat is already on for this email, sign in instead" });
        return;
      }
      throw err;
    }

    await recordEvent("activated", req, email);
    req.log.info({ accountId: created.account.id }, "Support chat activated");
    setSupportCookie(res, created.token);
    res.status(201).json(ActivateSupportResponse.parse(sessionView(created.account)));
  },
);

router.post(
  "/support/login",
  requireSameOrigin,
  limitByIp("support-login", 15 * MINUTE, 30),
  async (req, res): Promise<void> => {
    const parsed = SignInSupportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const email = normalizeEmail(parsed.data.email);
    const [forEmail, fromAddress] = await Promise.all([
      countEvents("bad_password", 15 * MINUTE, { emailHash: emailHash(email) }),
      countEvents("bad_password", 15 * MINUTE, { ipHash: clientIpHash(req) }),
    ]);
    if (
      forEmail >= MAX_BAD_PASSWORDS_PER_EMAIL_15_MIN ||
      fromAddress >= MAX_BAD_PASSWORDS_PER_ADDRESS_15_MIN
    ) {
      req.log.warn({ forEmail, fromAddress }, "Support sign-in refused: too many wrong passwords");
      res.status(429).json({ error: "Too many attempts, try again later" });
      return;
    }

    const [account] = await db
      .select()
      .from(supportAccountsTable)
      .where(eq(supportAccountsTable.email, email))
      .limit(1);
    // An unknown email still costs one password check, so timing does not reveal which emails exist.
    const matches = await verifyPassword(
      parsed.data.password,
      account?.passwordHash ?? (await dummyPasswordHash()),
    );
    if (!account || !matches) {
      await recordEvent("bad_password", req, email);
      res.status(401).json({ error: "Wrong email or password" });
      return;
    }

    const token = await db.transaction((tx) => startSupportSession(tx, account.id));
    await recordEvent("signed_in", req, email);
    req.log.info({ accountId: account.id }, "Support sign-in; other browsers signed out");
    setSupportCookie(res, token);
    res.json(SignInSupportResponse.parse(sessionView(account)));
  },
);

router.post("/support/logout", requireSameOrigin, async (req, res): Promise<void> => {
  const token = readCookie(req, SUPPORT_SESSION_COOKIE);
  if (token) {
    await db.delete(supportSessionsTable).where(eq(supportSessionsTable.tokenHash, sha256(token)));
  }
  res.clearCookie(SUPPORT_SESSION_COOKIE, cookieOptions());
  res.status(204).end();
});

router.get("/support/session", async (req, res): Promise<void> => {
  const state = await readSupportSession(req);
  if (!state.ok) {
    sendSignedOut(res, state.reason);
    return;
  }
  res.json(GetSupportSessionResponse.parse(sessionView(state.account)));
});

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

router.get("/support/thread", requireSupport, async (_req, res): Promise<void> => {
  const account = supportAccountOf(res);
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
  requireSupport,
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
    const account = supportAccountOf(res);
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
