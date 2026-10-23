import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import { db, siteSettingsTable, sourceSamplesTable, type SampleImageRow } from "@workspace/db";
import { BUILTIN_DIR, BUILTIN_TEMPLATES, builtinFileName, listBuiltinFiles } from "./storedFiles";
import { savePublicImage } from "./samples";
import { logger } from "./logger";

// Each template that ships with the site becomes an ordinary sample the first time a server
// with it starts on a database: picture, live demo and source zip filled in. After that the
// admin owns it like any other sample (rename, hide, delete); a deleted template never comes back.

/** The slugs added so far. The first release stored `true` once its four templates were in. */
const SEED_FLAG = "templates_seeded";
const FIRST_RELEASE = ["reelmark", "jack", "mainframe", "iris"];
/** Any fixed number: only one server instance seeds at a time. */
const SEED_LOCK = 482_113_907;
const PREVIEW = { width: 1600, height: 1000 };

function seededSlugs(value: unknown): string[] {
  if (value === true) return FIRST_RELEASE;
  return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === "string") : [];
}

async function uploadPreview(slug: string): Promise<SampleImageRow> {
  const [full, thumb] = await Promise.all([
    readFile(`${BUILTIN_DIR}${slug}.webp`),
    readFile(`${BUILTIN_DIR}${slug}-thumb.webp`),
  ]);
  const [path, thumbPath] = await Promise.all([savePublicImage(full, "image/webp"), savePublicImage(thumb, "image/webp")]);
  return { path, thumb: thumbPath, ...PREVIEW };
}

export async function seedTemplateSamples(): Promise<void> {
  const files = await listBuiltinFiles();
  const missing = BUILTIN_TEMPLATES.filter((template) => !files.some((file) => file.slug === template.slug));
  if (missing.length) {
    logger.error({ missing: missing.map((template) => template.slug) }, "Template zips are missing; those templates were not added as samples");
  }
  const added = await db.transaction(async (tx) => {
    const { rows } = await tx.execute<{ locked: boolean }>(sql`select pg_try_advisory_xact_lock(${SEED_LOCK}) as locked`);
    if (!rows[0]?.locked) return [];
    const [flag] = await tx.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, SEED_FLAG));
    const done = seededSlugs(flag?.value);
    const todo = files.filter((file) => !done.includes(file.slug));
    if (!todo.length) return [];

    const values = [];
    for (const [i, file] of todo.entries()) {
      values.push({
        id: randomBytes(9).toString("base64url"),
        name: file.name,
        images: [await uploadPreview(file.slug)],
        sourceFile: { kind: "builtin" as const, slug: file.slug, name: builtinFileName(file.slug), size: file.size },
        demoUrl: file.demoUrl,
        visible: true,
        position: sql`(select coalesce(max(${sourceSamplesTable.position}), -1) + ${i + 1} from ${sourceSamplesTable})`,
      });
    }
    await tx.insert(sourceSamplesTable).values(values);
    const seeded = [...done, ...todo.map((file) => file.slug)];
    await tx
      .insert(siteSettingsTable)
      .values({ key: SEED_FLAG, value: seeded })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: seeded, updatedAt: new Date() } });
    return todo.map((file) => file.slug);
  });
  if (added.length) logger.info({ added }, "Added the bundled templates as samples");
}
