import { Schema, model, Document } from "mongoose";

export interface RefreshTokenEntry {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  newReleases: boolean;
  commentReplies: boolean;
  commentReactions: boolean;
  commentLikes: boolean;
  notificationOffsetMinutes: number;
}

export interface IUser extends Document {
  email: string;
  username: string;
  usernameChanged: boolean;
  avatarUrl?: string;
  passwordHash?: string;
  firebaseUid?: string;
  refreshTokens: RefreshTokenEntry[];
  preferredLanguage?: string;
  themePreference: "system" | "light" | "dark";
  notificationPreferences: NotificationPreferences;
  expoPushToken?: string;
  hasCompletedOnboarding: boolean;
  role: "user" | "admin";
  lastLoginAt: Date | null;
  isBanned: boolean;
  bannedAt: Date | null;
  suspendedUntil: Date | null;
  banReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenEntry>(
  {
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } },
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: false,
    },
    firebaseUid: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
    },
    preferredLanguage: {
      type: String,
      required: false,
    },
    themePreference: {
      type: String,
      enum: ["system", "light", "dark"],
      default: "system",
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      index: true,
    },
    usernameChanged: {
      type: Boolean,
      default: false,
    },
    avatarUrl: {
      type: String,
      required: false,
    },
    notificationPreferences: {
      type: {
        pushEnabled: { type: Boolean, default: true },
        emailEnabled: { type: Boolean, default: true },
        newReleases: { type: Boolean, default: true },
        commentReplies: { type: Boolean, default: true },
        commentReactions: { type: Boolean, default: true },
        commentLikes: { type: Boolean, default: true },
        notificationOffsetMinutes: { type: Number, default: 0, min: -180, max: 1440 },
      },
      default: () => ({
        pushEnabled: true,
        emailEnabled: true,
        newReleases: true,
        commentReplies: true,
        commentReactions: true,
        commentLikes: true,
        notificationOffsetMinutes: 0,
      }),
    },
    expoPushToken: {
      type: String,
      required: false,
    },
    hasCompletedOnboarding: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    suspendedUntil: {
      type: Date,
      default: null,
      index: true,
    },
    banReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
