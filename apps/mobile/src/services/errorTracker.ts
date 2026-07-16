import { Platform } from "react-native";

interface Breadcrumb {
  timestamp: number;
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

interface DeviceInfo {
  os?: string;
  osVersion?: string;
  deviceModel?: string;
  screenResolution?: string;
}

interface ErrorPayload {
  type: string;
  message: string;
  stackTrace?: string;
  platform: "ios" | "android" | "web";
  severity?: "error" | "warning" | "info";
  appVersion?: string;
  deviceInfo?: DeviceInfo;
  breadcrumbs?: Breadcrumb[];
  userContext?: { userId?: string; username?: string };
  extra?: Record<string, unknown>;
}

const MAX_BREADCRUMBS = 30;
const MAX_QUEUE_SIZE = 20;
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_THRESHOLD = 5;
const STORAGE_KEY = "watchr_error_queue";
const BREADCRUMB_KEY = "watchr_breadcrumbs";

class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private queue: ErrorPayload[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private deviceInfo: DeviceInfo = {};
  private appVersion: string | undefined;
  private userContext: { userId?: string; username?: string } = {};
  private baseUrl: string | null = null;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.gatherDeviceInfo();
    this.setupGlobalHandlers();
    this.startFlushTimer();
    this.loadQueue();
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setUserContext(ctx: { userId?: string; username?: string }): void {
    this.userContext = { ...this.userContext, ...ctx };
  }

  clearUserContext(): void {
    this.userContext = {};
  }

  addBreadcrumb(type: string, message: string, data?: Record<string, unknown>): void {
    this.breadcrumbs.push({ timestamp: Date.now(), type, message, data });
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs = this.breadcrumbs.slice(-MAX_BREADCRUMBS);
    }
    this.persistBreadcrumbs();
  }

  captureException(err: Error | unknown, extra?: Record<string, unknown>): void {
    if (!this.initialized) return;

    const error = err instanceof Error ? err : new Error(String(err));
    const payload: ErrorPayload = {
      type: error.name || "Error",
      message: error.message,
      stackTrace: error.stack,
      platform: Platform.OS as "ios" | "android" | "web",
      severity: "error",
      appVersion: this.appVersion,
      deviceInfo: this.deviceInfo,
      breadcrumbs: [...this.breadcrumbs],
      userContext: this.userContext,
      extra,
    };

    this.enqueue(payload);
  }

  captureMessage(message: string, level: "error" | "warning" | "info" = "info", extra?: Record<string, unknown>): void {
    if (!this.initialized) return;

    const payload: ErrorPayload = {
      type: "Message",
      message,
      platform: Platform.OS as "ios" | "android" | "web",
      severity: level,
      appVersion: this.appVersion,
      deviceInfo: this.deviceInfo,
      breadcrumbs: [...this.breadcrumbs],
      userContext: this.userContext,
      extra,
    };

    this.enqueue(payload);
  }

  private async gatherDeviceInfo(): Promise<void> {
    try {
      if (Platform.OS !== "web") {
        const Device = await import("expo-device");
        const Application = await import("expo-application");
        const Constants = await import("expo-constants");

        this.deviceInfo = {
          os: Device.osName ?? undefined,
          osVersion: Device.osVersion ?? undefined,
          deviceModel: Device.modelName ?? undefined,
        };
        this.appVersion = Application.nativeApplicationVersion ?? Constants.default.expoConfig?.version;
      } else {
        this.deviceInfo = {
          os: "web",
          osVersion: navigator.userAgent,
          deviceModel: undefined,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
        };
        this.appVersion = undefined;
      }
    } catch {
      // Best effort — device info is optional
    }
  }

  private setupGlobalHandlers(): void {
    if (Platform.OS !== "web") {
      const ErrorUtils = (global as unknown as { ErrorUtils?: { setGlobalHandler?: (fn: (err: unknown, isFatal?: boolean) => void) => void } }).ErrorUtils;
      if (ErrorUtils?.setGlobalHandler) {
        ErrorUtils.setGlobalHandler((err: unknown) => {
          this.captureException(err, { isFatal: true });
        });
      }
    } else {
      window.onerror = (message, source, lineno, colno, error) => {
        const err = error ?? new Error(String(message));
        this.captureException(err, { source, lineno, colno });
        return false;
      };
      window.addEventListener("unhandledrejection", (event) => {
        const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        this.captureException(err, { type: "unhandledrejection" });
      });
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, FLUSH_INTERVAL_MS);
  }

  private enqueue(payload: ErrorPayload): void {
    this.queue.push(payload);
    if (this.queue.length >= FLUSH_THRESHOLD) {
      this.flush().catch(() => {});
    } else {
      this.persistQueue();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const toSend = this.queue.splice(0, MAX_QUEUE_SIZE);
    this.persistQueue();

    const url = this.baseUrl ?? this.getBaseUrl();
    if (!url) return;

    try {
      for (const payload of toSend) {
        await fetch(`${url}/internal/errors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } catch {
      // Re-queue on failure if not too many
      if (this.queue.length < MAX_QUEUE_SIZE) {
        this.queue.unshift(...toSend.slice(0, MAX_QUEUE_SIZE - this.queue.length));
        this.persistQueue();
      }
    }
  }

  private getBaseUrl(): string | null {
    try {
      const { remoteConfigService } = require("./remoteConfig");
      const config = remoteConfigService.getConfig();
      if (config?.backend_url) return config.backend_url;
    } catch {
      // Remote config not yet available
    }
    return null;
  }

  private async persistQueue(): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      } else {
        const AsyncStorage = await import("@react-native-async-storage/async-storage");
        await AsyncStorage.default.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      }
    } catch {
      // Storage failure is non-critical
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      let raw: string | null;
      if (Platform.OS === "web") {
        raw = localStorage.getItem(STORAGE_KEY);
      } else {
        const AsyncStorage = await import("@react-native-async-storage/async-storage");
        raw = await AsyncStorage.default.getItem(STORAGE_KEY);
      }
      if (raw) {
        const parsed = JSON.parse(raw) as ErrorPayload[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.queue = [...parsed, ...this.queue].slice(0, MAX_QUEUE_SIZE);
        }
      }
    } catch {
      // Non-critical
    }
  }

  private async persistBreadcrumbs(): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(BREADCRUMB_KEY, JSON.stringify(this.breadcrumbs));
      } else {
        const AsyncStorage = await import("@react-native-async-storage/async-storage");
        await AsyncStorage.default.setItem(BREADCRUMB_KEY, JSON.stringify(this.breadcrumbs));
      }
    } catch {
      // Non-critical
    }
  }
}

export const errorTracker = new ErrorTracker();
