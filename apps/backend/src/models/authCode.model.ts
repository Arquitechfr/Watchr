import { Schema, model, Document } from "mongoose";

export interface IAuthCode extends Document {
  email: string;
  codeHash: string;
  magicLinkToken: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const authCodeSchema = new Schema<IAuthCode>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    magicLinkToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

authCodeSchema.index({ email: 1, createdAt: -1 });

export const AuthCode = model<IAuthCode>("AuthCode", authCodeSchema, "auth_codes");
