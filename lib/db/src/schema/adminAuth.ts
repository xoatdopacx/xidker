import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Admin sign-in is two steps: the admin token, then a one-time code emailed to
// the admin address. A challenge row holds that code (keyed hash only) and is
// bound to the browser through an httpOnly cookie carrying the challenge id.
export const adminLoginChallengesTable = pgTable("admin_login_challenges", {
  idHash: text("id_hash").primaryKey(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Signed-in admin browsers. The cookie holds the raw token; only its hash is stored.
// credentialHash is a keyed hash of the ADMIN_TOKEN in force at sign-in, so
// changing that secret signs every admin browser out.
export const adminSessionsTable = pgTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  credentialHash: text("credential_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Sign-in audit trail, also used for the attempt limits.
export const adminLoginEventsTable = pgTable(
  "admin_login_events",
  {
    id: serial("id").primaryKey(),
    kind: text("kind", {
      enum: ["bad_token", "code_sent", "bad_code", "signed_in"],
    }).notNull(),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("admin_login_events_kind_created_idx").on(t.kind, t.createdAt)],
);
