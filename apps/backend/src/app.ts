import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { detectLanguage } from "./middleware/detectLanguage.middleware.js";
import { checkMaintenance } from "./middleware/maintenance.middleware.js";
import { translate } from "./i18n/index.js";
import authRoutes from "./routes/auth.routes.js";
import showRoutes from "./routes/show.routes.js";
import trackingRoutes from "./routes/tracking.routes.js";
import ratingRoutes from "./routes/rating.routes.js";
import upcomingRoutes from "./routes/upcoming.routes.js";
import importRoutes from "./routes/import.routes.js";
import exportRoutes from "./routes/export.routes.js";
import traktRoutes from "./routes/trakt.routes.js";
import imageRoutes from "./routes/image.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import newsRoutes from "./routes/news.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import ciRoutes from "./routes/ci.routes.js";
import favoriteRoutes from "./routes/favorite.routes.js";
import socialRoutes from "./routes/social.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import mobileConfigRoutes from "./routes/internal/mobileConfig.routes.js";
import errorTrackingRoutes from "./routes/internal/errorTracking.routes.js";
import adminRoutes from "./routes/admin/index.js";

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : true;

export function createApp(): Application {
  const app = express();
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
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

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use("/assets", express.static(path.join(__dirname, "../assets")));

  app.use(detectLanguage);

  app.get("/health", (_req: Request, res: Response) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watchr API - Health Check</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: #1a1a1a;
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffffff;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: #1a1a1a;
      border: 1px solid #333333;
      border-radius: 8px;
      padding: 16px 32px;
      margin: 24px 0;
    }
    .status-dot {
      width: 12px;
      height: 12px;
      background: #22c55e;
      border-radius: 50%;
    }
    .status-text {
      color: #22c55e;
      font-weight: 600;
      font-size: 1.25rem;
    }
    .info {
      color: #888888;
      font-size: 0.95rem;
      margin-top: 16px;
    }
    .timestamp {
      color: #666666;
      font-size: 0.85rem;
      margin-top: 8px;
      font-family: 'Courier New', monospace;
    }
    .footer {
      color: #666666;
      font-size: 0.85rem;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #333333;
    }
    .footer a {
      color: #888888;
      text-decoration: none;
    }
    .footer a:hover {
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Health Check</h1>
    
    <div class="status">
      <div class="status-dot"></div>
      <span class="status-text">OK</span>
    </div>
    
    <p class="info">All systems operational</p>
    <p class="timestamp">${new Date().toISOString()}</p>
    
    <div class="footer">
      <p><a href="/">← Back to API</a></p>
    </div>
  </div>
</body>
</html>
    `);
  });

  app.get("/", (_req: Request, res: Response) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watchr API</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: #1a1a1a;
      border-radius: 12px;
      max-width: 800px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffffff;
    }
    .subtitle {
      color: #888888;
      font-size: 1rem;
      margin-bottom: 32px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #1a1a1a;
      border: 1px solid #333333;
      border-radius: 8px;
      padding: 8px 16px;
      margin-bottom: 32px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
    }
    .status-text {
      color: #ffffff;
      font-weight: 500;
      font-size: 0.9rem;
    }
    .endpoints {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 32px;
    }
    .endpoint {
      background: #222222;
      border: 1px solid #333333;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s ease;
    }
    .endpoint:hover {
      background: #2a2a2a;
      border-color: #444444;
    }
    .endpoint-icon {
      font-size: 1.5rem;
      margin-bottom: 8px;
    }
    .endpoint-name {
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 4px;
      font-size: 0.95rem;
    }
    .endpoint-path {
      color: #888888;
      font-size: 0.85rem;
      font-family: 'Courier New', monospace;
    }
    .footer {
      color: #666666;
      font-size: 0.85rem;
      padding-top: 24px;
      border-top: 1px solid #333333;
    }
    .footer a {
      color: #888888;
      text-decoration: none;
    }
    .footer a:hover {
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Watchr API</h1>
    <p class="subtitle">Track your favorite shows and movies</p>
    
    <div class="status">
      <div class="status-dot"></div>
      <span class="status-text">API Online</span>
    </div>
    
    <div class="endpoints">
      <div class="endpoint">
        <div class="endpoint-icon">🔐</div>
        <div class="endpoint-name">Authentication</div>
        <div class="endpoint-path">/api/auth</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-icon">📺</div>
        <div class="endpoint-name">Shows</div>
        <div class="endpoint-path">/api/shows</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-icon">⏱️</div>
        <div class="endpoint-name">Tracking</div>
        <div class="endpoint-path">/api/tracking</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-icon">⭐</div>
        <div class="endpoint-name">Ratings</div>
        <div class="endpoint-path">/api/ratings</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-icon">📥</div>
        <div class="endpoint-name">Import</div>
        <div class="endpoint-path">/api/import</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-icon">💬</div>
        <div class="endpoint-name">Comments</div>
        <div class="endpoint-path">/api/comments</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-icon">🖼️</div>
        <div class="endpoint-name">Images</div>
        <div class="endpoint-path">/api/images</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-icon">📰</div>
        <div class="endpoint-name">News</div>
        <div class="endpoint-path">/api/news</div>
      </div>
    </div>
    
    <div class="footer">
      <p>Health check: <a href="/health">/health</a></p>
    </div>
  </div>
</body>
</html>
    `);
  });

  app.use(checkMaintenance);

  app.use("/api/auth", authRoutes);
  app.use("/api/shows", showRoutes);
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/ratings", ratingRoutes);
  app.use("/api/upcoming", upcomingRoutes);
  app.use("/api/import", importRoutes);
  app.use("/api/export", exportRoutes);
  app.use("/api/trakt", traktRoutes);
  app.use("/import/trakt", traktRoutes);
  app.use("/api/images", imageRoutes);
  app.use("/api/comments", commentRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/favorites", favoriteRoutes);
  app.use("/api/social", socialRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/ci", ciRoutes);
  app.use("/internal", mobileConfigRoutes);
  app.use("/internal", errorTrackingRoutes);
  app.use("/api/admin", adminRoutes);

  app.get("/metrics", async (_req: Request, res: Response) => {
    const { getMetrics, getMetricsContentType } = await import("./lib/wsMetrics.js");
    res.set("Content-Type", getMetricsContentType());
    res.send(await getMetrics());
  });

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: translate("UNKNOWN", req.language),
      },
    });
  });

  app.use(errorMiddleware);

  import("./services/admin/adminNotificationListener.js")
    .then(({ initAdminNotificationListener }) => initAdminNotificationListener())
    .catch(() => {});

  return app;
}

export const app = env.NODE_ENV === "test" ? createApp() : undefined;
