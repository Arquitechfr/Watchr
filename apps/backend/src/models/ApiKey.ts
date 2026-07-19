import { Schema, model, Document, Types } from "mongoose";
import crypto from "crypto";

export type ApiKeyScope = "read" | "write";

export interface IApiKey extends Document {
  userId: Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface GeneratedApiKey {
  token: string;
  hash: string;
  prefix: string;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      enum: ["read", "write"],
      required: true,
      default: ["read"],
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export function generateApiKey(): GeneratedApiKey {
  const randomHex = crypto.randomBytes(32).toString("hex");
  const token = `wtc_${randomHex}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const prefix = token.slice(0, 8);
  return { token, hash, prefix };
}

export const ApiKey = model<IApiKey>("ApiKey", apiKeySchema);
