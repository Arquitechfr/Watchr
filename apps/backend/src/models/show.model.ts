import { Schema, model, Document } from "mongoose";

export interface Episode {
  episodeNumber: number;
  name?: string;
  overview?: string;
  stillPath?: string;
  airDate?: Date;
  runtime?: number;
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

export interface CastMember {
  id: number;
  name?: string;
  character?: string;
  profilePath?: string;
  order?: number;
}

export interface CrewMember {
  id: number;
  name?: string;
  job?: string;
  department?: string;
  profilePath?: string;
}

export interface Genre {
  id: number;
  name?: string;
}

export interface Network {
  id: number;
  name?: string;
  logoPath?: string;
}

export interface ProductionCompany {
  id: number;
  name?: string;
  logoPath?: string;
}

export interface ShowTranslation {
  title?: string;
  overview?: string;
  status?: string;
  genres?: Genre[];
  networks?: Network[];
  productionCompanies?: ProductionCompany[];
  cast?: CastMember[];
  crew?: CrewMember[];
  seasons?: Season[];
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
  cast?: CastMember[];
  crew?: CrewMember[];
  genres?: Genre[];
  status?: string;
  voteAverage?: number;
  voteCount?: number;
  runtime?: number;
  networks?: Network[];
  productionCompanies?: ProductionCompany[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  translations?: Map<string, ShowTranslation>;
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

const castMemberSchema = new Schema<CastMember>(
  {
    id: { type: Number, required: true },
    name: { type: String },
    character: { type: String },
    profilePath: { type: String },
    order: { type: Number },
  },
  { _id: false },
);

const crewMemberSchema = new Schema<CrewMember>(
  {
    id: { type: Number, required: true },
    name: { type: String },
    job: { type: String },
    department: { type: String },
    profilePath: { type: String },
  },
  { _id: false },
);

const genreSchema = new Schema<Genre>(
  {
    id: { type: Number, required: true },
    name: { type: String },
  },
  { _id: false },
);

const networkSchema = new Schema<Network>(
  {
    id: { type: Number, required: true },
    name: { type: String },
    logoPath: { type: String },
  },
  { _id: false },
);

const productionCompanySchema = new Schema<ProductionCompany>(
  {
    id: { type: Number, required: true },
    name: { type: String },
    logoPath: { type: String },
  },
  { _id: false },
);

const translationSchema = new Schema<ShowTranslation>(
  {
    title: { type: String },
    overview: { type: String },
    status: { type: String },
    genres: { type: [genreSchema], default: undefined },
    networks: { type: [networkSchema], default: undefined },
    productionCompanies: { type: [productionCompanySchema], default: undefined },
    cast: { type: [castMemberSchema], default: undefined },
    crew: { type: [crewMemberSchema], default: undefined },
    seasons: { type: [seasonSchema], default: undefined },
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
    cast: {
      type: [castMemberSchema],
      default: undefined,
    },
    crew: {
      type: [crewMemberSchema],
      default: undefined,
    },
    genres: {
      type: [genreSchema],
      default: undefined,
    },
    status: {
      type: String,
    },
    voteAverage: {
      type: Number,
    },
    voteCount: {
      type: Number,
    },
    runtime: {
      type: Number,
    },
    networks: {
      type: [networkSchema],
      default: undefined,
    },
    productionCompanies: {
      type: [productionCompanySchema],
      default: undefined,
    },
    numberOfSeasons: {
      type: Number,
    },
    numberOfEpisodes: {
      type: Number,
    },
    translations: {
      type: Map,
      of: translationSchema,
      default: {},
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

export type LocalizedShow = Omit<IShow, "translations"> & {
  title: string;
  overview?: string;
};

export function getTranslationValue(
  translations: Map<string, ShowTranslation> | Record<string, ShowTranslation> | undefined,
  language: string,
): ShowTranslation | undefined {
  if (!translations) return undefined;
  const baseLanguage = language.split("-")[0];
  if (translations instanceof Map) {
    return translations.get(language) ?? translations.get(baseLanguage);
  }
  if (typeof translations === "object") {
    return (translations as Record<string, ShowTranslation>)[language] ??
      (translations as Record<string, ShowTranslation>)[baseLanguage];
  }
  return undefined;
}

export function getLocalizedShow(show: IShow, language: string): LocalizedShow {
  const translation = getTranslationValue(show.translations, language);
  const base: LocalizedShow = {
    ...show.toObject(),
    title: show.title,
    overview: show.overview,
  };
  if (!translation) {
    return base;
  }

  return {
    ...base,
    title: translation.title ?? base.title,
    overview: translation.overview ?? base.overview,
    status: translation.status ?? base.status,
    genres: translation.genres ?? base.genres,
    networks: translation.networks ?? base.networks,
    productionCompanies: translation.productionCompanies ?? base.productionCompanies,
    cast: translation.cast ?? base.cast,
    crew: translation.crew ?? base.crew,
    seasons: translation.seasons ?? base.seasons,
  };
}

export function getShowTitle(
  show: { title: string; translations?: Map<string, ShowTranslation> | Record<string, ShowTranslation> | undefined },
  language: string,
): string {
  const translation = getTranslationValue(show.translations, language);
  return translation?.title ?? show.title;
}
