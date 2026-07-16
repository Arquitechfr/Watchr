import { Schema, model, Document, Types } from "mongoose";

export type ErrorIssueStatus = "unresolved" | "resolved" | "ignored";
export type ErrorSeverity = "error" | "warning" | "info";
export type ErrorPlatform = "ios" | "android" | "web" | "backend";

export interface IErrorIssue extends Document {
  fingerprint: string;
  type: string;
  message: string;
  status: ErrorIssueStatus;
  severity: ErrorSeverity;
  platform: ErrorPlatform;
  stackTrace: string;
  firstSeen: Date;
  lastSeen: Date;
  count: number;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  updatedAt: Date;
}

const errorIssueSchema = new Schema<IErrorIssue>(
  {
    fingerprint: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["unresolved", "resolved", "ignored"],
      default: "unresolved",
      index: true,
    },
    severity: {
      type: String,
      enum: ["error", "warning", "info"],
      default: "error",
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web", "backend"],
      required: true,
      index: true,
    },
    stackTrace: { type: String, default: "" },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    count: { type: Number, default: 1 },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { updatedAt: true, createdAt: false } },
);

errorIssueSchema.index({ status: 1, lastSeen: -1 });
errorIssueSchema.index({ platform: 1, status: 1 });
errorIssueSchema.index({ severity: 1, status: 1 });

export const ErrorIssue = model<IErrorIssue>("ErrorIssue", errorIssueSchema, "error_issues");
