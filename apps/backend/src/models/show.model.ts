import { Schema, model, Document } from "mongoose";

export interface Episode {
  episodeNumber: number;
  name?: string;
  overview?: string;
  stillPath?: string;
  airDate?: Date;
}

export interface Season {
  seasonNumber: number;
  episodeCount?: number;
  episodes: Episode[];
}

export interface NextEpisodeToAir {
  season: number;
  episode: number;
  airDate: Date;
}

export interface IShow extends Document {
  tmdbId: number;
  tvdbId?: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  firstAirDate?: Date;
  seasons: Season[];
  nextEpisodeToAir?: NextEpisodeToAir;
  lastSyncedAt?: Date;
  lastEpisodesSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const episodeSchema = new Schema<Episode>(
  {
    episodeNumber: { type: Number, required: true },
    name: { type: String },
    overview: { type: String },
    stillPath: { type: String },
    airDate: { type: Date },
  },
  { _id: false },
);

const seasonSchema = new Schema<Season>(
  {
    seasonNumber: { type: Number, required: true },
    episodeCount: { type: Number },
    episodes: { type: [episodeSchema], default: [] },
  },
  { _id: false },
);

const nextEpisodeToAirSchema = new Schema<NextEpisodeToAir>(
  {
    season: { type: Number, required: true },
    episode: { type: Number, required: true },
    airDate: { type: Date, required: true },
  },
  { _id: false },
);

const showSchema = new Schema<IShow>(
  {
    tmdbId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    tvdbId: {
      type: Number,
      sparse: true,
    },
    type: {
      type: String,
      enum: ["tv", "movie"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    posterPath: {
      type: String,
    },
    overview: {
      type: String,
    },
    firstAirDate: {
      type: Date,
    },
    seasons: {
      type: [seasonSchema],
      default: [],
    },
    nextEpisodeToAir: {
      type: nextEpisodeToAirSchema,
    },
    lastSyncedAt: {
      type: Date,
    },
    lastEpisodesSyncedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

showSchema.index({ title: "text" });

export const Show = model<IShow>("Show", showSchema);
