import { Schema, model, Document, Types } from "mongoose";

export type InAppNotificationType =
  | "admin_broadcast"
  | "admin_targeted"
  | "new_episode"
  | "new_release"
  | "comment_reply"
  | "comment_reaction"
  | "comment_like"
  | "comment_deleted"
  | "comment_hidden"
  | "comment_auto_spoiler"
  | "comment_admin_spoiler"
  | "direct_message";

export type InAppNotificationTarget = "all" | "locale" | "user";

export interface IInAppNotification extends Document {
  type: InAppNotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
  target: InAppNotificationTarget;
  locale?: string;
  userId?: string;
  createdBy?: Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inAppNotificationSchema = new Schema<IInAppNotification>(
  {
    type: {
      type: String,
      enum: [
        "admin_broadcast",
        "admin_targeted",
        "new_episode",
        "new_release",
        "comment_reply",
        "comment_reaction",
        "comment_like",
        "comment_deleted",
        "comment_hidden",
        "comment_auto_spoiler",
        "comment_admin_spoiler",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 500 },
    imageUrl: { type: String, required: false },
    data: { type: Schema.Types.Mixed, required: false },
    target: {
      type: String,
      enum: ["all", "locale", "user"],
      required: true,
      default: "all",
      index: true,
    },
    locale: { type: String, required: false },
    userId: { type: String, required: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    expiresAt: { type: Date, required: false, index: true },
  },
  { timestamps: true },
);

inAppNotificationSchema.index({ target: 1, locale: 1, createdAt: -1 });
inAppNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const InAppNotification = model<IInAppNotification>(
  "InAppNotification",
  inAppNotificationSchema,
  "in_app_notifications",
);
