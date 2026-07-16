/* eslint-disable no-console */
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectRedis } from "./lib/redis.js";
import { createWsServer } from "./lib/wsServer.js";
import { posthogClient } from "./lib/posthog.js";
import { captureBackendError } from "./services/errorTracking.service.js";

const app = createApp();

process.on("unhandledRejection", (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  captureBackendError(err).catch(() => {});
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err: Error) => {
  captureBackendError(err).catch(() => {});
  console.error("Uncaught Exception:", err);
});

async function startServer() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Connected to MongoDB");

    await connectRedis();

    const server = app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    const io = createWsServer(server);
    console.log("WebSocket server initialized");

    const { createWsHealthcheckRouter } = await import("./lib/wsHealthcheck.js");
    app.use("/health", createWsHealthcheckRouter(io));

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      io.close(() => {
        console.log("WebSocket server closed");
      });
      await posthogClient.shutdown();
      server.close(async () => {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
        process.exit(0);
      });

      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
