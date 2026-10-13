import type { NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, adminSessionsTable } from "@workspace/db";
import { cookieOptions, keyedHash, readCookie, safeEqual, sha256 } from "./security";
import { logger } from "./logger";

export const ADMIN_SESSION_COOKIE = "__Host-xid_admin";
export const ADMIN_CHALLENGE_COOKIE = "__Host-xid_admin_ch";
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60_000;

const MIN_TOKEN_LENGTH = 24;

/** ADMIN_TOKEN and ADMIN_EMAIL, or null (with the reason logged) when sign-in is not set up. */
export function adminConfig(): { token: string; email: string } | null {
  // Trimmed so a stray space or newline pasted into the secret cannot lock the admin out.
  const token = (process.env.ADMIN_TOKEN ?? "").trim();
  const email = (process.env.ADMIN_EMAIL ?? "").trim();
  if (!token || !email) {
    logger.error("Admin sign-in is off: ADMIN_TOKEN or ADMIN_EMAIL is not set");
    return null;
  }
  if (token.length < MIN_TOKEN_LENGTH) {
    logger.error(`Admin sign-in is off: ADMIN_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters`);
    return null;
  }
  return { token, email };
}

/** Ties a session to the ADMIN_TOKEN in force when it was created. */
export function credentialHash(adminToken: string): string {
  return keyedHash(`admin-token:${adminToken}`);
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  const head = user.slice(0, Math.min(2, user.length));
  const tail = user.length > 4 ? user.slice(-1) : "";
  return `${head}•••${tail}@${domain}`;
}

/** Lets the request through only with a live admin session for the current ADMIN_TOKEN. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readCookie(req, ADMIN_SESSION_COOKIE);
  const config = token ? adminConfig() : null;
  if (!token || !config) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const [session] = await db
    .select()
    .from(adminSessionsTable)
    .where(
      and(
        eq(adminSessionsTable.tokenHash, sha256(token)),
        gt(adminSessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!session || !safeEqual(session.credentialHash, credentialHash(config.token))) {
    res.clearCookie(ADMIN_SESSION_COOKIE, cookieOptions());
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.locals.adminSessionExpiresAt = session.expiresAt;
  next();
}
