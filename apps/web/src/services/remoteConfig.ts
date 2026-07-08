import axios from "axios";
import { DEFAULT_REMOTE_CONFIG, RemoteConfig } from "../config/defaults";

const CACHE_KEY = "remote_config_cache";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

const CONFIG_ENDPOINT = "https://api.watchr.me/internal/mobile-config";

type Listener = (config: RemoteConfig) => void;

class RemoteConfigService {
  private current: RemoteConfig = DEFAULT_REMOTE_CONFIG;
  private listeners = new Set<Listener>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    await this.loadFromCache();
    await this.refresh();
    this.startPolling();
  }

  getConfig(): RemoteConfig {
    return this.current;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refresh(): Promise<void> {
    try {
      const response = await axios.get(CONFIG_ENDPOINT, { timeout: FETCH_TIMEOUT_MS });
      const remote = response.data?.config;
      if (remote && typeof remote === "object") {
        this.current = { ...DEFAULT_REMOTE_CONFIG, ...remote };
        this.notify();
        await this.saveToCache(this.current);
      }
    } catch (err) {
      console.warn("[remoteConfig] refresh \u00e9chou\u00e9, fallback conserv\u00e9:", (err as Error).message);
    }
  }

  private async loadFromCache(): Promise<void> {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RemoteConfig>;
        this.current = { ...DEFAULT_REMOTE_CONFIG, ...parsed };
        this.notify();
      }
    } catch (err) {
      console.warn("[remoteConfig] lecture cache \u00e9chou\u00e9e:", (err as Error).message);
    }
  }

  private async saveToCache(config: RemoteConfig): Promise<void> {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn("[remoteConfig] \u00e9criture cache \u00e9chou\u00e9e:", (err as Error).message);
    }
  }

  private startPolling(): void {
    this.intervalId = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
    this.visibilityHandler = () => {
      if (document.visibilityState === "visible") this.refresh();
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  stopPolling(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.visibilityHandler) document.removeEventListener("visibilitychange", this.visibilityHandler);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.current));
  }
}

export const remoteConfigService = new RemoteConfigService();
