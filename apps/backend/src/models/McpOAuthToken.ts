import { Schema, model, Document, Types } from "mongoose";
import crypto from "crypto";

export interface IMcpOAuthToken extends Document {
  tokenHash: string;
  tokenPrefix: string;
  userId: Types.ObjectId;
  clientId: string;
  scopes: string[];
  resource: string;
  expiresAt: Date;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

const mcpOAuthTokenSchema = new Schema<IMcpOAuthToken>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenPrefix: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      default: ["read"],
    },
    resource: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    refreshTokenExpiresAt: {
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

export function generateMcpAccessToken(): { token: string; hash: string; prefix: string } {
  const randomHex = crypto.randomBytes(32).toString("hex");
  const token = `mcpo_${randomHex}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const prefix = token.slice(0, 10);
  return { token, hash, prefix };
}

export function generateMcpRefreshToken(): { token: string; hash: string } {
  const randomHex = crypto.randomBytes(32).toString("hex");
  const token = `mcpr_${randomHex}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const McpOAuthToken = model<IMcpOAuthToken>("McpOAuthToken", mcpOAuthTokenSchema);
