import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { Response } from "express";
import type { FileMetadata } from "@google-cloud/storage";
import type { StoredFileRow } from "@workspace/db";
import { objectStorageClient } from "./objectStorage";
import { isNotFound, uploadFile } from "./samples";
import { cleanLine } from "./security";

// Zips buyers download: the four templates that ship with the site ("builtin"), or a zip the
// admin uploaded to App Storage ("upload"). Neither is ever reachable without a paid order.

export const ZIP_TYPE = "application/zip";
export const MAX_ZIP_BYTES = 200 * 1024 * 1024;

export const BUILTIN_TEMPLATES = [
  { slug: "reelmark", name: "Reelmark" },
  { slug: "jack", name: "Jack" },
  { slug: "mainframe", name: "Mainframe" },
  { slug: "iris", name: "Iris" },
] as const;

// Next to the bundle in dist/, whatever the working directory is.
export const BUILTIN_DIR = fileURLToPath(new URL("../assets/templates/", import.meta.url));

const builtinPath = (slug: string) => `${BUILTIN_DIR}${slug}.zip`;
export const builtinFileName = (slug: string) => `xidker-${slug}-source.zip`;

export type BuiltinFile = { slug: string; name: string; size: number; demoUrl: string };

/** The template zips that are actually present. */
export async function listBuiltinFiles(): Promise<BuiltinFile[]> {
  const found = await Promise.all(
    BUILTIN_TEMPLATES.map(async (template): Promise<BuiltinFile | null> => {
      try {
        const info = await stat(builtinPath(template.slug));
        return { slug: template.slug, name: template.name, size: info.size, demoUrl: `/demo/${template.slug}/` };
      } catch {
        return null;
      }
    }),
  );
  return found.filter((file): file is BuiltinFile => file !== null);
}

export class StoredFileError extends Error {}

type StoredFileInput = { kind: "builtin" | "upload"; slug?: string; path?: string; name?: string; size?: number };

/** Checks a file the admin picked and returns what to store; throws StoredFileError when it is unusable. */
export async function resolveStoredFile(input: StoredFileInput): Promise<StoredFileRow> {
  if (input.kind === "builtin") {
    const file = (await listBuiltinFiles()).find((candidate) => candidate.slug === input.slug);
    if (!file) throw new StoredFileError("This template file is not available");
    return { kind: "builtin", slug: file.slug, name: builtinFileName(file.slug), size: file.size };
  }
  if (!input.path) throw new StoredFileError("The zip was not uploaded");
  let metadata: FileMetadata;
  try {
    [metadata] = await uploadFile(input.path).getMetadata();
  } catch (err) {
    if (isNotFound(err)) throw new StoredFileError("The zip was not uploaded completely, upload it again");
    throw err;
  }
  if (String(metadata.contentType) !== ZIP_TYPE) throw new StoredFileError("Only .zip files can be used");
  const size = Number(metadata.size);
  if (!(size > 0) || size > MAX_ZIP_BYTES) throw new StoredFileError("The zip must be 200 MB or smaller");
  const name = cleanLine((input.name ?? "").normalize("NFC")).replace(/[\\/"]/g, "_").slice(0, 200) || "source.zip";
  return { kind: "upload", path: input.path, name: /\.zip$/i.test(name) ? name : `${name}.zip`, size };
}

const attachment = (name: string) => {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

/** Sends the file as a download. False when it is gone (nothing has been sent then). */
export async function sendStoredFile(res: Response, file: StoredFileRow): Promise<boolean> {
  if (file.kind === "builtin") {
    let size: number;
    try {
      size = (await stat(builtinPath(file.slug))).size;
    } catch {
      return false;
    }
    res.set({
      "Content-Type": ZIP_TYPE,
      "Content-Length": String(size),
      "Content-Disposition": attachment(file.name),
      "Cache-Control": "private, no-store",
    });
    createReadStream(builtinPath(file.slug)).pipe(res);
    return true;
  }

  // A plain request, not the storage library's download (slow, and it logs a warning per file).
  const object = uploadFile(file.path);
  const token = await objectStorageClient.authClient.getAccessToken();
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(object.bucket.name)}/o/${encodeURIComponent(object.name)}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404) return false;
  if (!response.ok || !response.body) throw new Error(`App Storage answered ${response.status} for a zip`);
  const length = response.headers.get("content-length");
  res.set({
    "Content-Type": ZIP_TYPE,
    ...(length ? { "Content-Length": length } : {}),
    "Content-Disposition": attachment(file.name),
    "Cache-Control": "private, no-store",
  });
  Readable.fromWeb(response.body as import("node:stream/web").ReadableStream<Uint8Array>).pipe(res);
  return true;
}
