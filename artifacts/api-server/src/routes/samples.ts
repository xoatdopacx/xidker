import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { asc, eq, sql } from "drizzle-orm";
import { db, sourceSamplesTable, type StoredFileRow } from "@workspace/db";
import {
  CreateAdminSampleBody,
  CreateAdminSampleResponse,
  DeleteAdminSampleParams,
  ListAdminSamplesResponse,
  ListSamplesResponse,
  ReorderAdminSamplesBody,
  ReorderAdminSamplesResponse,
  UpdateAdminSampleBody,
  UpdateAdminSampleParams,
  UpdateAdminSampleResponse,
} from "@workspace/api-zod";
import { cleanLine, limitByIp, requireSameOrigin } from "../lib/security";
import { requireAdmin } from "../lib/adminAuth";
import {
  SampleImageError,
  adminSample,
  deleteUnusedObjects,
  imagePaths,
  publicSample,
  publishSampleImages,
} from "../lib/samples";
import { StoredFileError, resolveStoredFile } from "../lib/storedFiles";

const router: IRouter = Router();
const limitWrites = limitByIp("admin-samples", 60_000, 60);
const order = [asc(sourceSamplesTable.position), asc(sourceSamplesTable.createdAt)];

type StoredFileInput = { kind: "builtin" | "upload"; slug?: string; path?: string; name?: string; size?: number };
type SampleInput = {
  name: string;
  images: { path: string; thumb: string; width: number; height: number }[];
  sourceFile: StoredFileInput | null;
  demoUrl: string | null;
  visible: boolean;
};
type CleanSample = Omit<SampleInput, "sourceFile">;

// A live preview: one of the demos on this site (/demo/...), or a page elsewhere over https.
const DEMO_PATH_RE = /^\/demo\/[A-Za-z0-9._~\/-]*$/;

function cleanDemoUrl(value: string | null): string | null | undefined {
  const url = (value ?? "").trim();
  if (!url) return null;
  if (DEMO_PATH_RE.test(url) && !url.includes("..")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

/** Trimmed name and de-duplicated pictures; null when the name is empty or the demo link is not usable. */
function clean(input: SampleInput): CleanSample | null {
  const name = cleanLine(input.name.normalize("NFC"));
  const demoUrl = cleanDemoUrl(input.demoUrl);
  if (!name || demoUrl === undefined) return null;
  const seen = new Set<string>();
  const images = input.images.filter((image) => {
    if (seen.has(image.path) || seen.has(image.thumb)) return false;
    seen.add(image.path);
    seen.add(image.thumb);
    return true;
  });
  return { name, images, demoUrl, visible: input.visible };
}

/** The source file to save: the current one when unchanged, else the picked one, checked. */
async function sourceFileFor(input: StoredFileInput | null, current: StoredFileRow | null): Promise<StoredFileRow | null> {
  if (!input) return null;
  if (current && input.kind === current.kind) {
    if (current.kind === "upload" && input.path === current.path) return current;
    if (current.kind === "builtin" && input.slug === current.slug) return current;
  }
  return resolveStoredFile(input);
}

const uploadPaths = (file: StoredFileRow | null) => (file?.kind === "upload" ? [file.path] : []);

router.get("/samples", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(sourceSamplesTable)
    .where(eq(sourceSamplesTable.visible, true))
    .orderBy(...order);
  res.json(ListSamplesResponse.parse(rows.map(publicSample)));
});

router.get("/admin/samples", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(sourceSamplesTable).orderBy(...order);
  res.json(ListAdminSamplesResponse.parse(rows.map(adminSample)));
});

router.post("/admin/samples", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const body = CreateAdminSampleBody.safeParse(req.body);
  const input = body.success ? clean(body.data) : null;
  if (!body.success || !input) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  let sourceFile: StoredFileRow | null;
  try {
    sourceFile = await sourceFileFor(body.data.sourceFile, null);
    await publishSampleImages(imagePaths(input.images));
  } catch (err) {
    if (err instanceof SampleImageError || err instanceof StoredFileError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  const [created] = await db
    .insert(sourceSamplesTable)
    .values({
      id: randomBytes(9).toString("base64url"),
      ...input,
      sourceFile,
      position: sql`(select coalesce(max(${sourceSamplesTable.position}), -1) + 1 from ${sourceSamplesTable})`,
    })
    .returning();
  req.log.info({ sampleId: created.id }, "Admin added a source sample");
  res.status(201).json(CreateAdminSampleResponse.parse(adminSample(created)));
});

router.put("/admin/samples/:id", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const params = UpdateAdminSampleParams.safeParse(req.params);
  const body = UpdateAdminSampleBody.safeParse(req.body);
  const input = body.success ? clean(body.data) : null;
  if (!params.success || !body.success || !input) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [current] = await db.select().from(sourceSamplesTable).where(eq(sourceSamplesTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Sample not found" });
    return;
  }
  const before = new Set([...imagePaths(current.images), ...uploadPaths(current.sourceFile)]);
  const after = imagePaths(input.images);
  let sourceFile: StoredFileRow | null;
  try {
    sourceFile = await sourceFileFor(body.data.sourceFile, current.sourceFile);
    await publishSampleImages(after.filter((path) => !before.has(path)));
  } catch (err) {
    if (err instanceof SampleImageError || err instanceof StoredFileError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  after.push(...uploadPaths(sourceFile));
  const [saved] = await db
    .update(sourceSamplesTable)
    .set({ ...input, sourceFile, updatedAt: new Date() })
    .where(eq(sourceSamplesTable.id, current.id))
    .returning();
  if (!saved) {
    res.status(404).json({ error: "Sample not found" });
    return;
  }
  // Files taken out of the sample, unless an order still points at them.
  const kept = new Set(after);
  await deleteUnusedObjects([...before].filter((path) => !kept.has(path)));
  req.log.info({ sampleId: saved.id }, "Admin changed a source sample");
  res.json(UpdateAdminSampleResponse.parse(adminSample(saved)));
});

router.delete("/admin/samples/:id", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const params = DeleteAdminSampleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [deleted] = await db.delete(sourceSamplesTable).where(eq(sourceSamplesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Sample not found" });
    return;
  }
  // Orders that picked it keep the name and file they were saved with.
  await deleteUnusedObjects([...imagePaths(deleted.images), ...uploadPaths(deleted.sourceFile)]);
  req.log.info({ sampleId: deleted.id }, "Admin deleted a source sample");
  res.status(204).end();
});

router.put("/admin/sample-order", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const body = ReorderAdminSamplesBody.safeParse(req.body);
  if (!body.success || new Set(body.data.ids).size !== body.data.ids.length) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const ids = body.data.ids;
  const rows = await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx.update(sourceSamplesTable).set({ position }).where(eq(sourceSamplesTable.id, id));
    }
    return tx.select().from(sourceSamplesTable).orderBy(...order);
  });
  res.json(ReorderAdminSamplesResponse.parse(rows.map(adminSample)));
});

export default router;
