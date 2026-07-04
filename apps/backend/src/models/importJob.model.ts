import { Schema, model, Document } from "mongoose";

export type ImportJobStatus = "pending" | "processing" | "completed" | "failed";
export type ImportJobSource = "tvtime" | "trakt" | "imdb" | "letterboxd" | "watchr" | "unknown";

export interface ImportError {
  line: number;
  reason: string;
}

export interface ImportProgress {
  total: number;
  processed: number;
  matched: number;
  failed: number;
}

export interface IImportJob extends Document {
  userId: Schema.Types.ObjectId;
  status: ImportJobStatus;
  source: ImportJobSource;
  sourceFile: string;
  progress: ImportProgress;
  errorLog: ImportError[];
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

const importErrorSchema = new Schema<ImportError>(
  {
    line: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { _id: false },
);

const importProgressSchema = new Schema<ImportProgress>(
  {
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    matched: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false },
);

const importJobSchema = new Schema<IImportJob>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    source: {
      type: String,
      enum: ["tvtime", "trakt", "imdb", "letterboxd", "watchr", "unknown"],
      default: "unknown",
    },
    sourceFile: {
      type: String,
      required: true,
    },
    progress: {
      type: importProgressSchema,
      default: () => ({ total: 0, processed: 0, matched: 0, failed: 0 }),
    },
    errorLog: {
      type: [importErrorSchema],
      default: [],
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export const ImportJob = model<IImportJob>("ImportJob", importJobSchema);
