import { Schema, model, Document, Types } from "mongoose";

export interface IAiLog extends Document {
  service: string;
  action: string;
  feature: string;
  status: "success" | "error";
  aiModel: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  userId?: Types.ObjectId;
  errorMessage?: string;
  prompt?: string;
  response?: string;
  metadata: {
    promptLength?: number;
    responseLength?: number;
    messageCount?: number;
    inputCount?: number;
    [key: string]: unknown;
  };
  createdAt: Date;
}

const aiLogSchema = new Schema<IAiLog>(
  {
    service: { type: String, required: true },
    action: { type: String, required: true },
    feature: { type: String, required: true, default: "unknown" },
    status: { type: String, enum: ["success", "error"], required: true },
    aiModel: { type: String, required: true },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    latencyMs: { type: Number, default: 0 },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    errorMessage: { type: String },
    prompt: { type: String },
    response: { type: String },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

aiLogSchema.index({ service: 1, createdAt: -1 });
aiLogSchema.index({ status: 1, createdAt: -1 });
aiLogSchema.index({ feature: 1, createdAt: -1 });
aiLogSchema.index({ userId: 1 });
aiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const AiLog = model<IAiLog>("AiLog", aiLogSchema, "ai_logs");
