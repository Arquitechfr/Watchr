import mongoose from "mongoose";
import axios from "axios";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { redisClient, isRedisAvailable } from "../lib/redis.js";
import { s3Client } from "../lib/s3.js";
import { posthogClient } from "../lib/posthog.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { ServiceStatus, type ServiceState, type IServiceStatus } from "../models/ServiceStatus.js";
import { log, logError } from "../lib/logger.js";
import { invalidateMobileConfigCache } from "../routes/internal/mobileConfig.routes.js";

export interface ServiceCheckResult {
  name: string;
  status: ServiceState;
  latencyMs: number | null;
  error: string | null;
}

const CHECK_TIMEOUT_MS = 5_000;

const ALL_SERVICE_NAMES = [
  "mongodb",
  "redis",
  "tmdb",
  "websocket",
  "email",
  "posthog",
  "firebase",
  "s3",
] as const;

const DEFAULT_PUBLIC_SERVICES = ["mongodb", "redis", "tmdb", "websocket"];

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} check timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function checkMongoDB(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    const ready = mongoose.connection.readyState === 1;
    if (!ready) {
      return { name: "mongodb", status: "down", latencyMs: null, error: "Not connected" };
    }
    await withTimeout(mongoose.connection.db!.admin().ping(), CHECK_TIMEOUT_MS, "mongodb");
    return { name: "mongodb", status: "operational", latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { name: "mongodb", status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkRedis(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    if (!isRedisAvailable()) {
      return { name: "redis", status: "down", latencyMs: null, error: "Not connected" };
    }
    await withTimeout(redisClient.ping(), CHECK_TIMEOUT_MS, "redis");
    return { name: "redis", status: "operational", latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { name: "redis", status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkTMDB(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    await withTimeout(
      axios.get("https://api.themoviedb.org/3/configuration", {
        params: { api_key: env.TMDB_API_KEY },
        timeout: CHECK_TIMEOUT_MS,
      }),
      CHECK_TIMEOUT_MS,
      "tmdb",
    );
    return { name: "tmdb", status: "operational", latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { name: "tmdb", status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

let wsServerRef: { sockets: { size: number } } | null = null;

export function setWsServerRef(ref: { sockets: { size: number } }): void {
  wsServerRef = ref;
}

async function checkWebSocket(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    if (!wsServerRef) {
      return { name: "websocket", status: "degraded", latencyMs: null, error: "WS server not initialized" };
    }
    return { name: "websocket", status: "operational", latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { name: "websocket", status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkEmail(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    const configured = !!env.BREVO_API_KEY || (!!env.SMTP_USER && !!env.SMTP_PASS);
    if (!configured) {
      return { name: "email", status: "degraded", latencyMs: null, error: "Email not configured" };
    }
    if (env.BREVO_API_KEY) {
      await withTimeout(
        axios.get("https://api.brevo.com/v3/account", {
          headers: { "api-key": env.BREVO_API_KEY },
          timeout: CHECK_TIMEOUT_MS,
        }),
        CHECK_TIMEOUT_MS,
        "email",
      );
    }
    return { name: "email", status: "operational", latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { name: "email", status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkPostHog(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    if (!posthogClient) {
      return { name: "posthog", status: "down", latencyMs: null, error: "PostHog client not initialized" };
    }
    return { name: "posthog", status: "operational", latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { name: "posthog", status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkFirebase(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    await withTimeout(firebaseAuth.listUsers(1), CHECK_TIMEOUT_MS, "firebase");
    return { name: "firebase", status: "operational", latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { name: "firebase", status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkS3(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    await withTimeout(
      s3Client.send(new HeadBucketCommand({ Bucket: env.MINIO_S3_BUCKET })),
      CHECK_TIMEOUT_MS,
      "s3",
    );
    return { name: "s3", status: "operational", latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { name: "s3", status: "down", latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

const CHECK_FUNCTIONS: Record<string, () => Promise<ServiceCheckResult>> = {
  mongodb: checkMongoDB,
  redis: checkRedis,
  tmdb: checkTMDB,
  websocket: checkWebSocket,
  email: checkEmail,
  posthog: checkPostHog,
  firebase: checkFirebase,
  s3: checkS3,
};

function computeOverallStatus(results: ServiceCheckResult[]): ServiceState {
  const downCount = results.filter((r) => r.status === "down").length;
  const degradedCount = results.filter((r) => r.status === "degraded").length;
  if (downCount > 0) return "down";
  if (degradedCount > 0) return "degraded";
  return "operational";
}

export async function runAllChecks(): Promise<ServiceCheckResult[]> {
  const results = await Promise.all(
    ALL_SERVICE_NAMES.map((name) => CHECK_FUNCTIONS[name]()),
  );
  return results;
}

export async function runPublicChecks(): Promise<ServiceCheckResult[]> {
  const publicServices = await getPublicServices();
  const results = await Promise.all(
    publicServices.map((name) => CHECK_FUNCTIONS[name]?.() ?? Promise.resolve({ name, status: "down" as ServiceState, latencyMs: null, error: "Unknown service" })),
  );
  return results;
}

export async function saveStatusSnapshot(results: ServiceCheckResult[]): Promise<void> {
  try {
    const overallStatus = computeOverallStatus(results);
    await ServiceStatus.create({
      overallStatus,
      services: results.map((r) => ({ name: r.name, status: r.status, latencyMs: r.latencyMs, error: r.error })),
    });
  } catch (err) {
    logError("status", "failed to save snapshot", err);
  }
}

export async function getStatusHistory(days: number): Promise<IServiceStatus[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return ServiceStatus.find({ createdAt: { $gte: since } }).sort({ createdAt: 1 }).lean() as unknown as IServiceStatus[];
}

export interface UptimeStats {
  uptimePct: number;
  lastIncident: string | null;
}

export async function getUptimeStats(days: number): Promise<Record<string, UptimeStats>> {
  const history = await getStatusHistory(days);
  const stats: Record<string, UptimeStats> = {};

  for (const name of ALL_SERVICE_NAMES) {
    let operational = 0;
    let total = 0;
    let lastIncident: string | null = null;

    for (const snapshot of history) {
      const svc = snapshot.services.find((s) => s.name === name);
      if (!svc) continue;
      total++;
      if (svc.status === "operational") {
        operational++;
      } else if (!lastIncident || snapshot.createdAt > new Date(lastIncident)) {
        lastIncident = snapshot.createdAt.toISOString();
      }
    }

    stats[name] = {
      uptimePct: total > 0 ? Math.round((operational / total) * 10000) / 100 : 100,
      lastIncident,
    };
  }

  return stats;
}

export async function clearStatusHistory(): Promise<number> {
  const result = await ServiceStatus.deleteMany({});
  log("status", "history cleared", { deletedCount: result.deletedCount });
  return result.deletedCount;
}

export async function isMonitorEnabled(): Promise<boolean> {
  try {
    const entry = await MobileConfig.findOne({ key: "status_monitor_enabled" }).lean();
    return entry?.value !== "false";
  } catch {
    return true;
  }
}

export async function getPublicServices(): Promise<string[]> {
  try {
    const entry = await MobileConfig.findOne({ key: "status_public_services" }).lean();
    if (!entry) return DEFAULT_PUBLIC_SERVICES;
    try {
      const parsed = JSON.parse(entry.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return DEFAULT_PUBLIC_SERVICES;
    } catch {
      return DEFAULT_PUBLIC_SERVICES;
    }
  } catch {
    return DEFAULT_PUBLIC_SERVICES;
  }
}

export async function setMonitorEnabled(enabled: boolean): Promise<void> {
  await MobileConfig.findOneAndUpdate(
    { key: "status_monitor_enabled" },
    { $set: { value: String(enabled), type: "boolean", updatedBy: "admin-api", description: "Enable/disable the status monitoring cron job" } },
    { upsert: true },
  );
  invalidateMobileConfigCache();
  log("status", "monitor toggled", { enabled });
}

export async function setPublicServices(services: string[]): Promise<void> {
  await MobileConfig.findOneAndUpdate(
    { key: "status_public_services" },
    { $set: { value: JSON.stringify(services), type: "json", updatedBy: "admin-api", description: "List of service names visible on the public status endpoint" } },
    { upsert: true },
  );
  invalidateMobileConfigCache();
  log("status", "public services updated", { services });
}

export { ALL_SERVICE_NAMES };
