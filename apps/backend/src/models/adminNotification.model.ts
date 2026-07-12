import { Schema, model, Document } from "mongoose";

export type AdminNotificationType =
  | "user_registered"
  | "new_comment"
  | "new_rating"
  | "new_contact"
  | "new_report"
  | "import_completed";

export type AdminNotificationSeverity = "info" | "warning" | "critical";

export interface IAdminNotification extends Document {
  type: AdminNotificationType;
  title: string;
  message: string;
  severity: AdminNotificationSeverity;
  readAt: Date | null;
  metadata: {
    refId?: string;
    refType?: string;
    userId?: string;
    username?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

const adminNotificationSchema = new Schema<IAdminNotification>(
  {
    type: {
      type: String,
      enum: [
        "user_registered",
        "new_comment",
        "new_rating",
        "new_contact",
        "new_report",
        "import_completed",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
      required: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

adminNotificationSchema.index({ readAt: 1, createdAt: -1 });

export const AdminNotification = model<IAdminNotification>(
  "AdminNotification",
  adminNotificationSchema,
  "admin_notifications",
);
