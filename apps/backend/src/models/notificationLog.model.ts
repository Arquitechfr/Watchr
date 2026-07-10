import { Schema, model, Document, Types } from "mongoose";

export interface INotificationLog extends Document {
  type: "broadcast" | "targeted" | "automated";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sentBy: Types.ObjectId;
  targetCount: number;
  successCount: number;
  failureCount: number;
  triggeredBy?: string;
  locale?: string;
  createdAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
  {
    type: {
      type: String,
      enum: ["broadcast", "targeted", "automated"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: false },
    sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    triggeredBy: { type: String, required: false },
    locale: { type: String, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const NotificationLog = model<INotificationLog>("NotificationLog", notificationLogSchema, "notification_logs");
