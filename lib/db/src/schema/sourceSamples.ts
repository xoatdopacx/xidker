import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** One picture of a sample: object paths in App Storage for the full image and its preview. */
export type SampleImageRow = { path: string; thumb: string; width: number; height: number };

// Source samples that buyers of a package with a sample choice pick from before paying.
// The images live in App Storage; only their object paths are kept here.
export const sourceSamplesTable = pgTable(
  "source_samples",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    images: jsonb("images").$type<SampleImageRow[]>().notNull(),
    visible: boolean("visible").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("source_samples_position_idx").on(t.position, t.createdAt)],
);

export type SourceSampleRow = typeof sourceSamplesTable.$inferSelect;
