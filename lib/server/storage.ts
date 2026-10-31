import "server-only";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Image storage. Uploads are decoded and re-encoded (so the file really is an image, with metadata
// stripped and a sane size) before they are stored. Providers are chosen with IMAGE_PROVIDER:
//   "local"  writes into public/uploads. Development only: a production server doesn't serve files
//            added after the build, and serverless hosts have no writable disk.
// Production needs an object store (S3, Cloudflare R2, Vercel Blob): add it as another case in `store`.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export class UploadError extends Error {}

async function store(name: string, data: Buffer): Promise<string> {
  const provider = process.env.IMAGE_PROVIDER ?? "local";
  if (provider === "local") {
    if (process.env.NODE_ENV === "production") throw new UploadError("Image storage isn't set up for production yet.");
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), data);
    return `/uploads/${name}`;
  }
  throw new UploadError(`Unknown image provider "${provider}".`);
}

/** Validates, re-encodes and stores an uploaded image. Returns the URL path to save. */
export async function saveImage(input: Buffer): Promise<string> {
  if (input.length === 0 || input.length > MAX_UPLOAD_BYTES) throw new UploadError("Images must be under 5 MB.");
  let encoded: Buffer;
  try {
    const img = sharp(input, { limitInputPixels: 40_000_000 }).rotate(); // honour camera orientation, then drop metadata
    const meta = await img.metadata();
    if (!meta.format || !FORMATS.has(meta.format)) throw new UploadError("Use a JPEG, PNG, WebP or GIF image.");
    encoded = await img.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch (e) {
    if (e instanceof UploadError) throw e;
    throw new UploadError("That file couldn't be read as an image.");
  }
  const name = `${createHash("sha256").update(encoded).digest("hex").slice(0, 24)}.webp`;
  return store(name, encoded);
}
