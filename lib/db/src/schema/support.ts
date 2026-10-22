import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Customer accounts. Anyone who wants to buy registers with an email and a password and
// confirms the email with a 6-digit code before they can order. The email is stored
// lowercased; the password only as a scrypt hash. The table keeps its old name: accounts
// made earlier with a paid Whop order (orderId set) still sign in here and confirm their
// email with a code the first time.
export const supportAccountsTable = pgTable("support_accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Set once the customer typed the code emailed to this address.
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  // Language the customer used last; emails go out in it.
  lang: text("lang"),
  // Locked by the admin: no sign-in, no orders, no chat.
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  // Whop payment id of an account made before the store left Whop; null for every newer account.
  orderId: text("order_id").unique(),
  packageName: text("package_name"),
  // Source sample picked at a Whop checkout (snapshot), for packages with a sample choice.
  sampleName: text("sample_name"),
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

// Account events, used for the attempt and email limits. Email and address are
// stored only as keyed hashes.
export const supportAuthEventsTable = pgTable(
  "support_auth_events",
  {
    id: serial("id").primaryKey(),
    kind: text("kind", {
      enum: [
        "bad_password",
        "bad_activation",
        "signed_in",
        "activated",
        "code_sent",
        "bad_code",
        "verified",
        "order_created",
      ],
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
