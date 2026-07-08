import { Schema, model, Document } from "mongoose";
import { SUPPORTED_LOCALES, type SupportedLocale } from "../i18n/translations.js";

export type NewsLocale = SupportedLocale;

export interface INewsSource extends Document {
  id: string;
  name: string;
  url: string;
  locale: NewsLocale;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const newsSourceSchema = new Schema<INewsSource>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    locale: {
      type: String,
      enum: Object.values(SUPPORTED_LOCALES),
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const NewsSource = model<INewsSource>("NewsSource", newsSourceSchema);
