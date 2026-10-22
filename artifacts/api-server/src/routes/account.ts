import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, supportAccountsTable, supportSessionsTable, type SupportAccountRow } from "@workspace/db";
import {
  GetAccountSessionResponse,
  RegisterAccountBody,
  RegisterAccountResponse,
  RequestPasswordResetBody,
  RequestPasswordResetResponse,
  ResendAccountCodeResponse,
  SignInAccountBody,
  SignInAccountResponse,
  VerifyAccountCodeBody,
  VerifyAccountCodeResponse,
} from "@workspace/api-zod";
import { cookieOptions, limitByIp, readCookie, requireSameOrigin, sha256 } from "../lib/security";
import { PASSWORD_MIN_LENGTH, dummyPasswordHash, hashPassword, normalizePassword, verifyPassword } from "../lib/passwords";
import {
  EMAIL_RE,
  SESSION_COOKIE,
  countEvents,
  emailProviderAllowed,
  isAdminEmail,
  normalizeEmail,
  pruneEvents,
  readSession,
  recordEvent,
  sendSignedOut,
  sessionView,
  setSessionCookie,
  startSession,
} from "../lib/accounts";
import {
  CodeExpiredError,
  CodeLimitError,
  CodeMailError,
  attemptCode,
  clearCodeCookie,
  currentChallenge,
  resendChallenge,
  startChallenge,
  type CodePurpose,
} from "../lib/accountCodes";
import { accountExistsEmail, adminCodeEmail, codeEmail, type Email } from "../lib/emails";
import { endAdminSession, readAdminSession, startAdminSession } from "../lib/adminAuth";
import { resolveSiteOrigin } from "../lib/siteOrigin";
import { fail, isUniqueViolation } from "../lib/http";
import { logger } from "../lib/logger";

// Customer accounts: sign up with email + password, confirmed by a code sent to that email;
// sign in; forgotten password. The admin signs in here too and always gets a code.

const MINUTE = 60_000;
const MAX_BAD_PASSWORDS_PER_EMAIL_15_MIN = 5;
const MAX_BAD_PASSWORDS_PER_ADDRESS_15_MIN = 20;
const MAX_BAD_CODES_PER_ADDRESS_15_MIN = 20;

const router: IRouter = Router();

/** Answers a failed code step; false when the error is not one of those. */
function codeStepFailed(res: Response, err: unknown): boolean {
  if (err instanceof CodeLimitError) fail(res, 429, "too_many", "Too many codes asked for, try again later");
  else if (err instanceof CodeMailError) fail(res, 503, "mail_failed", "The email could not be sent");
  else if (err instanceof CodeExpiredError) fail(res, 410, "code_expired", "The code has expired, start again");
  else return false;
  return true;
}

const passwordOk = (password: string) => normalizePassword(password).length >= PASSWORD_MIN_LENGTH;

async function findAccount(email: string): Promise<SupportAccountRow | null> {
  const [account] = await db.select().from(supportAccountsTable).where(eq(supportAccountsTable.email, email)).limit(1);
  return account ?? null;
}

async function findAccountById(id: string): Promise<SupportAccountRow | null> {
  const [account] = await db.select().from(supportAccountsTable).where(eq(supportAccountsTable.id, id)).limit(1);
  return account ?? null;
}

/** The email that goes with a code: Vietnamese for the admin, the customer's language otherwise. */
function mailFor(purpose: CodePurpose, lang: string): (code: string) => Email {
  return purpose === "admin" ? adminCodeEmail : (code) => codeEmail(lang, purpose, code);
}

/** Signs the account in on this browser (every other browser is signed out). */
async function signIn(req: Request, res: Response, account: SupportAccountRow, admin: boolean) {
  const token = await db.transaction((tx) => startSession(tx, account.id));
  setSessionCookie(res, token);
  if (admin) await startAdminSession(res, account);
  await recordEvent("signed_in", req, account.email);
  if (Math.random() < 0.05) pruneEvents().catch((err: unknown) => logger.warn({ err }, "Could not prune events"));
  return sessionView(account, admin);
}

/* ---------------- sign up ---------------- */

router.post(
  "/account/register",
  requireSameOrigin,
  limitByIp("account-register", 15 * MINUTE, 20),
  async (req, res): Promise<void> => {
    const parsed = RegisterAccountBody.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "invalid_input", "Invalid input");
      return;
    }
    const email = normalizeEmail(parsed.data.email);
    const { lang, password } = parsed.data;
    if (!EMAIL_RE.test(email)) {
      fail(res, 400, "invalid_email", "Email address is not valid");
      return;
    }
    if (!(await emailProviderAllowed(email))) {
      fail(res, 400, "email_not_allowed", "Use an address from a common email provider");
      return;
    }
    if (!passwordOk(password)) {
      fail(res, 400, "weak_password", `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    const existing = await findAccount(email);
    // Pages without a language in the path take it from ?lang=, so the link opens in the email's language.
    const signInUrl = `${resolveSiteOrigin(req)}/dang-nhap?lang=${lang}`;
    try {
      const challenge = existing
        ? // The address has an account: say so by email, and answer exactly as for a new one.
          await startChallenge(req, res, {
            purpose: "register",
            email,
            accountId: null,
            lang,
            mail: () => accountExistsEmail(lang, signInUrl),
          })
        : await startChallenge(req, res, {
            purpose: "register",
            email,
            accountId: null,
            pendingPasswordHash: await hashPassword(password),
            lang,
            mail: mailFor("register", lang),
          });
      res.json(RegisterAccountResponse.parse(challenge));
    } catch (err) {
      if (!codeStepFailed(res, err)) throw err;
    }
  },
);

/* ---------------- sign in ---------------- */

router.post(
  "/account/login",
  requireSameOrigin,
  limitByIp("account-login", 15 * MINUTE, 40),
  async (req, res): Promise<void> => {
    const parsed = SignInAccountBody.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "invalid_input", "Invalid input");
      return;
    }
    const email = normalizeEmail(parsed.data.email);
    const { lang } = parsed.data;
    const [forEmail, fromAddress] = await Promise.all([
      countEvents("bad_password", 15 * MINUTE, { email }),
      countEvents("bad_password", 15 * MINUTE, { req }),
    ]);
    if (forEmail >= MAX_BAD_PASSWORDS_PER_EMAIL_15_MIN || fromAddress >= MAX_BAD_PASSWORDS_PER_ADDRESS_15_MIN) {
      req.log.warn({ forEmail, fromAddress }, "Sign-in refused: too many wrong passwords");
      fail(res, 429, "too_many", "Too many attempts, try again later");
      return;
    }

    const account = await findAccount(email);
    // An unknown email still costs one password check, so timing does not reveal which emails exist.
    const matches = await verifyPassword(parsed.data.password, account?.passwordHash ?? (await dummyPasswordHash()));
    if (!account || !matches) {
      await recordEvent("bad_password", req, email);
      fail(res, 401, "wrong_credentials", "Wrong email or password");
      return;
    }
    if (account.disabledAt) {
      fail(res, 403, "locked", "This account is locked");
      return;
    }

    // The admin always confirms with a code; older accounts confirm their email once.
    const purpose: CodePurpose | null = isAdminEmail(account.email) ? "admin" : account.emailVerifiedAt ? null : "verify";
    if (purpose) {
      try {
        const challenge = await startChallenge(req, res, {
          purpose,
          email: account.email,
          accountId: account.id,
          lang,
          mail: mailFor(purpose, lang),
        });
        res.json(SignInAccountResponse.parse({ session: null, challenge }));
      } catch (err) {
        if (!codeStepFailed(res, err)) throw err;
      }
      return;
    }

    await db.update(supportAccountsTable).set({ lang }).where(eq(supportAccountsTable.id, account.id));
    const session = await signIn(req, res, { ...account, lang }, false);
    req.log.info({ accountId: account.id }, "Signed in; other browsers signed out");
    res.json(SignInAccountResponse.parse({ session, challenge: null }));
  },
);

/* ---------------- forgotten password ---------------- */

router.post(
  "/account/password-reset",
  requireSameOrigin,
  limitByIp("account-reset", 15 * MINUTE, 20),
  async (req, res): Promise<void> => {
    const parsed = RequestPasswordResetBody.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "invalid_input", "Invalid input");
      return;
    }
    const email = normalizeEmail(parsed.data.email);
    const { lang } = parsed.data;
    if (!EMAIL_RE.test(email)) {
      fail(res, 400, "invalid_email", "Email address is not valid");
      return;
    }
    const account = await findAccount(email);
    const usable = account && !account.disabledAt ? account : null;
    try {
      // Without a usable account nothing is sent, but the answer is the same.
      const challenge = await startChallenge(req, res, {
        purpose: "reset",
        email,
        accountId: usable?.id ?? null,
        lang,
        mail: (code) => (usable ? codeEmail(lang, "reset", code) : null),
      });
      res.json(RequestPasswordResetResponse.parse(challenge));
    } catch (err) {
      if (!codeStepFailed(res, err)) throw err;
    }
  },
);

/* ---------------- codes ---------------- */

router.post(
  "/account/verify",
  requireSameOrigin,
  limitByIp("account-verify", 15 * MINUTE, 40),
  async (req, res): Promise<void> => {
    const parsed = VerifyAccountCodeBody.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "invalid_input", "Invalid input");
      return;
    }
    const pending = await currentChallenge(req);
    if (!pending || pending.expiresAt.getTime() <= Date.now()) {
      fail(res, 410, "code_expired", "The code has expired, start again");
      return;
    }
    // Checked before the code is used up, so a short password does not cost the code.
    const newPassword = parsed.data.password;
    if (pending.purpose === "reset" && (!newPassword || !passwordOk(newPassword))) {
      fail(res, 400, "weak_password", `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    if ((await countEvents("bad_code", 15 * MINUTE, { req })) >= MAX_BAD_CODES_PER_ADDRESS_15_MIN) {
      fail(res, 429, "too_many", "Too many attempts, try again later");
      return;
    }

    const attempt = await attemptCode(req, parsed.data.code);
    if (!attempt.ok) {
      if (attempt.reason === "wrong_code") {
        await recordEvent("bad_code", req, pending.email);
        fail(res, 401, "wrong_code", "Wrong code");
      } else {
        fail(res, 410, "code_expired", "The code has expired, start again");
      }
      return;
    }
    const used = attempt.row;
    clearCodeCookie(res);

    let account: SupportAccountRow | null = null;
    if (used.purpose === "register") {
      // No password kept means the address already had an account (that email said so).
      if (!used.pendingPasswordHash) {
        fail(res, 410, "code_expired", "The code has expired, start again");
        return;
      }
      try {
        [account] = await db
          .insert(supportAccountsTable)
          .values({
            id: randomUUID(),
            email: used.email,
            passwordHash: used.pendingPasswordHash,
            emailVerifiedAt: new Date(),
            lang: used.lang,
          })
          .returning();
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        fail(res, 410, "code_expired", "The code has expired, start again");
        return;
      }
      req.log.info({ accountId: account.id }, "Account created");
    } else {
      const found = used.accountId ? await findAccountById(used.accountId) : null;
      if (!found || found.email !== used.email) {
        fail(res, 410, "code_expired", "The code has expired, start again");
        return;
      }
      if (found.disabledAt) {
        fail(res, 403, "locked", "This account is locked");
        return;
      }
      const changes: Partial<typeof supportAccountsTable.$inferInsert> = { lang: used.lang };
      if (!found.emailVerifiedAt) changes.emailVerifiedAt = new Date();
      if (used.purpose === "reset") changes.passwordHash = await hashPassword(newPassword!);
      [account] = await db.update(supportAccountsTable).set(changes).where(eq(supportAccountsTable.id, found.id)).returning();
      if (used.purpose === "reset") {
        // A new password signs every browser out, the admin's included.
        await db.delete(supportSessionsTable).where(eq(supportSessionsTable.accountId, account.id));
        req.log.info({ accountId: account.id }, "Password changed with an emailed code");
      }
    }

    await recordEvent("verified", req, account.email);
    // Whoever reads the admin's mailbox and knows the password (or just set a new one) is the admin.
    const session = await signIn(req, res, account, isAdminEmail(account.email));
    res.json(VerifyAccountCodeResponse.parse(session));
  },
);

router.post(
  "/account/resend",
  requireSameOrigin,
  limitByIp("account-resend", 15 * MINUTE, 20),
  async (req, res): Promise<void> => {
    const pending = await currentChallenge(req);
    if (!pending) {
      fail(res, 410, "code_expired", "The code has expired, start again");
      return;
    }
    let mail: (code: string) => Email | null;
    if (pending.purpose === "register") {
      // The same as the first time: a code for a new address, nothing more for a taken one.
      mail = pending.pendingPasswordHash && !(await findAccount(pending.email)) ? mailFor("register", pending.lang) : () => null;
    } else if (pending.purpose === "reset" && !pending.accountId) {
      mail = () => null;
    } else {
      mail = mailFor(pending.purpose, pending.lang);
    }
    try {
      const challenge = await resendChallenge(req, pending, mail);
      res.json(ResendAccountCodeResponse.parse(challenge));
    } catch (err) {
      if (!codeStepFailed(res, err)) throw err;
    }
  },
);

/* ---------------- session ---------------- */

router.get("/account/session", async (req, res): Promise<void> => {
  const state = await readSession(req);
  if (!state.ok) {
    sendSignedOut(res, state.reason);
    return;
  }
  const admin = isAdminEmail(state.account.email) && (await readAdminSession(req)) !== null;
  res.json(GetAccountSessionResponse.parse(await sessionView(state.account, admin)));
});

router.post("/account/logout", requireSameOrigin, async (req, res): Promise<void> => {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await db.delete(supportSessionsTable).where(eq(supportSessionsTable.tokenHash, sha256(token)));
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  await endAdminSession(req, res);
  res.status(204).end();
});

export default router;
