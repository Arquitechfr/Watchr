import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

vi.mock("../../services/websocket.service", () => ({
  websocketService: {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => listeners.get(event)?.delete(cb);
    }),
    emit: vi.fn((event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((cb) => cb(...args));
    }),
    getConnectionState: vi.fn(() => "connected"),
    onConnectionStateChange: vi.fn(() => () => {}),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

import { websocketService } from "../../services/websocket.service";

describe("WebSocket service integration", () => {
  beforeEach(() => {
    listeners.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should subscribe and unsubscribe to events", () => {
    const callback = vi.fn();
    const unsub = websocketService.on("comment:created", callback);

    expect(websocketService.on).toHaveBeenCalledWith("comment:created", callback);
    expect(listeners.get("comment:created")?.has(callback)).toBe(true);

    unsub();
    expect(listeners.get("comment:created")?.has(callback)).toBe(false);
  });

  it("should call callback when event is emitted", () => {
    const callback = vi.fn();
    websocketService.on("comment:created", callback);

    websocketService.emit("comment:created", { showId: "123", comment: { id: "c1" } });
    expect(callback).toHaveBeenCalledWith({ showId: "123", comment: { id: "c1" } });
  });

  it("should not call callback for different event", () => {
    const callback = vi.fn();
    websocketService.on("comment:created", callback);

    websocketService.emit("comment:liked", { showId: "123" });
    expect(callback).not.toHaveBeenCalled();
  });

  it("should support multiple listeners on same event", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    websocketService.on("notification:new", cb1);
    websocketService.on("notification:new", cb2);

    websocketService.emit("notification:new", { type: "test" });
    expect(cb1).toHaveBeenCalledWith({ type: "test" });
    expect(cb2).toHaveBeenCalledWith({ type: "test" });
  });

  it("should not call callback after unsubscribe", () => {
    const callback = vi.fn();
    const unsub = websocketService.on("tracking:updated", callback);

    websocketService.emit("tracking:updated", { showId: "s1" });
    expect(callback).toHaveBeenCalledTimes(1);

    unsub();
    websocketService.emit("tracking:updated", { showId: "s2" });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
