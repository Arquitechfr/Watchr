import { Schema, model, Document } from "mongoose";

export interface IRevolutWebhookEvent extends Document {
  idempotencyKey: string;
  event: string;
  subscriptionId: string;
  processedAt: Date;
}

const schema = new Schema<IRevolutWebhookEvent>(
  {
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    event: { type: String, required: true },
    subscriptionId: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const RevolutWebhookEvent = model<IRevolutWebhookEvent>(
  "RevolutWebhookEvent",
  schema,
);
