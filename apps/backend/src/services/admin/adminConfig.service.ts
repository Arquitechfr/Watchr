import { MobileConfig } from "../../models/MobileConfig.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { wsEvents } from "../../lib/wsEvents.js";
import { invalidateMobileConfigCache } from "../../routes/internal/mobileConfig.routes.js";

export async function listAllConfig() {
  const entries = await MobileConfig.find().sort({ key: 1 }).lean();
  return entries.map((e) => ({
    key: e.key,
    value: e.value,
    type: e.type,
    description: e.description ?? "",
    updatedAt: e.updatedAt.toISOString(),
    updatedBy: e.updatedBy,
  }));
}

export async function setConfig(
  key: string,
  value: string,
  type: "string" | "number" | "boolean" | "json",
  updatedBy: string,
  description?: string,
) {
  const existing = await MobileConfig.findOne({ key });
  if (existing) {
    existing.value = value;
    existing.type = type;
    existing.updatedBy = updatedBy;
    if (description !== undefined) {
      existing.description = description;
    }
    await existing.save();
  } else {
    await MobileConfig.create({ key, value, type, updatedBy, description: description ?? "" });
  }

  invalidateMobileConfigCache();

  if (type === "boolean") {
    wsEvents.emit("remote_config_update", { key, value: value === "true" });
  }

  return { key, value, type, description: description ?? "", updatedBy };
}

export async function deleteConfig(key: string): Promise<void> {
  const result = await MobileConfig.deleteOne({ key });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "CONFIG_NOT_FOUND", "Config key not found");
  }
}
