/* eslint-disable no-console */
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

async function startServer() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Connected to MongoDB");

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
