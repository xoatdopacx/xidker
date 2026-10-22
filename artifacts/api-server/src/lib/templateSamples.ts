import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import { db, siteSettingsTable, sourceSamplesTable, type SampleImageRow } from "@workspace/db";
import { BUILTIN_DIR, BUILTIN_TEMPLATES, builtinFileName, listBuiltinFiles } from "./storedFiles";
import { savePublicImage } from "./samples";
import { logger } from "./logger";

// The four templates that ship with the site become ordinary samples the first time the
// server starts on a database: picture, live demo and source zip filled in. After that the
// admin owns them like any other sample (rename, hide, delete).

const SEED_FLAG = "templates_seeded";
/** Any fixed number: only one server instance seeds at a time. */
const SEED_LOCK = 482_113_907;
const PREVIEW = { width: 1600, height: 1000 };

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
  if (files.length !== BUILTIN_TEMPLATES.length) {
    logger.error({ found: files.map((file) => file.slug) }, "Template zips are missing; the templates were not added as samples");
    return;
  }
  const added = await db.transaction(async (tx) => {
    const { rows } = await tx.execute<{ locked: boolean }>(sql`select pg_try_advisory_xact_lock(${SEED_LOCK}) as locked`);
    if (!rows[0]?.locked) return 0;
    const [done] = await tx.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, SEED_FLAG));
    if (done) return 0;

    const values = [];
    for (const [i, file] of files.entries()) {
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
    await tx.insert(siteSettingsTable).values({ key: SEED_FLAG, value: true });
    return values.length;
  });
  if (added) logger.info({ added }, "Added the bundled templates as samples");
}
