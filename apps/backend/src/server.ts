/* eslint-disable no-console */
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectRedis } from "./lib/redis.js";

const app = createApp();

async function startServer() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Connected to MongoDB");

    await connectRedis();

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
