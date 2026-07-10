import { Schema, model, Document, Types } from "mongoose";

export type TicketStatus = "ok" | "error";

export interface IPushTicket extends Document {
  notificationLogId: Types.ObjectId;
  pushToken: string;
  status: TicketStatus;
  errorMessage?: string;
  errorDetails?: string;
  createdAt: Date;
}

const pushTicketSchema = new Schema<IPushTicket>(
  {
    notificationLogId: {
      type: Schema.Types.ObjectId,
      ref: "NotificationLog",
      required: true,
      index: true,
    },
    pushToken: { type: String, required: true },
    status: {
      type: String,
      enum: ["ok", "error"],
      required: true,
    },
    errorMessage: { type: String, required: false },
    errorDetails: { type: String, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

pushTicketSchema.index({ createdAt: -1 });

export const PushTicket = model<IPushTicket>("PushTicket", pushTicketSchema, "push_tickets");
