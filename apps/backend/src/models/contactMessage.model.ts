import { Schema, model, Document, Types } from "mongoose";

export type ContactCategory = "bug" | "suggestion" | "question" | "other";
export type ContactStatus = "new" | "read" | "resolved" | "archived";

export interface IContactMessage extends Document {
  userId: Types.ObjectId;
  email: string;
  username: string;
  category: ContactCategory;
  subject: string;
  message: string;
  status: ContactStatus;
  repliedAt?: Date;
  replyBody?: string;
  repliedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["bug", "suggestion", "question", "other"],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "read", "resolved", "archived"],
      default: "new",
      required: true,
      index: true,
    },
    repliedAt: {
      type: Date,
      required: false,
    },
    replyBody: {
      type: String,
      required: false,
    },
    repliedBy: {
      type: Schema.Types.ObjectId,
      required: false,
    },
  },
  { timestamps: true },
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

export const ContactMessage = model<IContactMessage>(
  "ContactMessage",
  contactMessageSchema,
  "contact_messages",
);
