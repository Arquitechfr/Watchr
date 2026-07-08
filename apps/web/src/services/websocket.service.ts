import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { remoteConfigService } from "./remoteConfig";

export type WsConnectionState = "connected" | "reconnecting" | "disconnected";

type ConnectionStateListener = (state: WsConnectionState) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private lastEventTimestamp: number = Date.now();
  private connectionStateListeners: Set<ConnectionStateListener> = new Set();

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

  connect(): void {
    if (this.isConnecting || (this.socket && this.socket.connected)) return;
    this.isConnecting = true;

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      this.isConnecting = false;
      return;
    }

    this.socket = io(remoteConfigService.getConfig().backend_url, {
      path: "/socket.io",
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on("connect", () => {
      this.isConnecting = false;
      this.setConnectionState("connected");
      this.socket?.emit("replay:since", this.lastEventTimestamp);
    });

    this.socket.on("disconnect", () => {
      this.setConnectionState("reconnecting");
    });

    this.socket.on("connect_error", async (err: Error) => {
      if (err.message === "INVALID_TOKEN" || err.message === "UNAUTHORIZED") {
        await this.refreshTokenAndReconnect();
      }
    });

    this.socket.on("reconnect_failed", () => {
      this.setConnectionState("disconnected");
      this.isConnecting = false;
    });

    this.socket.io.on("reconnect_attempt", () => {
      this.setConnectionState("reconnecting");
    });
  }

  private async refreshTokenAndReconnect(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        useAuthStore.getState().logout();
        this.isConnecting = false;
        return;
      }

      const response = await fetch(`${remoteConfigService.getConfig().backend_url}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        useAuthStore.getState().logout();
        this.isConnecting = false;
        return;
      }

      const data = (await response.json()) as { accessToken: string; refreshToken: string };
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.isConnecting = false;
      this.connect();
    } catch {
      useAuthStore.getState().logout();
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.setConnectionState("disconnected");
  }

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on(event, callback);
    return () => {
      this.socket?.off(event, callback);
    };
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.socket) return;
    this.socket.emit(event, ...args);
  }

  updateLastEventTimestamp(timestamp: number): void {
    this.lastEventTimestamp = Math.max(this.lastEventTimestamp, timestamp);
  }
}

export const websocketService = new WebSocketService();
