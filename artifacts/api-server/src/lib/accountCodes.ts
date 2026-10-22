import { randomInt } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db, accountCodesTable, type AccountCodeRow } from "@workspace/db";
import { cookieOptions, keyedHash, randomToken, readCookie, safeEqual, sha256 } from "./security";
import { countEvents, maskEmail, recordEvent } from "./accounts";
import { CODE_MINUTES, type Email } from "./emails";
import { deliver } from "./mailOut";
import { logger } from "./logger";

// 6-digit codes emailed to prove someone reads an address. The browser that asked keeps the
// challenge id in an httpOnly cookie; the code only works together with that cookie.

export const CODE_COOKIE = "__Host-xid_code";
const CODE_TTL_MS = CODE_MINUTES * 60_000;
/** A new code can be sent for the same challenge for this long. */
const RESEND_WINDOW_MS = 60 * 60_000;
export const MAX_CODE_ATTEMPTS = 5;

const MAX_CODES_PER_EMAIL_HOUR = 5;
const MAX_CODES_PER_ADDRESS_HOUR = 15;
const MAX_CODES_PER_DAY = 300;

export type CodePurpose = AccountCodeRow["purpose"];

const codeHash = (idHash: string, code: string) => keyedHash(`account-code:${idHash}:${code}`);
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class CodeLimitError extends Error {}
export class CodeMailError extends Error {}

/** Throws CodeLimitError when another code may not go out now. */
async function checkLimits(req: Request, email: string): Promise<void> {
  const [forEmail, fromAddress, today] = await Promise.all([
    countEvents("code_sent", 60 * 60_000, { email }),
    countEvents("code_sent", 60 * 60_000, { req }),
    countEvents("code_sent", 24 * 60 * 60_000),
  ]);
  if (forEmail >= MAX_CODES_PER_EMAIL_HOUR || fromAddress >= MAX_CODES_PER_ADDRESS_HOUR || today >= MAX_CODES_PER_DAY) {
    req.log.warn({ forEmail, fromAddress, today }, "Code not sent: limit reached");
    throw new CodeLimitError("Too many codes");
  }
}

/**
 * Sends `mail(code)` to the address. When it returns null nothing is sent (an address with no
 * account behind it), after a pause like a real send, so the answer looks the same either way.
 */
async function send(req: Request, email: string, code: string, mail: (code: string) => Email | null): Promise<void> {
  const message = mail(code);
  if (!message) {
    await sleep(500 + randomInt(0, 700));
  } else {
    try {
      await deliver(email, message);
    } catch (err) {
      req.log.error({ err }, "Code email not sent");
      throw new CodeMailError("Email failed");
    }
  }
  await recordEvent("code_sent", req, email);
}

export type Challenge = { purpose: CodePurpose; sentTo: string; expiresAt: Date };

/** Starts a challenge for this browser and emails its code. */
export async function startChallenge(
  req: Request,
  res: Response,
  input: {
    purpose: CodePurpose;
    email: string;
    accountId: string | null;
    pendingPasswordHash?: string | null;
    lang: string;
    mail: (code: string) => Email | null;
  },
): Promise<Challenge> {
  await checkLimits(req, input.email);
  const challengeId = randomToken();
  const idHash = sha256(challengeId);
  const code = newCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  // Only the newest code for an address works.
  await db
    .update(accountCodesTable)
    .set({ usedAt: new Date() })
    .where(and(eq(accountCodesTable.email, input.email), isNull(accountCodesTable.usedAt)));
  await db.insert(accountCodesTable).values({
    idHash,
    purpose: input.purpose,
    email: input.email,
    accountId: input.accountId,
    codeHash: codeHash(idHash, code),
    pendingPasswordHash: input.pendingPasswordHash ?? null,
    lang: input.lang,
    expiresAt,
  });
  try {
    await send(req, input.email, code, input.mail);
  } catch (err) {
    await db.delete(accountCodesTable).where(eq(accountCodesTable.idHash, idHash));
    throw err;
  }
  res.cookie(CODE_COOKIE, challengeId, cookieOptions(RESEND_WINDOW_MS));
  // Now and then: codes nobody can use any more.
  if (randomInt(0, 20) === 0) {
    db.delete(accountCodesTable)
      .where(lt(accountCodesTable.createdAt, new Date(Date.now() - 2 * 24 * 60 * 60_000)))
      .catch((err: unknown) => logger.warn({ err }, "Could not prune old codes"));
  }
  return { purpose: input.purpose, sentTo: maskEmail(input.email), expiresAt };
}

/** This browser's challenge, while it can still be used or resent. */
export async function currentChallenge(req: Request): Promise<AccountCodeRow | null> {
  const challengeId = readCookie(req, CODE_COOKIE);
  if (!challengeId) return null;
  const [row] = await db
    .select()
    .from(accountCodesTable)
    .where(
      and(
        eq(accountCodesTable.idHash, sha256(challengeId)),
        isNull(accountCodesTable.usedAt),
        gt(accountCodesTable.createdAt, new Date(Date.now() - RESEND_WINDOW_MS)),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** A fresh code for the same challenge (the old one stops working). */
export async function resendChallenge(
  req: Request,
  row: AccountCodeRow,
  mail: (code: string) => Email | null,
): Promise<Challenge> {
  await checkLimits(req, row.email);
  const code = newCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const [updated] = await db
    .update(accountCodesTable)
    .set({ codeHash: codeHash(row.idHash, code), attempts: 0, expiresAt })
    .where(and(eq(accountCodesTable.idHash, row.idHash), isNull(accountCodesTable.usedAt)))
    .returning({ idHash: accountCodesTable.idHash });
  if (!updated) throw new CodeExpiredError("Challenge ended");
  await send(req, row.email, code, mail);
  return { purpose: row.purpose, sentTo: maskEmail(row.email), expiresAt };
}

export class CodeExpiredError extends Error {}

export type CodeAttempt =
  | { ok: true; row: AccountCodeRow }
  | { ok: false; reason: "code_expired" | "wrong_code" };

/** Checks the code against this browser's challenge; a right code uses the challenge up. */
export async function attemptCode(req: Request, code: string): Promise<CodeAttempt> {
  const challengeId = readCookie(req, CODE_COOKIE);
  if (!challengeId) return { ok: false, reason: "code_expired" };
  const idHash = sha256(challengeId);
  // The attempt is counted before checking, atomically, so parallel guesses cannot pass the limit.
  const [row] = await db
    .update(accountCodesTable)
    .set({ attempts: sql`${accountCodesTable.attempts} + 1` })
    .where(
      and(
        eq(accountCodesTable.idHash, idHash),
        isNull(accountCodesTable.usedAt),
        gt(accountCodesTable.expiresAt, new Date()),
        lt(accountCodesTable.attempts, MAX_CODE_ATTEMPTS),
      ),
    )
    .returning();
  if (!row) return { ok: false, reason: "code_expired" };
  if (!safeEqual(row.codeHash, codeHash(idHash, code))) return { ok: false, reason: "wrong_code" };
  const [claimed] = await db
    .update(accountCodesTable)
    .set({ usedAt: new Date() })
    .where(and(eq(accountCodesTable.idHash, idHash), isNull(accountCodesTable.usedAt)))
    .returning();
  return claimed ? { ok: true, row: claimed } : { ok: false, reason: "code_expired" };
}

export function clearCodeCookie(res: Response): void {
  res.clearCookie(CODE_COOKIE, cookieOptions());
}
