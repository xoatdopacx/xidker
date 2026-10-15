import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { asc, eq, sql } from "drizzle-orm";
import { db, sourceSamplesTable } from "@workspace/db";
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

const router: IRouter = Router();
const limitWrites = limitByIp("admin-samples", 60_000, 60);
const order = [asc(sourceSamplesTable.position), asc(sourceSamplesTable.createdAt)];

type SampleInput = { name: string; images: { path: string; thumb: string; width: number; height: number }[]; visible: boolean };

/** Trimmed name and de-duplicated pictures; null when the name ends up empty. */
function clean(input: SampleInput): SampleInput | null {
  const name = cleanLine(input.name.normalize("NFC"));
  if (!name) return null;
  const seen = new Set<string>();
  const images = input.images.filter((image) => {
    if (seen.has(image.path) || seen.has(image.thumb)) return false;
    seen.add(image.path);
    seen.add(image.thumb);
    return true;
  });
  return { name, images, visible: input.visible };
}

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
  if (!input) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    await publishSampleImages(imagePaths(input.images));
  } catch (err) {
    if (err instanceof SampleImageError) {
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
  if (!params.success || !input) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [current] = await db.select().from(sourceSamplesTable).where(eq(sourceSamplesTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Sample not found" });
    return;
  }
  const before = new Set(imagePaths(current.images));
  const after = imagePaths(input.images);
  try {
    await publishSampleImages(after.filter((path) => !before.has(path)));
  } catch (err) {
    if (err instanceof SampleImageError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  const [saved] = await db
    .update(sourceSamplesTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(sourceSamplesTable.id, current.id))
    .returning();
  if (!saved) {
    res.status(404).json({ error: "Sample not found" });
    return;
  }
  // Pictures taken out of the sample are not used anywhere else.
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
  // Orders that picked it keep the name they were saved with.
  await deleteUnusedObjects(imagePaths(deleted.images));
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
