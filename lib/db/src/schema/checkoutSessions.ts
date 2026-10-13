import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Minimal mapping from the public checkout ref (in the /cam-on redirect URL)
// to the Whop checkout configuration. Payment status always comes from Whop.
export const checkoutSessionsTable = pgTable("checkout_sessions", {
  ref: text("ref").primaryKey(),
  checkoutConfigurationId: text("checkout_configuration_id").notNull().unique(),
  planId: text("plan_id").notNull(),
  packageName: text("package_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CheckoutSessionRow = typeof checkoutSessionsTable.$inferSelect;
export type InsertCheckoutSessionRow = typeof checkoutSessionsTable.$inferInsert;
