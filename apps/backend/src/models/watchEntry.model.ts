import { Schema, model, Document } from "mongoose";

export interface WatchedEpisode {
  season: number;
  episode: number;
  watchedAt: Date;
}

export type WatchStatus = "watching" | "completed" | "plan_to_watch" | "dropped";

export interface IWatchEntry extends Document {
  userId: Schema.Types.ObjectId;
  showId: Schema.Types.ObjectId;
  status: WatchStatus;
  watchedEpisodes: WatchedEpisode[];
  currentSeason?: number;
  currentEpisode?: number;
  updatedAt: Date;
  createdAt: Date;
}

const watchedEpisodeSchema = new Schema<WatchedEpisode>(
  {
    season: { type: Number, required: true },
    episode: { type: Number, required: true },
    watchedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const watchEntrySchema = new Schema<IWatchEntry>(
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
    status: {
      type: String,
      enum: ["watching", "completed", "plan_to_watch", "dropped"],
      required: true,
    },
    watchedEpisodes: {
      type: [watchedEpisodeSchema],
      default: [],
    },
    currentSeason: { type: Number },
    currentEpisode: { type: Number },
  },
  { timestamps: true },
);

watchEntrySchema.index({ userId: 1, showId: 1 }, { unique: true });
watchEntrySchema.index({ userId: 1, status: 1 });

export const WatchEntry = model<IWatchEntry>("WatchEntry", watchEntrySchema);
