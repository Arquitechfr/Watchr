import { Schema, model, Document, Types } from "mongoose";

export type MessageReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "off_topic"
  | "other";

export type MessageReportStatus = "pending" | "resolved" | "dismissed";

export const MESSAGE_REPORT_REASONS: MessageReportReason[] = [
  "spam",
  "harassment",
  "inappropriate",
  "off_topic",
  "other",
];

export interface IMessageReport extends Document {
  reporterId: Types.ObjectId;
  messageId: Types.ObjectId;
  conversationId: Types.ObjectId;
  reason: MessageReportReason;
  status: MessageReportStatus;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageReportSchema = new Schema<IMessageReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: MESSAGE_REPORT_REASONS,
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

messageReportSchema.index({ reporterId: 1, messageId: 1 }, { unique: true });
messageReportSchema.index({ status: 1, createdAt: -1 });

export const MessageReport = model<IMessageReport>("MessageReport", messageReportSchema);
