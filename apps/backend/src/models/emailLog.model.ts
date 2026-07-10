import { Schema, model, Document } from "mongoose";

export type EmailTemplate = "welcome" | "reset_password" | "ban_notification" | "comment_deleted" | "comment_hidden" | "comment_spoiler" | "custom";
export type EmailStatus = "sent" | "failed" | "skipped";

export interface IEmailLog extends Document {
  to: string;
  subject: string;
  template: EmailTemplate;
  status: EmailStatus;
  errorMessage?: string;
  htmlContent: string;
  locale?: string;
  triggeredBy?: string;
  createdAt: Date;
}

const emailLogSchema = new Schema<IEmailLog>(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    template: {
      type: String,
      enum: ["welcome", "reset_password", "ban_notification", "comment_deleted", "comment_hidden", "comment_spoiler", "custom"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "skipped"],
      required: true,
      index: true,
    },
    errorMessage: { type: String, required: false },
    htmlContent: { type: String, required: true },
    locale: { type: String, required: false },
    triggeredBy: { type: String, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

emailLogSchema.index({ createdAt: -1 });

export const EmailLog = model<IEmailLog>("EmailLog", emailLogSchema, "email_logs");
