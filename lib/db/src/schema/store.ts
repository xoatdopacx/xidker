import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { supportAccountsTable } from "./support";

/**
 * A file buyers download: a template zip that ships with the API ("builtin", by slug)
 * or a zip the admin uploaded to App Storage ("upload", by object path).
 */
export type StoredFileRow =
  | { kind: "builtin"; slug: string; name: string; size: number }
  | { kind: "upload"; path: string; name: string; size: number };

/** A package's text in one language. */
export type PackageTextRow = { name: string; tagline: string | null; features: string[] };

// Settings the admin edits in the dashboard (bank account for VietQR, allowed email
// providers) and one-off flags such as "the starting packages were added".
export const siteSettingsTable = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The packages on the price list, cheapest first. Prices are in VND (what buyers
// transfer); priceUsd is only shown as an approximate figure next to it.
export const storePackagesTable = pgTable(
  "store_packages",
  {
    key: text("key").primaryKey(),
    textVi: jsonb("text_vi").$type<PackageTextRow>().notNull(),
    textEn: jsonb("text_en").$type<PackageTextRow>().notNull(),
    priceVnd: integer("price_vnd").notNull(),
    priceUsd: doublePrecision("price_usd"),
    recommended: boolean("recommended").notNull().default(false),
    // Buyers pick a source sample before ordering, and download that sample's source once paid.
    pickSample: boolean("pick_sample").notNull().default(false),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// Orders paid by bank transfer. The code (XID + 6 characters) is the transfer memo; the
// admin marks the order paid once the money shows up in the bank account. Package and
// sample are snapshots, so an order keeps them after the package or sample changes.
export const ordersTable = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    accountId: text("account_id").references(() => supportAccountsTable.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    packageKey: text("package_key").notNull(),
    // Vietnamese name at the time of the order.
    packageName: text("package_name").notNull(),
    sampleId: text("sample_id"),
    sampleName: text("sample_name"),
    // The picked sample's source file at the time of the order.
    sampleFile: jsonb("sample_file").$type<StoredFileRow>(),
    amount: integer("amount").notNull(),
    status: text("status", { enum: ["pending", "paid", "cancelled"] })
      .notNull()
      .default("pending"),
    // Language the buyer ordered in; their emails go out in it.
    lang: text("lang").notNull(),
    // The buyer pressed "I have transferred".
    transferReportedAt: timestamp("transfer_reported_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    // A file the admin attached for this buyer; wins over the sample's file.
    deliveryFile: jsonb("delivery_file").$type<StoredFileRow>(),
    // Message to the buyer, shown on the order page once paid.
    deliveryNote: text("delivery_note"),
    // Private note for the admin.
    adminNote: text("admin_note"),
    downloads: integer("downloads").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("orders_account_idx").on(t.accountId, t.createdAt),
    index("orders_status_idx").on(t.status, t.createdAt),
  ],
);

export type SiteSettingRow = typeof siteSettingsTable.$inferSelect;
export type StorePackageRow = typeof storePackagesTable.$inferSelect;
export type OrderRow = typeof ordersTable.$inferSelect;
