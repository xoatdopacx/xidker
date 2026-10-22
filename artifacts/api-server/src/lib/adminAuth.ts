import type { NextFunction, Request, Response } from "express";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db, adminSessionsTable, supportAccountsTable, type SupportAccountRow } from "@workspace/db";
import { cookieOptions, keyedHash, randomToken, readCookie, safeEqual, sha256 } from "./security";
import { adminEmail } from "./accounts";

// The admin is the customer account whose email is ADMIN_EMAIL. Signing in to it always
// takes the password and then a code emailed to that address; the code also opens this
// admin session, kept in its own cookie for 12 hours.

export const ADMIN_SESSION_COOKIE = "__Host-xid_admin";
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60_000;

/** Ties a session to the account's password and ADMIN_EMAIL: changing either signs the admin out everywhere. */
function credentialHash(account: Pick<SupportAccountRow, "id" | "passwordHash">, email: string): string {
  return keyedHash(`admin-account:${account.id}:${email}:${account.passwordHash}`);
}

function isAdminAccount(account: SupportAccountRow): boolean {
  const email = adminEmail();
  return email !== null && account.email === email && account.emailVerifiedAt !== null && account.disabledAt === null;
}

/** Starts the admin session for this browser and ends the admin's other ones. */
export async function startAdminSession(res: Response, account: SupportAccountRow): Promise<void> {
  const email = adminEmail();
  if (!email || account.email !== email) return;
  const token = randomToken();
  await db.transaction(async (tx) => {
    await tx
      .delete(adminSessionsTable)
      .where(or(eq(adminSessionsTable.accountId, account.id), isNull(adminSessionsTable.accountId), lt(adminSessionsTable.expiresAt, new Date())));
    await tx.insert(adminSessionsTable).values({
      tokenHash: sha256(token),
      credentialHash: credentialHash(account, email),
      accountId: account.id,
      expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
    });
  });
  res.cookie(ADMIN_SESSION_COOKIE, token, cookieOptions(ADMIN_SESSION_TTL_MS));
}

export type AdminSessionState = { account: SupportAccountRow; expiresAt: Date };

/** The admin session of this browser, when it is live and still matches the admin account. */
export async function readAdminSession(req: Request): Promise<AdminSessionState | null> {
  const token = readCookie(req, ADMIN_SESSION_COOKIE);
  const email = adminEmail();
  if (!token || !email) return null;
  const [row] = await db
    .select({ session: adminSessionsTable, account: supportAccountsTable })
    .from(adminSessionsTable)
    .innerJoin(supportAccountsTable, eq(supportAccountsTable.id, adminSessionsTable.accountId))
    .where(and(eq(adminSessionsTable.tokenHash, sha256(token)), gt(adminSessionsTable.expiresAt, new Date())))
    .limit(1);
  if (!row || !isAdminAccount(row.account)) return null;
  if (!safeEqual(row.session.credentialHash, credentialHash(row.account, email))) return null;
  return { account: row.account, expiresAt: row.session.expiresAt };
}

/** Lets the request through only with a live admin session. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await readAdminSession(req);
  if (!session) {
    if (readCookie(req, ADMIN_SESSION_COOKIE)) res.clearCookie(ADMIN_SESSION_COOKIE, cookieOptions());
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.locals.adminSession = session;
  next();
}

export function adminSessionOf(res: Response): AdminSessionState {
  return res.locals.adminSession as AdminSessionState;
}

/** Ends this browser's admin session. */
export async function endAdminSession(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, ADMIN_SESSION_COOKIE);
  if (token) await db.delete(adminSessionsTable).where(eq(adminSessionsTable.tokenHash, sha256(token)));
  res.clearCookie(ADMIN_SESSION_COOKIE, cookieOptions());
}

/** Ends every admin session of the account (when it signs out everywhere or gets locked). */
export async function endAdminSessionsOf(accountId: string): Promise<void> {
  await db.delete(adminSessionsTable).where(eq(adminSessionsTable.accountId, accountId));
}
