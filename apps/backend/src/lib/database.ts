import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectDatabase(uri = env.MONGO_URI): Promise<void> {
  await mongoose.connect(uri);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export async function clearDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  const collections = mongoose.connection.collections;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
}
