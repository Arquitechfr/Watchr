import { Server as IoServer, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../services/auth.service.js";
import { wsEvents } from "./wsEvents.js";
import { wsMetrics } from "./wsMetrics.js";
import { log, logError } from "./logger.js";
import { storeEvent, getEventsSince, shouldStoreEvent } from "./wsEventStore.js";

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMITED_EVENTS = new Set(["subscribe:show", "unsubscribe:show"]);

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createUserRoom(userId: string): string {
  return `user:${userId}`;
}

export function createShowRoom(showId: string): string {
  return `show:${showId}`;
}

export function createWsServer(httpServer: HttpServer): IoServer {
  const io = new IoServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) || ["*"],
      credentials: true,
    },
    path: "/socket.io",
  });

  const pubClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    lazyConnect: false,
  });
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      logError("WS", "auth failed — no token", new Error("No token provided"));
      next(new Error("UNAUTHORIZED"));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      log("WS", "authenticated", { userId: payload.sub, socketId: socket.id });
      next();
    } catch (err) {
      logError("WS", "auth failed — invalid token", err);
      next(new Error("INVALID_TOKEN"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    wsMetrics.connectionsTotal.inc();
    wsMetrics.connectedClients.inc();

    socket.join(createUserRoom(userId));
    socket.join("news");

    log("WS", "connected", { userId, socketId: socket.id });

    const rateLimitMap = new Map<string, RateLimitEntry>();

    function checkRateLimit(eventName: string): boolean {
      if (!RATE_LIMITED_EVENTS.has(eventName)) return true;
      const now = Date.now();
      const entry = rateLimitMap.get(eventName);
      if (!entry || now > entry.resetAt) {
        rateLimitMap.set(eventName, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
      }
      entry.count++;
      return entry.count <= RATE_LIMIT_MAX;
    }

    socket.on("subscribe:show", (showId: string) => {
      if (!checkRateLimit("subscribe:show")) return;
      wsMetrics.eventsReceivedTotal.labels({ event: "subscribe:show" }).inc();
      socket.join(createShowRoom(showId));
      log("WS", "subscribe:show", { userId, showId });
    });

    socket.on("unsubscribe:show", (showId: string) => {
      if (!checkRateLimit("unsubscribe:show")) return;
      wsMetrics.eventsReceivedTotal.labels({ event: "unsubscribe:show" }).inc();
      socket.leave(createShowRoom(showId));
      log("WS", "unsubscribe:show", { userId, showId });
    });

    socket.on("replay:since", async (timestamp: number) => {
      wsMetrics.eventsReceivedTotal.labels({ event: "replay:since" }).inc();
      log("WS", "replay:since", { userId, timestamp });
      try {
        const events = await getEventsSince(userId, timestamp);
        for (const stored of events) {
          socket.emit(stored.event, stored.data);
          wsMetrics.eventsSentTotal.labels({ event: stored.event }).inc();
        }
        log("WS", "replay complete", { userId, count: events.length });
      } catch (err) {
        logError("WS", "replay failed", err, { userId });
      }
    });

    socket.on("disconnect", (reason) => {
      wsMetrics.disconnectionsTotal.inc();
      wsMetrics.connectedClients.dec();
      log("WS", "disconnected", { userId, socketId: socket.id, reason });
    });

    socket.on("error", (err) => {
      logError("WS", "socket error", err, { userId, socketId: socket.id });
    });
  });

  function emitToUser(userId: string, event: string, data: unknown): void {
    if (shouldStoreEvent(event)) {
      storeEvent(userId, event, data).catch(() => {});
    }
    io.to(createUserRoom(userId)).emit(event, data);
    wsMetrics.eventsSentTotal.labels({ event }).inc();
  }

  function emitToShow(showId: string, event: string, data: unknown): void {
    io.to(createShowRoom(showId)).emit(event, data);
    wsMetrics.eventsSentTotal.labels({ event }).inc();
  }

  function emitToRoom(room: string, event: string, data: unknown): void {
    io.to(room).emit(event, data);
    wsMetrics.eventsSentTotal.labels({ event }).inc();
  }

  wsEvents.on("import:progress", (data) => {
    emitToUser(data.userId, "import:progress", data);
  });

  wsEvents.on("comment:created", (data) => {
    emitToShow(data.showId, "comment:created", data);
  });

  wsEvents.on("comment:updated", (data) => {
    emitToShow(data.showId, "comment:updated", data);
  });

  wsEvents.on("comment:deleted", (data) => {
    emitToShow(data.showId, "comment:deleted", data);
  });

  wsEvents.on("comment:liked", (data) => {
    emitToShow(data.showId, "comment:liked", data);
  });

  wsEvents.on("comment:reaction", (data) => {
    emitToShow(data.showId, "comment:reaction", data);
  });

  wsEvents.on("comment:hidden", (data) => {
    emitToShow(data.showId, "comment:hidden", data);
  });

  wsEvents.on("comment:spoiler", (data) => {
    emitToShow(data.showId, "comment:spoiler", data);
  });

  wsEvents.on("notification:new", (data) => {
    emitToUser(data.userId, "notification:new", data);
  });

  wsEvents.on("tracking:updated", (data) => {
    emitToUser(data.userId, "tracking:updated", data);
  });

  wsEvents.on("upcoming:updated", (data) => {
    for (const userId of data.userIds) {
      emitToUser(userId, "upcoming:updated", {});
    }
  });

  wsEvents.on("show:updated", (data) => {
    emitToShow(data.showId, "show:updated", data);
  });

  wsEvents.on("news:new", (data) => {
    emitToRoom("news", "news:new", data);
  });

  wsEvents.on("remote_config_update", (data) => {
    io.emit("remote_config_update", data);
    wsMetrics.eventsSentTotal.labels({ event: "remote_config_update" }).inc();
  });

  return io;
}
