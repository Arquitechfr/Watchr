import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import { log, logError } from "../lib/logger.js";

const CACHE_DIR = path.resolve(".cache", "images");

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type ImageType = "poster" | "still" | "backdrop" | "profile";

const DEFAULT_SIZE: Record<ImageType, string> = {
  poster: "w500",
  still: "w500",
  backdrop: "w1280",
  profile: "w200",
};

export function getImageUrl(size: string, imagePath: string): string {
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${TMDB_IMAGE_BASE}/${size}${normalizedPath}`;
}

export async function proxyImage(
  type: ImageType,
  size: string,
  imagePath: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  const cacheKey = `${type}_${size}_${normalizedPath.replace(/\//g, "_")}`;
  const cachePath = path.join(CACHE_DIR, cacheKey);

  const cached = await readCachedImage(cachePath);
  if (cached) {
    log("ImageService", "cache hit", { type, size, path: imagePath });
    return cached;
  }

  const url = getImageUrl(size, imagePath);
  log("ImageService", "fetch", { url });

  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 15000,
    });
    const contentType = String(response.headers["content-type"] || "image/jpeg");
    const buffer = Buffer.from(response.data);
    await writeCachedImage(cachePath, buffer, contentType);
    return { buffer, contentType };
  } catch (err) {
    logError("ImageService", "fetch failed", err, { url });
    throw new Error("Failed to fetch image");
  }
}

async function readCachedImage(cachePath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const buffer = await fs.readFile(cachePath);
    const metaPath = `${cachePath}.meta`;
    const contentType = await fs.readFile(metaPath, "utf-8");
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function writeCachedImage(cachePath: string, buffer: Buffer, contentType: string): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, buffer);
    await fs.writeFile(`${cachePath}.meta`, contentType);
  } catch (err) {
    logError("ImageService", "cache write failed", err);
  }
}

export function getDefaultSize(type: ImageType): string {
  return DEFAULT_SIZE[type];
}
