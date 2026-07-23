import { Schema, model, Document } from "mongoose";

export type ServiceState = "operational" | "degraded" | "down";

export interface IServiceCheck extends Document {
  name: string;
  status: ServiceState;
  latencyMs: number | null;
  error: string | null;
}

export interface IServiceStatus extends Document {
  overallStatus: ServiceState;
  services: IServiceCheck[];
  createdAt: Date;
}

const serviceCheckSchema = new Schema<IServiceCheck>(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["operational", "degraded", "down"], required: true },
    latencyMs: { type: Number, default: null },
    error: { type: String, default: null },
  },
  { _id: false },
);

const serviceStatusSchema = new Schema<IServiceStatus>(
  {
    overallStatus: { type: String, enum: ["operational", "degraded", "down"], required: true },
    services: { type: [serviceCheckSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

serviceStatusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ServiceStatus = model<IServiceStatus>("ServiceStatus", serviceStatusSchema, "service_status");
