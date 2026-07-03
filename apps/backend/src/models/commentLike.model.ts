import { Schema, model, Document } from "mongoose";

export interface ICommentLike extends Document {
  userId: Schema.Types.ObjectId;
  commentId: Schema.Types.ObjectId;
  createdAt: Date;
}

const commentLikeSchema = new Schema<ICommentLike>(
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
  },
  { timestamps: true },
);

commentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });
commentLikeSchema.index({ commentId: 1 });

export const CommentLike = model<ICommentLike>("CommentLike", commentLikeSchema);
