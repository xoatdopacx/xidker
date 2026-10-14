import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Customers who switched on support chat with a paid Whop order. The email is
// stored lowercased and must match the buyer email Whop holds for that order.
// The password is kept only as a scrypt hash.
export const supportAccountsTable = pgTable("support_accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // The Whop payment id used to activate; one account per order.
  orderId: text("order_id").notNull().unique(),
  packageName: text("package_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
});

// Signed-in browsers. The cookie holds the raw token; only its hash is stored.
// Only one session per account is live: signing in again sets replacedAt on the
// others, and those rows are kept for a while so that browser can be told why.
// Signing out deletes the row.
export const supportSessionsTable = pgTable(
  "support_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => supportAccountsTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    replacedAt: timestamp("replaced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("support_sessions_account_idx").on(t.accountId)],
);

// Sign-in and activation attempts, used for the attempt limits.
// Email and address are stored only as keyed hashes.
export const supportAuthEventsTable = pgTable(
  "support_auth_events",
  {
    id: serial("id").primaryKey(),
    kind: text("kind", {
      enum: ["bad_password", "bad_activation", "signed_in", "activated"],
    }).notNull(),
    emailHash: text("email_hash"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("support_auth_events_kind_created_idx").on(t.kind, t.createdAt)],
);

export type SupportAccountRow = typeof supportAccountsTable.$inferSelect;
