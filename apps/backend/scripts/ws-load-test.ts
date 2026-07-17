import { createServer } from "http";
import { io as ioClient } from "socket.io-client";
import { createWsServer } from "../src/lib/wsServer.js";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

const NUM_CLIENTS = 100;
const TEST_PORT = 4988;
const TEST_URL = `http://localhost:${TEST_PORT}`;

function createTestToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

async function runLoadTest(): Promise<void> {
  const httpServer = createServer();
  const io = createWsServer(httpServer);

  httpServer.listen(TEST_PORT, async () => {
    console.log(`Load test server listening on port ${TEST_PORT}`);
    console.log(`Connecting ${NUM_CLIENTS} clients...`);

    const connectStart = Date.now();
    const clients: ReturnType<typeof ioClient>[] = [];
    let connected = 0;
    let failed = 0;

    for (let i = 0; i < NUM_CLIENTS; i++) {
      const token = createTestToken(`load-user-${i}`);
      const client = ioClient(TEST_URL, {
        path: "/socket.io",
        auth: { token },
        transports: ["websocket"],
        forceNew: true,
      });

      client.on("connect", () => {
        connected++;
        if (connected + failed === NUM_CLIENTS) {
          const connectTime = Date.now() - connectStart;
          console.log(`\n--- Connection Results ---`);
          console.log(`Connected: ${connected}/${NUM_CLIENTS}`);
          console.log(`Failed: ${failed}/${NUM_CLIENTS}`);
          console.log(`Total connect time: ${connectTime}ms`);
          console.log(`Avg connect time: ${(connectTime / NUM_CLIENTS).toFixed(1)}ms`);

          runEventLatencyTest(clients, io);
        }
      });

      client.on("connect_error", () => {
        failed++;
        if (connected + failed === NUM_CLIENTS) {
          console.log(`Connection failed: ${failed} clients`);
          cleanup(clients, io, httpServer);
        }
      });

      clients.push(client);
    }
  });
}

async function runEventLatencyTest(
  clients: ReturnType<typeof ioClient>[],
  io: ReturnType<typeof createWsServer>,
): Promise<void> {
  console.log(`\n--- Event Latency Test ---`);
  const latencies: number[] = [];
  const NUM_EVENTS = 50;

  for (let i = 0; i < NUM_EVENTS; i++) {
    const targetClient = clients[i % clients.length];
    if (!targetClient?.connected) continue;

    const start = Date.now();
    const eventPromise = new Promise<void>((resolve) => {
      targetClient.once("import:progress", () => {
        latencies.push(Date.now() - start);
        resolve();
      });
    });

    io.to(`user:load-user-${i % clients.length}`).emit("import:progress", {
      jobId: `job-${i}`,
      status: "processing",
    });

    await eventPromise;
  }

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    console.log(`Events sent: ${latencies.length}`);
    console.log(`Avg latency: ${avg.toFixed(1)}ms`);
    console.log(`p50 latency: ${p50}ms`);
    console.log(`p95 latency: ${p95}ms`);
    console.log(`p99 latency: ${p99}ms`);
  }

  console.log(`\n--- Memory Usage ---`);
  const mem = process.memoryUsage();
  console.log(`RSS: ${(mem.rss / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`);

  cleanup(clients, io, createServer().listen(0));
}

function cleanup(
  clients: ReturnType<typeof ioClient>[],
  io: ReturnType<typeof createWsServer>,
  httpServer: ReturnType<typeof createServer>,
): void {
  clients.forEach((c) => c.disconnect());
  io.close();
  httpServer.close();
  console.log("\nLoad test complete.");
  process.exit(0);
}

runLoadTest().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
