import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { Server as IoServer } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { createWsServer } from "../src/lib/wsServer.js";
import { wsEvents } from "../src/lib/wsEvents.js";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

const TEST_PORT = 4999;
const TEST_URL = `http://localhost:${TEST_PORT}`;

function createTestToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

function connectClient(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(TEST_URL, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
    });
    client.on("connect", () => resolve(client));
    client.on("connect_error", (err: Error) => reject(err));
    setTimeout(() => reject(new Error("Connection timeout")), 3000);
  });
}

function waitForEvent(socket: ClientSocket, event: string, timeout = 3000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
    socket.once(event, (data: unknown) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe("WebSocket E2E", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: IoServer;

  beforeAll(() => {
    httpServer = createServer();
    io = createWsServer(httpServer);
    httpServer.listen(TEST_PORT);
  });

  afterAll(() => {
    io.close();
    httpServer.close();
    wsEvents.removeAllListeners();
  });

  it("should reject connection without token", async () => {
    await new Promise<void>((resolve, reject) => {
      const client = ioClient(TEST_URL, {
        path: "/socket.io",
        transports: ["websocket"],
        forceNew: true,
      });
      client.on("connect_error", (err: Error) => {
        expect(err.message).toBe("UNAUTHORIZED");
        client.disconnect();
        resolve();
      });
      client.on("connect", () => {
        client.disconnect();
        reject(new Error("Should not connect without token"));
      });
      setTimeout(() => {
        client.disconnect();
        reject(new Error("Timeout"));
      }, 3000);
    });
  });

  it("should accept connection with valid token", async () => {
    const token = createTestToken("user-test-1");
    const client = await connectClient(token);
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it("should deliver comment:created to subscribed clients", async () => {
    const tokenA = createTestToken("user-a");
    const tokenB = createTestToken("user-b");
    const clientA = await connectClient(tokenA);
    const clientB = await connectClient(tokenB);

    clientA.emit("subscribe:show", "show-123");
    clientB.emit("subscribe:show", "show-123");

    await new Promise((resolve) => setTimeout(resolve, 200));

    const eventPromise = waitForEvent(clientB, "comment:created");
    wsEvents.emit("comment:created", {
      showId: "show-123",
      comment: { id: "c1", content: "Hello" },
    });

    const data = await eventPromise;
    expect(data).toMatchObject({ showId: "show-123" });

    clientA.disconnect();
    clientB.disconnect();
  });

  it("should deliver comment:liked to subscribed clients", async () => {
    const tokenA = createTestToken("user-a-like");
    const tokenB = createTestToken("user-b-like");
    const clientA = await connectClient(tokenA);
    const clientB = await connectClient(tokenB);

    clientA.emit("subscribe:show", "show-like");
    clientB.emit("subscribe:show", "show-like");

    await new Promise((resolve) => setTimeout(resolve, 200));

    const eventPromise = waitForEvent(clientB, "comment:liked");
    wsEvents.emit("comment:liked", {
      showId: "show-like",
      commentId: "c1",
      likesCount: 5,
    });

    const data = await eventPromise;
    expect(data).toMatchObject({ commentId: "c1", likesCount: 5 });

    clientA.disconnect();
    clientB.disconnect();
  });

  it("should deliver notification:new to user room", async () => {
    const token = createTestToken("user-notif");
    const client = await connectClient(token);

    const eventPromise = waitForEvent(client, "notification:new");
    wsEvents.emit("notification:new", {
      userId: "user-notif",
      notification: { type: "test", title: "Test", body: "Body" },
    });

    const data = await eventPromise;
    expect(data).toMatchObject({ notification: { type: "test" } });

    client.disconnect();
  });

  it("should deliver import:progress to user room", async () => {
    const token = createTestToken("user-import");
    const client = await connectClient(token);

    const eventPromise = waitForEvent(client, "import:progress");
    wsEvents.emit("import:progress", {
      userId: "user-import",
      jobId: "job-1",
      status: "processing",
      progress: { total: 10, processed: 5, matched: 3, failed: 0 },
    });

    const data = await eventPromise;
    expect(data).toMatchObject({ jobId: "job-1", status: "processing" });

    client.disconnect();
  });

  it("should deliver tracking:updated to user room", async () => {
    const token = createTestToken("user-tracking");
    const client = await connectClient(token);

    const eventPromise = waitForEvent(client, "tracking:updated");
    wsEvents.emit("tracking:updated", {
      userId: "user-tracking",
      showId: "show-track",
    });

    const data = await eventPromise;
    expect(data).toMatchObject({ showId: "show-track" });

    client.disconnect();
  });

  it("should deliver news:new to all clients", async () => {
    const token = createTestToken("user-news");
    const client = await connectClient(token);

    const eventPromise = waitForEvent(client, "news:new");
    wsEvents.emit("news:new", { articles: [{ title: "Breaking" }] });

    const data = await eventPromise;
    expect(data).toMatchObject({ articles: [{ title: "Breaking" }] });

    client.disconnect();
  });
});
