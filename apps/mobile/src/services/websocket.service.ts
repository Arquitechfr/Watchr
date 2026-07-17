import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { log } from "../utils/logger";
import { useAuthStore } from "../store/authStore";
import { remoteConfigService } from "./remoteConfig";
import { refreshTokens } from "./tokenRefreshManager";

export type WsConnectionState = "connected" | "reconnecting" | "disconnected";

type ConnectionStateListener = (state: WsConnectionState) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private lastEventTimestamp: number = Date.now();
  private connectionStateListeners: Set<ConnectionStateListener> = new Set();
  private tsPersistTimer: ReturnType<typeof setInterval> | null = null;

  getConnectionState(): WsConnectionState {
    if (!this.socket) return "disconnected";
    if (this.socket.connected) return "connected";
    return "reconnecting";
  }

  onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(listener);
    return () => this.connectionStateListeners.delete(listener);
  }

  private setConnectionState(state: WsConnectionState): void {
    this.connectionStateListeners.forEach((l) => l(state));
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.socket && this.socket.connected)) return;
    this.isConnecting = true;

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      log("WebSocket", "connect skipped — no token");
      this.isConnecting = false;
      return;
    }

    log("WebSocket", "connecting", { url: remoteConfigService.getConfig().backend_url });

    this.socket = io(remoteConfigService.getConfig().backend_url, {
      path: "/socket.io",
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on("connect", () => {
      log("WebSocket", "connected");
      this.isConnecting = false;
      this.setConnectionState("connected");
      this.socket?.emit("replay:since", this.lastEventTimestamp);
    });

    this.socket.on("disconnect", (reason) => {
      log("WebSocket", "disconnected", { reason });
      this.setConnectionState("reconnecting");
    });

    this.socket.on("connect_error", async (err) => {
      log("WebSocket", "connect_error", { message: err.message });

      if (err.message === "INVALID_TOKEN" || err.message === "UNAUTHORIZED") {
        await this.refreshTokenAndReconnect();
      }
    });

    this.socket.on("reconnect_failed", () => {
      log("WebSocket", "reconnect failed — max attempts reached");
      this.setConnectionState("disconnected");
      this.isConnecting = false;
    });

    this.socket.io.on("reconnect_attempt", () => {
      log("WebSocket", "reconnect attempt");
      this.setConnectionState("reconnecting");
    });
  }

  private async refreshTokenAndReconnect(): Promise<void> {
    try {
      log("WebSocket", "token refresh on WS auth error");
      const data = await refreshTokens();
      await useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    } catch (err) {
      log("WebSocket", "token refresh error", err);
      await useAuthStore.getState().logout();
      this.isConnecting = false;
    }
  }

  reconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.connect();
  }

  disconnect(): void {
    if (this.socket) {
      log("WebSocket", "disconnecting");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.setConnectionState("disconnected");
  }

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.socket) {
      log("WebSocket", "on called but no socket", { event });
      return () => {};
    }
    this.socket.on(event, callback);
    return () => {
      this.socket?.off(event, callback);
    };
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.socket) {
      log("WebSocket", "emit called but no socket", { event });
      return;
    }
    this.socket.emit(event, ...args);
  }

  updateLastEventTimestamp(timestamp: number): void {
    this.lastEventTimestamp = Math.max(this.lastEventTimestamp, timestamp);
    this.persistLastEventTimestamp();
  }

  private async persistLastEventTimestamp(): Promise<void> {
    try {
      await AsyncStorage.setItem("lastEventTimestamp", String(this.lastEventTimestamp));
    } catch {
      // Non-critical, ignore
    }
  }

  async loadLastEventTimestamp(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem("lastEventTimestamp");
      if (stored) {
        const ts = parseInt(stored, 10);
        if (!isNaN(ts)) {
          this.lastEventTimestamp = ts;
          log("WebSocket", "loaded lastEventTimestamp from storage", { ts });
        }
      }
    } catch {
      // Non-critical, ignore
    }
  }
}

export const websocketService = new WebSocketService();
