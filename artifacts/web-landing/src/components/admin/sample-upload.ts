import { requestUploadUrl, type AdminSampleImageInput } from "@workspace/api-client-react";

// Sample pictures are shrunk in the admin's browser before upload: the full picture to at most
// 1600 px wide, plus a 640x800 preview of its top. Buyers' phones then never download a huge original.

const FULL_MAX_WIDTH = 1600;
/** Stays inside every browser's canvas limit (Safari's is about 16.7 million pixels). */
const MAX_AREA = 16_000_000;
/** WebP cannot be taller than this. */
const MAX_SIDE = 16_383;
const THUMB_WIDTH = 640;
const THUMB_HEIGHT = 800;
const QUALITY = 0.85;
const SOURCE_MAX_BYTES = 40 * 1024 * 1024;

type Encoded = { blob: Blob; type: "image/webp" | "image/jpeg" };

/** A problem with the picture itself, already worded for the admin. */
export class ImageProblem extends Error {}

export type PreparedImage = {
  image: AdminSampleImageInput;
  /** Local copies to show before the sample is saved; revoke them when done. */
  thumbUrl: string;
  fullUrl: string;
};

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Some browsers read a few more formats through <img>.
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageProblem("Không đọc được ảnh này. Dùng ảnh PNG, JPG hoặc WebP nhé.");
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

function drawing(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProblem("Trình duyệt này không xử lý được ảnh. Thử Chrome, Edge, Firefox hoặc Safari bản mới nhé.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // JPEG has no transparency: a see-through area turns white instead of black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

/** WebP where the browser can write it (others quietly hand back PNG), JPEG otherwise. */
async function encode(canvas: HTMLCanvasElement): Promise<Encoded> {
  const webp = await toBlob(canvas, "image/webp");
  if (webp?.type === "image/webp") return { blob: webp, type: "image/webp" };
  const jpeg = await toBlob(canvas, "image/jpeg");
  if (jpeg?.type === "image/jpeg") return { blob: jpeg, type: "image/jpeg" };
  throw new ImageProblem("Trình duyệt này không nén được ảnh. Thử Chrome, Edge, Firefox hoặc Safari bản mới nhé.");
}

async function shrink(file: File): Promise<{ full: Encoded; thumb: Encoded; width: number; height: number }> {
  const picture = await decode(file);
  try {
    const { width, height } = picture;
    if (!width || !height) throw new ImageProblem("Ảnh này không có nội dung.");

    const scale = Math.min(1, FULL_MAX_WIDTH / width, MAX_SIDE / height, Math.sqrt(MAX_AREA / (width * height)));
    const fullWidth = Math.max(1, Math.round(width * scale));
    const fullHeight = Math.max(1, Math.round(height * scale));
    const full = drawing(fullWidth, fullHeight);
    full.ctx.drawImage(picture.source, 0, 0, fullWidth, fullHeight);

    // The preview fills 640x800 from the top of the picture, centred across.
    const cover = Math.max(THUMB_WIDTH / width, THUMB_HEIGHT / height);
    const drawWidth = width * cover;
    const thumb = drawing(THUMB_WIDTH, THUMB_HEIGHT);
    thumb.ctx.drawImage(picture.source, (THUMB_WIDTH - drawWidth) / 2, 0, drawWidth, height * cover);

    const [fullBlob, thumbBlob] = [await encode(full.canvas), await encode(thumb.canvas)];
    return { full: fullBlob, thumb: thumbBlob, width: fullWidth, height: fullHeight };
  } finally {
    picture.close();
  }
}

async function upload(encoded: Encoded, name: string): Promise<string> {
  const { uploadURL, objectPath } = await requestUploadUrl({ name, size: encoded.blob.size, contentType: encoded.type });
  const response = await fetch(uploadURL, { method: "PUT", body: encoded.blob, headers: { "Content-Type": encoded.type } });
  if (!response.ok) throw new ImageProblem("Tải ảnh lên không thành công. Kiểm tra mạng rồi bấm Thử lại.");
  return objectPath;
}

/** Shrinks one picture and uploads both sizes. Errors are ImageProblem or a failed API request. */
export async function prepareSampleImage(file: File): Promise<PreparedImage> {
  if (file.size > SOURCE_MAX_BYTES) throw new ImageProblem("Ảnh lớn hơn 40 MB. Chụp nhỏ lại hoặc cắt bớt nhé.");
  const { full, thumb, width, height } = await shrink(file);
  const base = (file.name.replace(/\.[^.]*$/, "") || "sample").slice(0, 180);
  const path = await upload(full, `${base}.${full.type === "image/webp" ? "webp" : "jpg"}`);
  const thumbPath = await upload(thumb, `${base}-preview.${thumb.type === "image/webp" ? "webp" : "jpg"}`);
  return {
    image: { path, thumb: thumbPath, width, height },
    thumbUrl: URL.createObjectURL(thumb.blob),
    fullUrl: URL.createObjectURL(full.blob),
  };
}
