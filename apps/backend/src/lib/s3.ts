import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

export const s3Client = new S3Client({
  region: env.MINIO_S3_REGION,
  endpoint: env.MINIO_S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.MINIO_S3_ACCESS_KEY,
    secretAccessKey: env.MINIO_S3_SECRET_KEY,
  },
});

export function buildPublicUrl(key: string): string {
  const endpoint = env.MINIO_S3_ENDPOINT.replace(/\/$/, "");
  return `${endpoint}/${env.MINIO_S3_BUCKET}/${key}`;
}
