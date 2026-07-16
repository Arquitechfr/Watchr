import { Schema, model, Document } from "mongoose";

export interface EpisodeRef {
  season: number;
  episode: number;
}

export type CommentSource = 'user' | 'rating' | 'tmdb';

export interface IComment extends Document {
  userId: Schema.Types.ObjectId;
  showId: Schema.Types.ObjectId;
  episodeRef?: EpisodeRef;
  parentId?: Schema.Types.ObjectId;
  content: string;
  images: string[];
  isSpoiler: boolean;
  isHidden: boolean;
  likesCount: number;
  replyCount: number;
  reportCount: number;
  spoilerReportCount: number;
  translations: Map<string, string>;
  originalLanguage?: string;
  source: CommentSource;
  externalId?: string;
  ratingValue?: number;
  repliesDisabled?: boolean;
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
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    spoilerReportCount: {
      type: Number,
      default: 0,
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
    source: {
      type: String,
      enum: ['user', 'rating', 'tmdb'],
      required: true,
      default: 'user',
    },
    externalId: {
      type: String,
      required: false,
    },
    ratingValue: {
      type: Number,
      min: 1,
      max: 5,
      required: false,
    },
    repliesDisabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

commentSchema.index({ showId: 1, episodeRef: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ source: 1 });
commentSchema.index({ showId: 1, externalId: 1 }, { unique: true, sparse: true });

export const Comment = model<IComment>("Comment", commentSchema);
