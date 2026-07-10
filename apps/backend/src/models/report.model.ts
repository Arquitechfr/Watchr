import { Schema, model, Document } from "mongoose";

export type ReportReason =
  | "spam"
  | "unmarked_spoiler"
  | "harassment"
  | "inappropriate"
  | "off_topic";

export type ReportStatus = "pending" | "resolved" | "dismissed";

export const REPORT_REASONS: ReportReason[] = [
  "spam",
  "unmarked_spoiler",
  "harassment",
  "inappropriate",
  "off_topic",
];

export interface IReport extends Document {
  reporterId: Schema.Types.ObjectId;
  commentId: Schema.Types.ObjectId;
  reason: ReportReason;
  status: ReportStatus;
  resolvedBy?: Schema.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

reportSchema.index({ reporterId: 1, commentId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = model<IReport>("Report", reportSchema);
