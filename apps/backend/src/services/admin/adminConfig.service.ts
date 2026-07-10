import { MobileConfig } from "../../models/MobileConfig.js";
import { ApiError } from "../../middleware/error.middleware.js";

export async function listAllConfig() {
  const entries = await MobileConfig.find().sort({ key: 1 }).lean();
  return entries.map((e) => ({
    key: e.key,
    value: e.value,
    type: e.type,
    updatedAt: e.updatedAt.toISOString(),
    updatedBy: e.updatedBy,
  }));
}

export async function setConfig(
  key: string,
  value: string,
  type: "string" | "number" | "boolean" | "json",
  updatedBy: string,
) {
  const existing = await MobileConfig.findOne({ key });
  if (existing) {
    existing.value = value;
    existing.type = type;
    existing.updatedBy = updatedBy;
    await existing.save();
  } else {
    await MobileConfig.create({ key, value, type, updatedBy });
  }

  return { key, value, type, updatedBy };
}

export async function deleteConfig(key: string): Promise<void> {
  const result = await MobileConfig.deleteOne({ key });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "CONFIG_NOT_FOUND", "Config key not found");
  }
}
