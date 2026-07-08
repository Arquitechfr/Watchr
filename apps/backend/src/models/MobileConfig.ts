import { Schema, model, Document } from "mongoose";

export interface IMobileConfig extends Document {
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
  updatedAt: Date;
  updatedBy: string;
}

const mobileConfigSchema = new Schema<IMobileConfig>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    type: { type: String, enum: ["string", "number", "boolean", "json"], required: true, default: "string" },
    updatedBy: { type: String, required: true, default: "cli" },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const MobileConfig = model<IMobileConfig>("MobileConfig", mobileConfigSchema, "mobile_config");
