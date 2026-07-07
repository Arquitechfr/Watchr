import { Schema, model, Document } from "mongoose";

export interface EpisodeRef {
  season: number;
  episode: number;
}

export interface IComment extends Document {
  userId: Schema.Types.ObjectId;
  showId: Schema.Types.ObjectId;
  episodeRef?: EpisodeRef;
  parentId?: Schema.Types.ObjectId;
  content: string;
  images: string[];
  isSpoiler: boolean;
  likesCount: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const episodeRefSchema = new Schema<EpisodeRef>(
  {
    season: { type: Number, required: true },
    episode: { type: Number, required: true },
  },
  { _id: false },
);

const commentSchema = new Schema<IComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    showId: {
      type: Schema.Types.ObjectId,
      ref: "Show",
      required: true,
      index: true,
    },
    episodeRef: {
      type: episodeRefSchema,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    isSpoiler: {
      type: Boolean,
      default: false,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

commentSchema.index({ showId: 1, episodeRef: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });

export const Comment = model<IComment>("Comment", commentSchema);
