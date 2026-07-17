import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, buildPublicUrl } from "../lib/s3.js";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function validateFile(mimeType: string, size: number) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(400, "INVALID_FILE_TYPE", "Only jpg, png, and webp are allowed");
  }
  if (size > MAX_FILE_SIZE) {
    throw new ApiError(400, "FILE_TOO_LARGE", "File exceeds 5MB limit");
  }
}

async function uploadFile(buffer: Buffer, mimeType: string, key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.MINIO_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  return buildPublicUrl(key);
}

export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  validateFile(mimeType, buffer.length);
  const ext = EXT_BY_MIME[mimeType] ?? "jpg";
  const key = `avatars/${userId}.${ext}`;
  return uploadFile(buffer, mimeType, key);
}

export async function uploadBanner(
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  validateFile(mimeType, buffer.length);
  const ext = EXT_BY_MIME[mimeType] ?? "jpg";
  const key = `banners/${userId}.${ext}`;
  return uploadFile(buffer, mimeType, key);
}

export async function uploadCommentImage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  validateFile(mimeType, buffer.length);
  const ext = EXT_BY_MIME[mimeType] ?? "jpg";
  const timestamp = Date.now();
  const key = `comments/${userId}/${timestamp}.${ext}`;
  return uploadFile(buffer, mimeType, key);
}
