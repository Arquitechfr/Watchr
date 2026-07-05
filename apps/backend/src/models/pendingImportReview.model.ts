import { Schema, model, Document, Types } from "mongoose";

export type PendingImportReviewStatus = "pending" | "resolved" | "skipped";

export interface IPendingImportReviewCandidate {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  confidenceScore: number;
}

export interface IPendingImportReview extends Document {
  userId: Types.ObjectId;
  importJobId: Types.ObjectId;
  sourceType: "series" | "movie";
  sourceTitle: string;
  sourceYear: number | null;
  tvtimeInternalId: string;
  candidates: IPendingImportReviewCandidate[];
  status: PendingImportReviewStatus;
  resolvedTmdbId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<IPendingImportReviewCandidate>(
  {
    tmdbId: { type: Number, required: true },
    title: { type: String, required: true },
    year: { type: Number, default: null },
    posterPath: { type: String, default: null },
    confidenceScore: { type: Number, required: true },
  },
  { _id: false },
);

const pendingImportReviewSchema = new Schema<IPendingImportReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    importJobId: { type: Schema.Types.ObjectId, ref: "ImportJob", required: true, index: true },
    sourceType: { type: String, enum: ["series", "movie"], required: true },
    sourceTitle: { type: String, required: true },
    sourceYear: { type: Number, default: null },
    tvtimeInternalId: { type: String, required: true },
    candidates: { type: [candidateSchema], default: [] },
    status: {
      type: String,
      enum: ["pending", "resolved", "skipped"],
      default: "pending",
      index: true,
    },
    resolvedTmdbId: { type: Number, default: null },
  },
  { timestamps: true },
);

pendingImportReviewSchema.index({ userId: 1, status: 1 });

export const PendingImportReview = model<IPendingImportReview>(
  "PendingImportReview",
  pendingImportReviewSchema,
);
