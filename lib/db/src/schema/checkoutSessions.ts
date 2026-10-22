import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// No longer used: Whop checkouts started before the store moved to bank transfers.
// Kept (with its rows) so existing databases are not asked to drop it.
export const checkoutSessionsTable = pgTable("checkout_sessions", {
  ref: text("ref").primaryKey(),
  checkoutConfigurationId: text("checkout_configuration_id").notNull().unique(),
  planId: text("plan_id").notNull(),
  packageName: text("package_name").notNull(),
  // The source sample the buyer picked, for packages with a sample choice. The name is a
  // snapshot so the order keeps it after the sample is renamed or deleted.
  sampleId: text("sample_id"),
  sampleName: text("sample_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CheckoutSessionRow = typeof checkoutSessionsTable.$inferSelect;
export type InsertCheckoutSessionRow = typeof checkoutSessionsTable.$inferInsert;
