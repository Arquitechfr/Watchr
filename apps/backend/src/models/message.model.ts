import { Schema, model, Document, Types } from "mongoose";

export type MessageType = "text" | "show";

export interface MessageAttachment {
  type: "show" | "image";
  showTmdbId?: number;
  showTitle?: string;
  showPosterPath?: string;
  imageUrl?: string;
}

export interface MessageReaction {
  userId: Types.ObjectId;
  emoji: string;
}

export interface MessageEditHistoryEntry {
  content: string;
  editedAt: Date;
}

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  attachments: MessageAttachment[];
  translations: Map<string, string>;
  originalLanguage?: string;
  readBy: Types.ObjectId[];
  editedAt: Date | null;
  editHistory: MessageEditHistoryEntry[];
  isDeleted: boolean;
  isSystemMessage: boolean;
  reactions: MessageReaction[];
  reportCount: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<MessageAttachment>(
  {
    type: { type: String, enum: ["show", "image"], required: true },
    showTmdbId: { type: Number, required: false },
    showTitle: { type: String, required: false },
    showPosterPath: { type: String, required: false },
    imageUrl: { type: String, required: false },
  },
  { _id: false },
);

const reactionSchema = new Schema<MessageReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false },
);

const editHistorySchema = new Schema<MessageEditHistoryEntry>(
  {
    content: { type: String, required: true },
    editedAt: { type: Date, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
      default: "",
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    translations: {
      type: Map,
      of: String,
      default: new Map(),
    },
    originalLanguage: {
      type: String,
      default: null,
    },
    readBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    editedAt: {
      type: Date,
      default: null,
    },
    editHistory: {
      type: [editHistorySchema],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isSystemMessage: {
      type: Boolean,
      default: false,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

export const Message = model<IMessage>("Message", messageSchema);
