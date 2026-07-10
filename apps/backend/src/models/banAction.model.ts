import { Schema, model, Document, Types } from "mongoose";

export interface IBanAction extends Document {
  userId: Types.ObjectId;
  action: "ban" | "unban" | "suspend" | "unsuspend";
  reason: string;
  performedBy: Types.ObjectId;
  delayHours: number;
  scheduledAt: Date;
  executedAt: Date | null;
  status: "pending" | "executed" | "cancelled";
}

const banActionSchema = new Schema<IBanAction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: {
      type: String,
      enum: ["ban", "unban", "suspend", "unsuspend"],
      required: true,
    },
    reason: { type: String, required: true, maxlength: 500 },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    delayHours: { type: Number, default: 0, min: 0, max: 720 },
    scheduledAt: { type: Date, default: () => new Date() },
    executedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "executed", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export const BanAction = model<IBanAction>("BanAction", banActionSchema, "ban_actions");
