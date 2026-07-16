/* eslint-disable no-console */
import { z } from "zod";
import dotenv from "dotenv";
import { writeSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../../.env") });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4500),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  REDIS_HOST: z.string().min(1, "REDIS_HOST is required"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required"),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().min(1, "FIREBASE_SERVICE_ACCOUNT_KEY is required"),
  GOOGLE_WEB_CLIENT_ID: z.string().min(1, "GOOGLE_WEB_CLIENT_ID is required"),
  GOOGLE_WEB_CLIENT_SECRET: z.string().min(1, "GOOGLE_WEB_CLIENT_SECRET is required"),
  PUBLIC_URL: z.string().min(1, "PUBLIC_URL is required (e.g. https://api.watchr.app)"),
  MINIO_S3_BUCKET: z.string().min(1, "MINIO_S3_BUCKET is required"),
  MINIO_S3_ENDPOINT: z.string().min(1, "MINIO_S3_ENDPOINT is required"),
  MINIO_S3_REGION: z.string().min(1, "MINIO_S3_REGION is required"),
  MINIO_S3_ACCESS_KEY: z.string().min(1, "MINIO_S3_ACCESS_KEY is required"),
  MINIO_S3_SECRET_KEY: z.string().min(1, "MINIO_S3_SECRET_KEY is required"),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  SMTP_HOST: z.string().default("smtp-relay.brevo.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SENDER_EMAIL: z.string().optional(),
  SMTP_SENDER_NAME: z.string().default("Watchr"),
  BREVO_API_KEY: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  TRAKT_CLIENT_ID: z.string().optional(),
  TRAKT_CLIENT_SECRET: z.string().optional(),
  CI_UPLOAD_TOKEN: z.string().optional(),
  MAKE_WEBHOOK_URL: z.string().optional(),
  MAKE_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  PUSHBULLET_ACCESS_TOKEN: z.string().optional(),
  POSTHOG_API_KEY: z.string().min(1, "POSTHOG_API_KEY is required"),
  POSTHOG_HOST: z.string().default("https://eu.i.posthog.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  const message = `Invalid environment variables:\n${issues.map((issue) => `  - ${issue}`).join("\n")}\n`;
  writeSync(2, message);
  process.exit(1);
}

export const env = parsed.data;

export const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};
