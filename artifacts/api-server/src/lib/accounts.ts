import type { NextFunction, Request, Response } from "express";
import { and, count, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  supportAccountsTable,
  supportAuthEventsTable,
  supportSessionsTable,
  type SupportAccountRow,
} from "@workspace/db";
import { clientIpHash, cookieOptions, keyedHash, randomToken, readCookie, sha256 } from "./security";
import { getEmailDomains } from "./settings";

// Customer accounts: email + password, the email confirmed with an emailed code before the
// account can order or chat. The admin uses the same kind of account (ADMIN_EMAIL).

export const SESSION_COOKIE = "__Host-xid_support";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type SignedOutReason = "signed_out" | "replaced";
export type AuthEvent = (typeof supportAuthEventsTable.$inferInsert)["kind"];

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** ADMIN_EMAIL, lowercased; null when it is not set. */
export function adminEmail(): string | null {
  const value = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  return EMAIL_RE.test(value) ? value : null;
}

export function isAdminEmail(email: string): boolean {
  const admin = adminEmail();
  return admin !== null && normalizeEmail(email) === admin;
}

/** Whether a new account may use this address: one of the common providers, or the admin's. */
export async function emailProviderAllowed(email: string): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  const domain = email.slice(email.lastIndexOf("@") + 1);
  return (await getEmailDomains()).includes(domain);
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  const head = user.slice(0, Math.min(2, user.length));
  const tail = user.length > 4 ? user.slice(-1) : "";
  return `${head}•••${tail}@${domain}`;
}

/* ---------------- events (attempt and email limits) ---------------- */

function emailHash(email: string): string {
  return keyedHash(`support-email:${email}`);
}

export async function countEvents(
  kind: AuthEvent,
  withinMs: number,
  filter: { req?: Request; email?: string } = {},
): Promise<number> {
  const conditions = [
    eq(supportAuthEventsTable.kind, kind),
    gt(supportAuthEventsTable.createdAt, new Date(Date.now() - withinMs)),
  ];
  if (filter.req) conditions.push(eq(supportAuthEventsTable.ipHash, clientIpHash(filter.req)));
  if (filter.email) conditions.push(eq(supportAuthEventsTable.emailHash, emailHash(filter.email)));
  const [row] = await db
    .select({ n: count() })
    .from(supportAuthEventsTable)
    .where(and(...conditions));
  return row.n;
}

export async function recordEvent(kind: AuthEvent, req: Request, email: string | null): Promise<void> {
  await db
    .insert(supportAuthEventsTable)
    .values({ kind, emailHash: email ? emailHash(email) : null, ipHash: clientIpHash(req) });
}

/** Drops month-old events; called now and then from sign-in. */
export async function pruneEvents(): Promise<void> {
  await db.delete(supportAuthEventsTable).where(sql`${supportAuthEventsTable.createdAt} < now() - interval '30 days'`);
}

/* ---------------- sessions ---------------- */

export type SessionState =
  | { ok: true; account: SupportAccountRow }
  | { ok: false; reason: SignedOutReason };

/** The account behind this browser's session cookie, or why there is none. */
export async function readSession(req: Request): Promise<SessionState> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return { ok: false, reason: "signed_out" };
  const [row] = await db
    .select({ session: supportSessionsTable, account: supportAccountsTable })
    .from(supportSessionsTable)
    .innerJoin(supportAccountsTable, eq(supportAccountsTable.id, supportSessionsTable.accountId))
    .where(eq(supportSessionsTable.tokenHash, sha256(token)))
    .limit(1);
  if (!row) return { ok: false, reason: "signed_out" };
  if (row.session.replacedAt) return { ok: false, reason: "replaced" };
  if (row.session.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "signed_out" };
  // Older accounts confirm their email at their next sign-in; locked accounts are out.
  if (!row.account.emailVerifiedAt || row.account.disabledAt) return { ok: false, reason: "signed_out" };
  return { ok: true, account: row.account };
}

export function sendSignedOut(res: Response, reason: SignedOutReason): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.status(401).json({
    error: reason === "replaced" ? "Signed in on another browser" : "Not signed in",
    reason,
  });
}

/** Lets the request through only for the account's live session; the account lands in res.locals.account. */
export async function requireAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  const state = await readSession(req);
  if (!state.ok) {
    sendSignedOut(res, state.reason);
    return;
  }
  res.locals.account = state.account;
  next();
}

export function accountOf(res: Response): SupportAccountRow {
  return res.locals.account as SupportAccountRow;
}

/**
 * Starts a session for the account and marks every other live one as replaced,
 * so only one browser is signed in at a time. Runs inside the caller's transaction.
 */
export async function startSession(tx: Tx, accountId: string): Promise<string> {
  // Lock the account so two sign-ins at the same moment cannot both stay live.
  await tx
    .select({ id: supportAccountsTable.id })
    .from(supportAccountsTable)
    .where(eq(supportAccountsTable.id, accountId))
    .for("update");
  // Rows nobody needs any more: expired, or replaced over 30 days ago.
  await tx
    .delete(supportSessionsTable)
    .where(
      and(
        eq(supportSessionsTable.accountId, accountId),
        or(
          lt(supportSessionsTable.expiresAt, sql`now()`),
          lt(supportSessionsTable.replacedAt, sql`now() - interval '30 days'`),
        ),
      ),
    );
  await tx
    .update(supportSessionsTable)
    .set({ replacedAt: sql`now()` })
    .where(and(eq(supportSessionsTable.accountId, accountId), isNull(supportSessionsTable.replacedAt)));
  const token = randomToken();
  await tx.insert(supportSessionsTable).values({
    tokenHash: sha256(token),
    accountId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  await tx
    .update(supportAccountsTable)
    .set({ lastSignInAt: sql`now()` })
    .where(eq(supportAccountsTable.id, accountId));
  return token;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_MS));
}

/** Signs every browser of the account out (used when the admin locks it). */
export async function endAllSessions(accountId: string): Promise<void> {
  await db.delete(supportSessionsTable).where(eq(supportSessionsTable.accountId, accountId));
}

/** Support chat is open to accounts with an order here, or a paid Whop order from before. */
export async function canChat(account: SupportAccountRow): Promise<boolean> {
  if (account.orderId) return true;
  const [order] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.accountId, account.id))
    .limit(1);
  return Boolean(order);
}

export async function sessionView(account: SupportAccountRow, admin: boolean) {
  return { email: account.email, admin, canChat: await canChat(account), lang: account.lang };
}
