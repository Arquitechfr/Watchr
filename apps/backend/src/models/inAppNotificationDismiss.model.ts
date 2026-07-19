import { Schema, model, Document, Types } from "mongoose";

export interface IInAppNotificationDismiss extends Document {
  userId: Types.ObjectId;
  notificationId: Types.ObjectId;
  dismissedAt: Date;
}

const inAppNotificationDismissSchema = new Schema<IInAppNotificationDismiss>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notificationId: { type: Schema.Types.ObjectId, ref: "InAppNotification", required: true },
    dismissedAt: { type: Date, default: () => new Date(), required: true },
  },
  { timestamps: false },
);

inAppNotificationDismissSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

export const InAppNotificationDismiss = model<IInAppNotificationDismiss>(
  "InAppNotificationDismiss",
  inAppNotificationDismissSchema,
  "in_app_notification_dismissals",
);
