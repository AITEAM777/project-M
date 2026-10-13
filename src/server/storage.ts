import "server-only";
import { randomBytes } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { HttpError } from "@/lib/http";

/**
 * Local-disk storage adapter. Files are stored under UPLOAD_DIR with random keys,
 * never under the public folder, and are only served through an auth-checked route.
 * Swap this module for S3/Supabase Storage in production (same 3 functions).
 */
export function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);

const ALLOWED = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/pdf", "text/plain", "text/markdown", "text/csv", "application/json",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg", "audio/webm", "audio/wav",
]);

export function validateUpload(file: File) {
  if (file.size === 0) throw new HttpError(400, "File is empty");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, `File exceeds ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB limit`);
  if (!ALLOWED.has(file.type)) throw new HttpError(415, `File type ${file.type || "unknown"} is not allowed`);
}

export async function saveFile(file: File) {
  validateUpload(file);
  const ext = path.extname(file.name).replace(/[^.a-z0-9]/gi, "").slice(0, 10);
  const key = randomBytes(16).toString("hex") + ext;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), key), Buffer.from(await file.arrayBuffer()));
  return key;
}

export async function readStored(key: string) {
  if (!/^[a-f0-9]{32}(\.[a-z0-9]+)?$/i.test(key)) throw new HttpError(400, "Bad key");
  return readFile(path.join(uploadDir(), key));
}

export async function removeStored(key: string) {
  await rm(path.join(uploadDir(), key), { force: true });
}
