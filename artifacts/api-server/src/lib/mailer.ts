import { randomBytes } from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";

/** Email cannot be sent because the Gmail connection is missing or needs to be reconnected. */
export class MailNotConfiguredError extends Error {}

const wrap = (base64: string) => base64.replace(/.{76}/g, "$&\r\n");
const encodeHeader = (value: string) =>
  `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;

/**
 * Sends through the Gmail account connected to this app. Requests go through
 * Replit's connector proxy, which signs them for that account and refreshes
 * its access, so this app never holds the account's credentials. Sent from the
 * connected account's own address (Gmail fills in From).
 */
export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (/[\r\n]/.test(message.to + message.subject)) {
    throw new Error("Mail headers must not contain line breaks");
  }
  const boundary = `xid_${randomBytes(12).toString("hex")}`;
  const mime = [
    `To: ${message.to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(Buffer.from(message.text, "utf8").toString("base64")),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(Buffer.from(message.html, "utf8").toString("base64")),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  // A fresh client per send: it only holds the proxy address, and each request
  // gets a newly issued identity.
  const res = await new ReplitConnectors().proxy("google-mail", "/gmail/v1/users/me/messages/send", {
    method: "POST",
    body: { raw: Buffer.from(mime, "utf8").toString("base64url") },
  });
  if (res.ok) return;

  const detail = (await res.text()).slice(0, 300);
  if (res.status === 404 && /connection found/i.test(detail)) {
    throw new MailNotConfiguredError("Gmail is not connected");
  }
  if (res.status === 401 || res.status === 403) {
    throw new MailNotConfiguredError(`Gmail connection was refused (${res.status}); reconnect Gmail: ${detail}`);
  }
  throw new Error(`Gmail send failed with status ${res.status}: ${detail}`);
}
