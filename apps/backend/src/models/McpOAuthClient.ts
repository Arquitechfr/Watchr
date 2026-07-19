import { Schema, model, Document } from "mongoose";
import crypto from "crypto";

export interface IMcpOAuthClient extends Document {
  clientId: string;
  clientSecretHash: string | null;
  clientSecretExpiresAt: Date | null;
  redirectUris: string[];
  clientName?: string;
  clientUri?: string;
  logoUri?: string;
  scope?: string;
  contacts?: string[];
  tosUri?: string;
  policyUri?: string;
  tokenEndpointAuthMethod: string;
  grantTypes: string[];
  responseTypes: string[];
  softwareId?: string;
  softwareVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const mcpOAuthClientSchema = new Schema<IMcpOAuthClient>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientSecretHash: {
      type: String,
      default: null,
    },
    clientSecretExpiresAt: {
      type: Date,
      default: null,
    },
    redirectUris: {
      type: [String],
      required: true,
    },
    clientName: { type: String },
    clientUri: { type: String },
    logoUri: { type: String },
    scope: { type: String },
    contacts: { type: [String] },
    tosUri: { type: String },
    policyUri: { type: String },
    tokenEndpointAuthMethod: {
      type: String,
      default: "none",
    },
    grantTypes: {
      type: [String],
      default: ["authorization_code", "refresh_token"],
    },
    responseTypes: {
      type: [String],
      default: ["code"],
    },
    softwareId: { type: String },
    softwareVersion: { type: String },
  },
  { timestamps: true },
);

export function generateClientId(): string {
  return `mcp_client_${crypto.randomBytes(16).toString("hex")}`;
}

export function generateClientSecret(): { token: string; hash: string } {
  const token = `mcp_secret_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function hashClientSecret(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const McpOAuthClient = model<IMcpOAuthClient>("McpOAuthClient", mcpOAuthClientSchema);
