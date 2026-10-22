import { eq, sql } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { bankByBin } from "./vietqr";

// Settings the admin edits in the dashboard. Read often (every sign-up checks the email
// providers, every order page shows the bank), so each server instance keeps them for a
// short while; a save on this instance takes effect at once, on others within CACHE_MS.

export type BankSetting = { bin: string; accountNumber: string; accountName: string };

const CACHE_MS = 30_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function readSetting(key: string): Promise<unknown> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const [row] = await db.select({ value: siteSettingsTable.value }).from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
  const value = row?.value ?? null;
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function writeSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(siteSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: sql`now()` } });
  cache.set(key, { at: Date.now(), value });
}

/** Sets a one-off flag; true only for the caller that set it first. */
export async function claimFlag(key: string): Promise<boolean> {
  const rows = await db
    .insert(siteSettingsTable)
    .values({ key, value: true })
    .onConflictDoNothing({ target: siteSettingsTable.key })
    .returning({ key: siteSettingsTable.key });
  return rows.length > 0;
}

/* ---------------- bank account ---------------- */

export async function getBank(): Promise<BankSetting | null> {
  const value = (await readSetting("bank")) as Partial<BankSetting> | null;
  if (!value?.bin || !value.accountNumber || !value.accountName || !bankByBin(value.bin)) return null;
  return { bin: value.bin, accountNumber: value.accountNumber, accountName: value.accountName };
}

export async function setBank(bank: BankSetting): Promise<void> {
  await writeSetting("bank", bank);
}

/* ---------------- email providers ---------------- */

// Common providers people actually use, across the countries the site speaks to. Throwaway
// inbox services are left out by not being on the list; the admin can add more.
export const DEFAULT_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.com.vn",
  "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.it", "hotmail.es", "outlook.fr", "outlook.de", "live.co.uk", "live.fr",
  "yahoo.com", "yahoo.com.vn", "ymail.com", "rocketmail.com", "yahoo.co.uk", "yahoo.fr", "yahoo.de", "yahoo.co.jp", "yahoo.co.id", "yahoo.com.tw",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "pm.me", "zoho.com", "gmx.com", "gmx.de", "gmx.net", "web.de", "mail.com", "t-online.de",
  "orange.fr", "free.fr", "laposte.net", "libero.it", "seznam.cz", "wp.pl", "o2.pl", "interia.pl", "onet.pl",
  "yandex.com", "yandex.ru", "mail.ru", "bk.ru", "inbox.ru", "list.ru", "rambler.ru", "ukr.net",
  "qq.com", "163.com", "126.com", "foxmail.com", "sina.com", "naver.com", "daum.net", "hanmail.net", "kakao.com",
  "rediffmail.com",
];

const DOMAIN_RE = /^(?=.{3,100}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** Lowercased, de-duplicated, valid domains (a leading "@" is dropped); null when one is not a domain. */
export function cleanDomains(input: string[]): string[] | null {
  const out: string[] = [];
  for (const raw of input) {
    const domain = raw.trim().toLowerCase().replace(/^@/, "");
    if (!domain) continue;
    if (!DOMAIN_RE.test(domain)) return null;
    if (!out.includes(domain)) out.push(domain);
  }
  return out.length ? out : null;
}

export async function getEmailDomains(): Promise<string[]> {
  const value = await readSetting("email_domains");
  return Array.isArray(value) && value.every((d) => typeof d === "string") && value.length > 0
    ? (value as string[])
    : DEFAULT_EMAIL_DOMAINS;
}

export async function setEmailDomains(domains: string[]): Promise<void> {
  await writeSetting("email_domains", domains);
}

/* ---------------- mail health ---------------- */

// Whether the last email went out. Shown on the dashboard so a disconnected Gmail is noticed.
export async function mailWorking(): Promise<boolean> {
  return (await readSetting("mail_failing")) !== true;
}

export async function noteMailResult(ok: boolean): Promise<void> {
  const failing = (await readSetting("mail_failing")) === true;
  if (failing === !ok) return;
  await writeSetting("mail_failing", !ok);
}
