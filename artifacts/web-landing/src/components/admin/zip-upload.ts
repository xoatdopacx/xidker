import { requestUploadUrl, type StoredFile, type StoredFileInput } from "@workspace/api-client-react";

// Source code .zip files go straight from the admin's browser to storage, the same way
// sample pictures do; the API checks the uploaded file when the order or sample is saved.

export const ZIP_MAX_BYTES = 200 * 1024 * 1024;
const NAME_MAX = 200;

/** A problem with the file itself or with the upload, already worded for the admin. */
export class ZipProblem extends Error {}

/** A file the admin picked: one of the source zips built into the site, or one they uploaded. */
export type PickedFile = { input: StoredFileInput; name: string; size: number };

/** The saved file in the shape the editors work with. */
export function pickedFrom(file: StoredFile | null): PickedFile | null {
  if (!file) return null;
  if (file.kind === "builtin" && file.slug) return { input: { kind: "builtin", slug: file.slug }, name: file.name, size: file.size };
  if (file.kind === "upload" && file.path) {
    return { input: { kind: "upload", path: file.path, name: file.name, size: file.size }, name: file.name, size: file.size };
  }
  return null;
}

/** Identifies the file, for "has anything changed" checks. */
export const fileKey = (file: PickedFile | null) =>
  file ? `${file.input.kind}:${file.input.kind === "builtin" ? file.input.slug : file.input.path}` : "";

/** "Mẫu Iris (source).zip" stays readable and under the API's 200 characters, ending in .zip. */
function zipName(name: string) {
  const base = (name.split(/[\\/]/).pop() ?? "").replace(/\.zip$/i, "").trim() || "source";
  return `${base.slice(0, NAME_MAX - 4)}.zip`;
}

/**
 * Uploads one .zip, reporting progress from 0 to 1. Throws ZipProblem, a failed API request,
 * or an AbortError when `signal` aborts.
 */
export async function uploadZip(file: File, onProgress: (share: number) => void, signal: AbortSignal): Promise<PickedFile> {
  if (!/\.zip$/i.test(file.name)) throw new ZipProblem("Chỉ dùng được file .zip. Nén thư mục source thành file .zip rồi chọn lại nhé.");
  if (file.size === 0) throw new ZipProblem("File này trống.");
  if (file.size > ZIP_MAX_BYTES) throw new ZipProblem("File .zip tối đa 200 MB.");
  const name = zipName(file.name);
  const { uploadURL, objectPath } = await requestUploadUrl({ name, size: file.size, contentType: "application/zip" }, { signal });

  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Upload cancelled", "AbortError")); return; }
    const xhr = new XMLHttpRequest();
    const cancel = () => xhr.abort();
    signal.addEventListener("abort", cancel, { once: true });
    const settle = (fn: () => void) => { signal.removeEventListener("abort", cancel); fn(); };
    xhr.open("PUT", uploadURL);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total); };
    xhr.onload = () => settle(() => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new ZipProblem("Tải file lên không thành công. Thử lại nhé."))));
    xhr.onerror = () => settle(() => reject(new ZipProblem("Tải file lên bị ngắt giữa chừng. Kiểm tra mạng rồi thử lại.")));
    xhr.onabort = () => settle(() => reject(new DOMException("Upload cancelled", "AbortError")));
    xhr.send(file);
  });
  onProgress(1);
  return { input: { kind: "upload", path: objectPath, name, size: file.size }, name, size: file.size };
}
