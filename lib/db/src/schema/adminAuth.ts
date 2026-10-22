import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { supportAccountsTable } from "./support";

// No longer used: the admin now signs in with the ADMIN_EMAIL customer account and an
// emailed code (account_codes). Kept so existing databases are not asked to drop it.
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
// credentialHash is a keyed hash of the admin account, its password hash and ADMIN_EMAIL
// at sign-in, so a new password or a new ADMIN_EMAIL signs every admin browser out.
// Rows from the old token sign-in have no accountId and no longer work.
export const adminSessionsTable = pgTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  credentialHash: text("credential_hash").notNull(),
  accountId: text("account_id").references(() => supportAccountsTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Admin sign-in audit trail.
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
