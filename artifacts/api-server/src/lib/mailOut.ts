import { appendFile } from "node:fs/promises";
import type { Email } from "./emails";
import { sendMail } from "./mailer";
import { noteMailResult } from "./settings";
import { isProduction } from "./security";
import { logger } from "./logger";

// Outgoing email. Every send also records whether email works, for the dashboard.
// Test servers started with MAIL_TEST_OUTBOX=<file> (never in production) write the emails
// to that file instead, so tests can read codes without mailing anyone.

const testOutbox = !isProduction ? process.env.MAIL_TEST_OUTBOX || null : null;

export async function deliver(to: string, email: Email): Promise<void> {
  if (testOutbox) {
    await appendFile(testOutbox, `${JSON.stringify({ to, subject: email.subject, text: email.text, at: new Date() })}\n`);
    return;
  }
  try {
    await sendMail({ to, ...email });
  } catch (err) {
    await noteMailResult(false).catch(() => {});
    throw err;
  }
  await noteMailResult(true).catch(() => {});
}

/** Sends without holding up the request; a failure is only logged. */
export function deliverInBackground(to: string, email: Email, what: string): void {
  deliver(to, email).catch((err: unknown) => logger.error({ err, what }, "Email not sent"));
}
