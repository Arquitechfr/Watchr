import { Schema, model, Document, Types } from "mongoose";

export interface IConversation extends Document {
  participantIds: Types.ObjectId[];
  participantKey: string;
  lastMessageId?: Types.ObjectId;
  lastMessageAt: Date;
  archivedBy: Types.ObjectId[];
  mutedBy: Types.ObjectId[];
  deletedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participantIds: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      required: true,
      validate: {
        validator: (v: Types.ObjectId[]) => v.length === 2,
        message: "Conversation must have exactly 2 participants",
      },
    },
    participantKey: {
      type: String,
      required: true,
      unique: true,
    },
    lastMessageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    archivedBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    mutedBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    deletedBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participantIds: 1 });
conversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

export const Conversation = model<IConversation>("Conversation", conversationSchema);
