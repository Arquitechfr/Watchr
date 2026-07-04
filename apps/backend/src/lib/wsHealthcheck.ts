import { Router, Request, Response } from "express";
import type { Server as IoServer } from "socket.io";

export function createWsHealthcheckRouter(io: IoServer): Router {
  const router = Router();

  router.get("/ws", (_req: Request, res: Response) => {
    const ns = io.of("/");
    const connectedClients = ns.sockets.size;
    const rooms = ns.adapter.rooms;
    const activeRooms = rooms.size;
    const redisAdapterStatus = ns.adapter.constructor.name;

    res.json({
      status: "ok",
      connectedClients,
      activeRooms,
      redisAdapter: redisAdapterStatus,
      uptime: process.uptime(),
    });
  });

  return router;
}
