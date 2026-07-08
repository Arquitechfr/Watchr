import { Schema, model, Document } from "mongoose";

export interface IFavorite extends Document {
  userId: Schema.Types.ObjectId;
  showId: Schema.Types.ObjectId;
  type: "tv" | "movie";
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
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
    },
    type: {
      type: String,
      enum: ["tv", "movie"],
      required: true,
    },
  },
  { timestamps: true },
);

favoriteSchema.index({ userId: 1, showId: 1 }, { unique: true });

export const Favorite = model<IFavorite>("Favorite", favoriteSchema);
