import { Schema, model, Document } from "mongoose";

export interface IVipFeature extends Document {
  icon: string;
  labelKey: string;
  translations: Map<string, string>;
  descriptionTranslations: Map<string, string>;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vipFeatureSchema = new Schema<IVipFeature>(
  {
    icon: { type: String, required: true },
    labelKey: { type: String, required: true, unique: true, index: true },
    translations: {
      type: Map,
      of: String,
      required: true,
      default: new Map(),
    },
    descriptionTranslations: {
      type: Map,
      of: String,
      required: true,
      default: new Map(),
    },
    order: { type: Number, required: true, default: 0, index: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

export const VipFeature = model<IVipFeature>("VipFeature", vipFeatureSchema, "vip_features");
