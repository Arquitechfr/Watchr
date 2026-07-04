/* eslint-disable no-console */
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  console.error("Invalid environment variables:");
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};
