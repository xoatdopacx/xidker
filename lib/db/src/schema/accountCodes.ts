import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { supportAccountsTable } from "./support";

// 6-digit codes emailed to prove the customer owns the address. Each code is bound to
// the browser that asked for it: the browser keeps the random challenge id in an httpOnly
// cookie, only its hash is stored here, and the code itself only as a keyed hash.
//   register: a new account; the account is created (with pendingPasswordHash) only
//             once the code is confirmed, so nobody can claim an address they do not read.
//   verify:   an older account signing in for the first time since emails are confirmed.
//   reset:    a forgotten password; the new password is sent together with the code.
//   admin:    the admin's second step after the password.
export const accountCodesTable = pgTable(
  "account_codes",
  {
    idHash: text("id_hash").primaryKey(),
    purpose: text("purpose", { enum: ["register", "verify", "reset", "admin"] }).notNull(),
    email: text("email").notNull(),
    accountId: text("account_id").references(() => supportAccountsTable.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    pendingPasswordHash: text("pending_password_hash"),
    lang: text("lang").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("account_codes_email_idx").on(t.email, t.createdAt)],
);

export type AccountCodeRow = typeof accountCodesTable.$inferSelect;
