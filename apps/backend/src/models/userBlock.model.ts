import { Schema, model, Document, Types } from "mongoose";

export interface IUserBlock extends Document {
  blockerId: Types.ObjectId;
  blockedId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userBlockSchema = new Schema<IUserBlock>(
  {
    blockerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    blockedId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

userBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const UserBlock = model<IUserBlock>("UserBlock", userBlockSchema);
