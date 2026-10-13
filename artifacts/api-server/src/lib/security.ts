import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import { isOwnOrigin } from "./siteOrigin";

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error("SESSION_SECRET must be set (used to key stored hashes)");
}

export const isProduction = process.env.NODE_ENV === "production";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** HMAC keyed with SESSION_SECRET: stored values cannot be brute-forced without the secret. */
export function keyedHash(value: string): string {
  return createHmac("sha256", SECRET as string).update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Constant-time string comparison (hashing first makes the lengths equal). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}

/* ---------------- client address ---------------- */

function isInternalAddress(raw: string): boolean {
  const ip = raw.replace(/^::ffff:/i, "");
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      // Google Cloud load balancer ranges.
      (a === 35 && b === 191) ||
      (a === 130 && b === 211)
    );
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    return lower === "::1" || /^f[cd]/.test(lower) || lower.startsWith("fe80");
  }
  return true;
}

/**
 * Best-effort visitor address. Each proxy appends the address it received the
 * request from, so the right-most public entry is the one our own edge saw;
 * anything left of it can be forged by the client.
 */
export function clientIp(req: Request): string {
  const chain = String(req.headers["x-forwarded-for"] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  for (let i = chain.length - 1; i >= 0; i--) {
    if (!isInternalAddress(chain[i])) return chain[i].replace(/^::ffff:/i, "");
  }
  return req.socket.remoteAddress ?? "unknown";
}

/** Keyed hash of the visitor address; the raw address is never stored. */
export function clientIpHash(req: Request): string {
  return keyedHash(`ip:${clientIp(req)}`);
}

/* ---------------- request guards ---------------- */

/**
 * Blocks state-changing requests that a browser sent from another site.
 * Browsers always send Origin on cross-site POST/PATCH/DELETE; requests
 * without one did not come from a cross-site page.
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  const origin = req.get("origin");
  if (origin && !isOwnOrigin(origin)) {
    req.log.warn({ path: req.path }, "Blocked cross-site request");
    res.status(403).json({ error: "Request did not come from this site" });
    return;
  }
  next();
}

type Bucket = { count: number; resetAt: number };

/**
 * Fixed-window limit per visitor address, kept in memory. It only slows down
 * bursts against one server instance; hard limits live in the database.
 */
export function limitByIp(name: string, windowMs: number, max: number) {
  const buckets = new Map<string, Bucket>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, 60_000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = clientIpHash(req);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      req.log.warn({ limiter: name }, "Rate limit reached");
      res.status(429).json({ error: "Too many requests, try again later" });
      return;
    }
    next();
  };
}

/* ---------------- cookies ---------------- */

/**
 * httpOnly, Secure, host-only cookies. In production the site is visited
 * directly, so SameSite=Strict. In development the preview pane shows the app
 * inside another site's frame, where only partitioned SameSite=None cookies
 * are sent; the Origin check above still blocks cross-site writes there.
 */
export function cookieOptions(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: isProduction ? "strict" : "none",
    ...(isProduction ? {} : { partitioned: true }),
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

export function readCookie(req: Request, name: string): string | null {
  const value: unknown = req.cookies?.[name];
  return typeof value === "string" && value.length > 0 && value.length <= 200 ? value : null;
}

/* ---------------- text input ---------------- */

/**
 * Drops control characters (keeping new lines and tabs), zero-width spaces and
 * text-direction overrides that can disguise what a message says, then trims.
 * Joiners (needed by Persian and Indic scripts) and direction marks stay.
 */
export function cleanText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/** Single-line version for names and addresses. */
export function cleanLine(value: string): string {
  return cleanText(value).replace(/\s+/g, " ");
}
