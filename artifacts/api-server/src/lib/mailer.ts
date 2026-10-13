import { randomBytes } from "node:crypto";

/** Email cannot be sent because no Gmail account is connected to this app. */
export class MailNotConfiguredError extends Error {}

type GmailConnection = {
  settings?: {
    access_token?: string;
    oauth?: { credentials?: { access_token?: string } };
  };
};

// Access token for the Gmail account connected through Replit. Fetched on
// every send because the connector refreshes tokens; never cache it.
async function gmailAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const replitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;
  if (!hostname || !replitToken) {
    throw new MailNotConfiguredError("Replit connector environment is missing");
  }

  const res = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=google-mail`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: replitToken } },
  );
  if (!res.ok) {
    throw new Error(`Connector lookup failed with status ${res.status}`);
  }
  const data = (await res.json()) as { items?: GmailConnection[] };
  const settings = data.items?.[0]?.settings;
  const token = settings?.access_token ?? settings?.oauth?.credentials?.access_token;
  if (!token) {
    throw new MailNotConfiguredError("Gmail is not connected");
  }
  return token;
}

const wrap = (base64: string) => base64.replace(/.{76}/g, "$&\r\n");
const encodeHeader = (value: string) =>
  `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;

export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (/[\r\n]/.test(message.to + message.subject)) {
    throw new Error("Mail headers must not contain line breaks");
  }
  const token = await gmailAccessToken();
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

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(mime, "utf8").toString("base64url") }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gmail send failed with status ${res.status}: ${detail}`);
  }
}
