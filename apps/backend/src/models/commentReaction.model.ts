import { Schema, model, Document } from "mongoose";

export interface ICommentReaction extends Document {
  userId: Schema.Types.ObjectId;
  commentId: Schema.Types.ObjectId;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentReactionSchema = new Schema<ICommentReaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

commentReactionSchema.index({ userId: 1, commentId: 1, emoji: 1 }, { unique: true });
commentReactionSchema.index({ commentId: 1 });

export const CommentReaction = model<ICommentReaction>("CommentReaction", commentReactionSchema);
