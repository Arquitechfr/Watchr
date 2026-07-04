import { Schema, model, Document } from "mongoose";

export interface ITraktLink extends Document {
  userId: Schema.Types.ObjectId;
  traktUsername: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  autoSync: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const traktLinkSchema = new Schema<ITraktLink>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    traktUsername: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    tokenExpiresAt: {
      type: Date,
      required: true,
    },
    autoSync: {
      type: Boolean,
      default: false,
    },
    lastSyncAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

traktLinkSchema.index({ userId: 1 }, { unique: true });

export const TraktLink = model<ITraktLink>("TraktLink", traktLinkSchema);
