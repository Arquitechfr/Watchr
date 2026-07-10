import { NewsSource } from "../../models/newsSource.model.js";
import { ApiError } from "../../middleware/error.middleware.js";

export interface CreateNewsSourceInput {
  id: string;
  name: string;
  url: string;
  locale: string;
}

export interface UpdateNewsSourceInput {
  name?: string;
  url?: string;
  locale?: string;
  isActive?: boolean;
}

export async function listAllNewsSources() {
  const sources = await NewsSource.find().sort({ createdAt: 1 }).lean();
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    locale: s.locale,
    isActive: s.isActive,
    createdAt: s.createdAt?.toISOString(),
    updatedAt: s.updatedAt?.toISOString(),
  }));
}

export async function createNewsSource(input: CreateNewsSourceInput) {
  const existing = await NewsSource.findOne({ id: input.id });
  if (existing) {
    throw new ApiError(409, "SOURCE_EXISTS", "News source with this ID already exists");
  }

  const source = await NewsSource.create({
    id: input.id,
    name: input.name,
    url: input.url,
    locale: input.locale,
    isActive: true,
  });

  return {
    id: source.id,
    name: source.name,
    url: source.url,
    locale: source.locale,
    isActive: source.isActive,
  };
}

export async function updateNewsSource(sourceId: string, input: UpdateNewsSourceInput) {
  const source = await NewsSource.findOneAndUpdate(
    { id: sourceId },
    { $set: input },
    { new: true },
  ).lean();

  if (!source) {
    throw new ApiError(404, "SOURCE_NOT_FOUND", "News source not found");
  }

  return {
    id: source.id,
    name: source.name,
    url: source.url,
    locale: source.locale,
    isActive: source.isActive,
  };
}

export async function deleteNewsSource(sourceId: string): Promise<void> {
  const result = await NewsSource.deleteOne({ id: sourceId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "SOURCE_NOT_FOUND", "News source not found");
  }
}

export async function toggleNewsSource(sourceId: string): Promise<{ isActive: boolean }> {
  const source = await NewsSource.findOne({ id: sourceId });
  if (!source) {
    throw new ApiError(404, "SOURCE_NOT_FOUND", "News source not found");
  }

  source.isActive = !source.isActive;
  await source.save();

  return { isActive: source.isActive };
}
