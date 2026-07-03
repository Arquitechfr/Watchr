import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import showRoutes from "./routes/show.routes.js";
import trackingRoutes from "./routes/tracking.routes.js";
import ratingRoutes from "./routes/rating.routes.js";
import upcomingRoutes from "./routes/upcoming.routes.js";
import importRoutes from "./routes/import.routes.js";
import imageRoutes from "./routes/image.routes.js";
import commentRoutes from "./routes/comment.routes.js";

const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) || ["*"];

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/shows", showRoutes);
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/ratings", ratingRoutes);
  app.use("/api/upcoming", upcomingRoutes);
  app.use("/api/import", importRoutes);
  app.use("/api/images", imageRoutes);
  app.use("/api/comments", commentRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  app.use(errorMiddleware);

  return app;
}

export const app = env.NODE_ENV === "test" ? createApp() : undefined;
