import { Schema, model, Document, Types } from "mongoose";
export interface IBreadcrumb {
  timestamp: Date;
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface IDeviceInfo {
  os?: string;
  osVersion?: string;
  deviceModel?: string;
  screenResolution?: string;
}

export interface IUserContext {
  userId?: string;
  username?: string;
}

export interface IErrorEvent extends Document {
  issueId: Types.ObjectId;
  timestamp: Date;
  platform: string;
  appVersion?: string;
  deviceInfo: IDeviceInfo;
  breadcrumbs: IBreadcrumb[];
  userContext?: IUserContext;
  stackTrace?: string;
  extra?: Record<string, unknown>;
}

const errorEventSchema = new Schema<IErrorEvent>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "ErrorIssue",
      required: true,
      index: true,
    },
    timestamp: { type: Date, default: Date.now },
    platform: { type: String, required: true },
    appVersion: { type: String },
    deviceInfo: {
      type: {
        os: { type: String },
        osVersion: { type: String },
        deviceModel: { type: String },
        screenResolution: { type: String },
      },
      default: {},
    },
    breadcrumbs: {
      type: [
        {
          timestamp: { type: Date, default: Date.now },
          type: { type: String },
          message: { type: String },
          data: { type: Schema.Types.Mixed },
        },
      ],
      default: [],
    },
    userContext: {
      type: {
        userId: { type: String },
        username: { type: String },
      },
      default: undefined,
    },
    stackTrace: { type: String },
    extra: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

errorEventSchema.index({ issueId: 1, timestamp: -1 });
errorEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const ErrorEvent = model<IErrorEvent>("ErrorEvent", errorEventSchema, "error_events");
