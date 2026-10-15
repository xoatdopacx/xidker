import { and, eq } from "drizzle-orm";
import type { File, FileMetadata } from "@google-cloud/storage";
import { db, sourceSamplesTable, type SampleImageRow, type SourceSampleRow } from "@workspace/db";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import { logger } from "./logger";

// Source samples: the admin uploads pictures of each sample, buyers of a package with a
// sample choice pick one before paying. The admin's browser uploads the pictures straight to
// App Storage; saving a sample marks its pictures public so the site can show them.

export const objectStorage = new ObjectStorageService();

/** Where this API serves uploaded pictures (the routes are mounted under /api). */
const STORAGE_URL = "/api/storage";
export const SAMPLE_IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
/** The metadata key objectAcl.ts keeps an object's access policy under. */
const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

const urls = (image: SampleImageRow) => ({
  url: `${STORAGE_URL}${image.path}`,
  thumbUrl: `${STORAGE_URL}${image.thumb}`,
});

export function publicSample(row: SourceSampleRow) {
  return {
    id: row.id,
    name: row.name,
    images: row.images.map((image) => ({ ...urls(image), width: image.width, height: image.height })),
  };
}

export function adminSample(row: SourceSampleRow) {
  return {
    id: row.id,
    name: row.name,
    images: row.images.map((image) => ({ ...image, ...urls(image) })),
    visible: row.visible,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const imagePaths = (images: SampleImageRow[]) => images.flatMap((image) => [image.path, image.thumb]);

/** Whether buyers have anything to pick from; a package only asks for a sample while this is true. */
export async function hasVisibleSamples(): Promise<boolean> {
  const [row] = await db
    .select({ id: sourceSamplesTable.id })
    .from(sourceSamplesTable)
    .where(eq(sourceSamplesTable.visible, true))
    .limit(1);
  return Boolean(row);
}

export async function findVisibleSample(id: string): Promise<SourceSampleRow | null> {
  const [row] = await db
    .select()
    .from(sourceSamplesTable)
    .where(and(eq(sourceSamplesTable.id, id), eq(sourceSamplesTable.visible, true)))
    .limit(1);
  return row ?? null;
}

/* ---------------- App Storage ---------------- */

// Each call to App Storage takes about 0.1 s, so every step below makes as few as it can.

/** The stored object behind "/objects/uploads/<uuid>", without asking App Storage whether it exists. */
function uploadFile(objectPath: string): File {
  const dir = objectStorage.getPrivateObjectDir().replace(/^\/+|\/+$/g, "");
  const [bucketName, ...prefix] = dir.split("/");
  return objectStorageClient.bucket(bucketName).file([...prefix, objectPath.replace(/^\/objects\//, "")].join("/"));
}

const isNotFound = (err: unknown) => (err as { code?: unknown } | null)?.code === 404;

function isPublic(metadata: FileMetadata): boolean {
  const raw = metadata.metadata?.[ACL_POLICY_METADATA_KEY];
  if (typeof raw !== "string") return false;
  try {
    return (JSON.parse(raw) as { visibility?: unknown }).visibility === "public";
  } catch {
    return false;
  }
}

async function eachLimited<T>(items: T[], limit: number, run: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await run(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export class SampleImageError extends Error {}

/**
 * Checks that each uploaded object exists and is a picture, then makes it public.
 * Throws SampleImageError when an upload is missing, too big or not a picture.
 */
export async function publishSampleImages(objectPaths: string[]): Promise<void> {
  await eachLimited(objectPaths, 6, async (objectPath) => {
    const file = uploadFile(objectPath);
    let metadata: FileMetadata;
    try {
      [metadata] = await file.getMetadata();
    } catch (err) {
      if (isNotFound(err)) throw new SampleImageError("An image was not uploaded completely, add it again");
      throw err;
    }
    if (!SAMPLE_IMAGE_TYPES.has(String(metadata.contentType))) {
      throw new SampleImageError("Only WebP, JPEG and PNG images can be used");
    }
    if (Number(metadata.size) > MAX_IMAGE_BYTES) throw new SampleImageError("Images must be 15 MB or smaller");
    if (isPublic(metadata)) return;
    await file.setMetadata({
      metadata: { [ACL_POLICY_METADATA_KEY]: JSON.stringify({ owner: "admin", visibility: "public" }) },
    });
  });
}

// Pictures served lately, kept in memory: upload names are random and never reused, so a
// stored copy never goes stale. Bounded, and each server instance keeps its own.
type SampleImageFile = { body: Buffer; contentType: string };
const CACHE_MAX_BYTES = 32 * 1024 * 1024;
const CACHE_ITEM_MAX_BYTES = 2 * 1024 * 1024;
const cache = new Map<string, SampleImageFile>();
let cacheBytes = 0;

function forget(objectPath: string): void {
  const hit = cache.get(objectPath);
  if (!hit) return;
  cache.delete(objectPath);
  cacheBytes -= hit.body.length;
}

function remember(objectPath: string, image: SampleImageFile): void {
  if (image.body.length > CACHE_ITEM_MAX_BYTES) return;
  forget(objectPath);
  cache.set(objectPath, image);
  cacheBytes += image.body.length;
  for (const [key, value] of cache) {
    if (cacheBytes <= CACHE_MAX_BYTES) break;
    cache.delete(key);
    cacheBytes -= value.body.length;
  }
}

/** A picture of a saved sample; null when it is missing, was never saved into a sample, or is not a picture. */
export async function readSampleImage(objectPath: string): Promise<SampleImageFile | null> {
  const hit = cache.get(objectPath);
  if (hit) {
    cache.delete(objectPath);
    cache.set(objectPath, hit);
    return hit;
  }
  const file = uploadFile(objectPath);
  let metadata: FileMetadata;
  try {
    [metadata] = await file.getMetadata();
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
  const contentType = String(metadata.contentType);
  if (!SAMPLE_IMAGE_TYPES.has(contentType) || !isPublic(metadata) || Number(metadata.size) > MAX_IMAGE_BYTES) return null;

  // Read with a plain request: the storage library's own download logs a listener warning on every file.
  const token = await objectStorageClient.authClient.getAccessToken();
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(file.bucket.name)}/o/${encodeURIComponent(file.name)}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`App Storage answered ${response.status} for a sample image`);
  const image = { body: Buffer.from(await response.arrayBuffer()), contentType };
  remember(objectPath, image);
  return image;
}

/**
 * Deletes pictures no saved sample uses any more; call it after the database change.
 * Best effort: a picture left behind only costs storage, so failures are logged, not raised.
 */
export async function deleteUnusedObjects(objectPaths: string[]): Promise<void> {
  if (objectPaths.length === 0) return;
  const rows = await db.select({ images: sourceSamplesTable.images }).from(sourceSamplesTable);
  const inUse = new Set(rows.flatMap((row) => imagePaths(row.images)));
  await eachLimited(
    objectPaths.filter((objectPath) => !inUse.has(objectPath)),
    6,
    async (objectPath) => {
      forget(objectPath);
      try {
        await uploadFile(objectPath).delete({ ignoreNotFound: true });
      } catch (err) {
        logger.warn({ err, objectPath }, "Could not delete a sample image from storage");
      }
    },
  );
}
