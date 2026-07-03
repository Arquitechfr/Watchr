import { Schema, model, Document } from "mongoose";

export interface EpisodeRef {
  season: number;
  episode: number;
}

export interface IRating extends Document {
  userId: Schema.Types.ObjectId;
  showId: Schema.Types.ObjectId;
  episodeRef?: EpisodeRef;
  value: number;
  review?: string;
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

const ratingSchema = new Schema<IRating>(
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
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    review: {
      type: String,
      maxlength: 2000,
    },
  },
  { timestamps: true },
);

ratingSchema.index({ userId: 1, showId: 1, episodeRef: 1 }, { unique: true, sparse: true });

export const Rating = model<IRating>("Rating", ratingSchema);
