import type { NextFunction, Request, Response } from "express";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import {
  db,
  supportAccountsTable,
  supportSessionsTable,
  type SupportAccountRow,
} from "@workspace/db";
import { cookieOptions, randomToken, readCookie, sha256 } from "./security";

export const SUPPORT_SESSION_COOKIE = "__Host-xid_support";
export const SUPPORT_SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type SignedOutReason = "signed_out" | "replaced";

export type SupportSessionState =
  | { ok: true; account: SupportAccountRow }
  | { ok: false; reason: SignedOutReason };

/** The account behind this browser's session cookie, or why there is none. */
export async function readSupportSession(req: Request): Promise<SupportSessionState> {
  const token = readCookie(req, SUPPORT_SESSION_COOKIE);
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
  return { ok: true, account: row.account };
}

export function sendSignedOut(res: Response, reason: SignedOutReason): void {
  res.clearCookie(SUPPORT_SESSION_COOKIE, cookieOptions());
  res.status(401).json({
    error: reason === "replaced" ? "Signed in on another browser" : "Not signed in",
    reason,
  });
}

/** Lets the request through only for the account's live session; the account lands in res.locals.supportAccount. */
export async function requireSupport(req: Request, res: Response, next: NextFunction): Promise<void> {
  const state = await readSupportSession(req);
  if (!state.ok) {
    sendSignedOut(res, state.reason);
    return;
  }
  res.locals.supportAccount = state.account;
  next();
}

export function supportAccountOf(res: Response): SupportAccountRow {
  return res.locals.supportAccount as SupportAccountRow;
}

/**
 * Starts a session for the account and marks every other live one as replaced,
 * so only one browser is signed in at a time. Runs inside the caller's transaction.
 */
export async function startSupportSession(tx: Tx, accountId: string): Promise<string> {
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
    expiresAt: new Date(Date.now() + SUPPORT_SESSION_TTL_MS),
  });
  await tx
    .update(supportAccountsTable)
    .set({ lastSignInAt: sql`now()` })
    .where(eq(supportAccountsTable.id, accountId));
  return token;
}

export function setSupportCookie(res: Response, token: string): void {
  res.cookie(SUPPORT_SESSION_COOKIE, token, cookieOptions(SUPPORT_SESSION_TTL_MS));
}

export function sessionView(account: SupportAccountRow) {
  return { email: account.email, orderId: account.orderId, packageName: account.packageName };
}
