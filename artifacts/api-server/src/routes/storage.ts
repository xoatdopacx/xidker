import { Readable } from "node:stream";
import { Router, type IRouter, type Response } from "express";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { limitByIp, requireSameOrigin } from "../lib/security";
import { requireAdmin } from "../lib/adminAuth";
import { MAX_IMAGE_BYTES, objectStorage, readSampleImage } from "../lib/samples";
import { MAX_ZIP_BYTES, ZIP_TYPE } from "../lib/storedFiles";

const router: IRouter = Router();
const UPLOAD_PATH = /^uploads\/[0-9a-f-]{36}$/;
const YEAR_SECONDS = 365 * 24 * 60 * 60;

async function stream(res: Response, response: globalThis.Response): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) {
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream<Uint8Array>).pipe(res);
  } else {
    res.end();
  }
}

/**
 * Upload link for one sample picture or source zip. Only the signed-in admin gets one; the
 * browser then sends the file straight to App Storage, never through this server. Zips are
 * never served from here: buyers download them through their paid order.
 */
router.post(
  "/storage/uploads/request-url",
  requireSameOrigin,
  requireAdmin,
  limitByIp("upload-url", 60_000, 120),
  async (req, res): Promise<void> => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    const max = parsed.success && parsed.data.contentType === ZIP_TYPE ? MAX_ZIP_BYTES : MAX_IMAGE_BYTES;
    if (!parsed.success || parsed.data.size > max) {
      res.status(400).json({ error: "Only WebP, JPEG or PNG images up to 15 MB, or .zip files up to 200 MB" });
      return;
    }
    try {
      const uploadURL = await objectStorage.getObjectEntityUploadURL();
      const objectPath = objectStorage.normalizeObjectEntityPath(uploadURL);
      res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath, metadata: parsed.data }));
    } catch (err) {
      req.log.error({ err }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to create the upload link" });
    }
  },
);

/** Assets uploaded from the App Storage pane into the public folder; unconditionally public. */
router.get("/storage/public-objects/*filePath", async (req, res): Promise<void> => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorage.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    await stream(res, await objectStorage.downloadObject(file));
  } catch (err) {
    req.log.error({ err }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve the file" });
  }
});

/**
 * Sample pictures. Only pictures of a saved sample are served (saving marks them public),
 * so an upload that never made it into a sample stays unreachable. Upload names are random
 * and never reused, so browsers may keep them for good.
 */
router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
  if (!UPLOAD_PATH.test(wildcardPath)) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  try {
    const image = await readSampleImage(`/objects/${wildcardPath}`);
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    res.set({ "Content-Type": image.contentType, "Cache-Control": `public, max-age=${YEAR_SECONDS}, immutable` });
    res.send(image.body);
  } catch (err) {
    req.log.error({ err }, "Error serving a sample image");
    res.status(500).json({ error: "Failed to serve the image" });
  }
});

export default router;
