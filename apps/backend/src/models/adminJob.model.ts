import { Schema, model, Document, Types } from "mongoose";

export type AdminJobType = "email_broadcast" | "push_broadcast";
export type AdminJobStatus = "pending" | "processing" | "completed" | "failed";
export type AdminJobTarget = "all" | "locale";
export type TranslationStatus = "pending" | "completed" | "failed" | "skipped";

export interface JobTranslation {
  subject?: string;
  htmlContent?: string;
  title?: string;
  body?: string;
}

export interface IAdminJob extends Document {
  type: AdminJobType;
  status: AdminJobStatus;
  subject?: string;
  title?: string;
  body?: string;
  htmlContent?: string;
  target: AdminJobTarget;
  locale?: string;
  data?: Record<string, unknown>;
  targetCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  translations?: Map<string, JobTranslation>;
  sourceLanguage?: string;
  translationStatus?: TranslationStatus;
  sentBy: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminJobSchema = new Schema<IAdminJob>(
  {
    type: {
      type: String,
      enum: ["email_broadcast", "push_broadcast"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      required: true,
      default: "pending",
      index: true,
    },
    subject: { type: String, required: false },
    title: { type: String, required: false },
    body: { type: String, required: false },
    htmlContent: { type: String, required: false },
    target: {
      type: String,
      enum: ["all", "locale"],
      required: true,
      default: "all",
    },
    locale: { type: String, required: false },
    data: { type: Schema.Types.Mixed, required: false },
    targetCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, required: false },
    completedAt: { type: Date, required: false },
    errorMessage: { type: String, required: false },
    translations: {
      type: Map,
      of: Schema.Types.Mixed,
      required: false,
    },
    sourceLanguage: { type: String, required: false },
    translationStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "skipped"],
      required: false,
    },
  },
  { timestamps: true },
);

adminJobSchema.index({ createdAt: -1 });

export const AdminJob = model<IAdminJob>("AdminJob", adminJobSchema, "admin_jobs");
