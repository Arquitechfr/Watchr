import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AppState, AppStateStatus, Platform } from "react-native";
import { DEFAULT_REMOTE_CONFIG, DEFAULT_REMOTE_CONFIG_DESCRIPTIONS, RemoteConfig, RemoteConfigDescriptions } from "../config/defaults";

const CACHE_KEY = "remote_config_cache";
const CACHE_DESCRIPTIONS_KEY = "remote_config_descriptions_cache";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

const CONFIG_ENDPOINT = "https://api.watchr.me/internal/mobile-config";

type Listener = (config: RemoteConfig) => void;
type DescriptionListener = (descriptions: RemoteConfigDescriptions) => void;

class RemoteConfigService {
  private current: RemoteConfig = DEFAULT_REMOTE_CONFIG;
  private currentDescriptions: RemoteConfigDescriptions = DEFAULT_REMOTE_CONFIG_DESCRIPTIONS;
  private listeners = new Set<Listener>();
  private descListeners = new Set<DescriptionListener>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private initialized = false;

  private wsUnsubscribe: (() => void) | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    await this.loadFromCache();
    await this.refresh();
    this.startPolling();
    this.initWebSocketListener();
  }

  getConfig(): RemoteConfig {
    return this.current;
  }

  getDescriptions(): RemoteConfigDescriptions {
    return this.currentDescriptions;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeDescriptions(listener: DescriptionListener): () => void {
    this.descListeners.add(listener);
    return () => this.descListeners.delete(listener);
  }

  async refresh(): Promise<void> {
    try {
      const response = await axios.get(CONFIG_ENDPOINT, { timeout: FETCH_TIMEOUT_MS });
      const remote = response.data?.config;
      const remoteDescriptions = response.data?.descriptions;
      if (remote && typeof remote === "object") {
        this.current = { ...DEFAULT_REMOTE_CONFIG, ...remote };
        this.notify();
        await this.saveToCache(this.current);
      }
      if (remoteDescriptions && typeof remoteDescriptions === "object") {
        this.currentDescriptions = { ...DEFAULT_REMOTE_CONFIG_DESCRIPTIONS, ...remoteDescriptions };
        this.notifyDescriptions();
        await this.saveDescriptionsToCache(this.currentDescriptions);
      }
    } catch (err) {
      console.warn("[remoteConfig] refresh \u00e9chou\u00e9, fallback conserv\u00e9:", (err as Error).message);
    }
  }

  private async loadFromCache(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RemoteConfig>;
        this.current = { ...DEFAULT_REMOTE_CONFIG, ...parsed };
        this.notify();
      }
      const rawDesc = await AsyncStorage.getItem(CACHE_DESCRIPTIONS_KEY);
      if (rawDesc) {
        const parsedDesc = JSON.parse(rawDesc) as Record<string, string>;
        this.currentDescriptions = { ...DEFAULT_REMOTE_CONFIG_DESCRIPTIONS, ...parsedDesc };
        this.notifyDescriptions();
      }
    } catch (err) {
      console.warn("[remoteConfig] lecture cache \u00e9chou\u00e9e:", (err as Error).message);
    }
  }

  private async saveToCache(config: RemoteConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn("[remoteConfig] \u00e9criture cache \u00e9chou\u00e9e:", (err as Error).message);
    }
  }

  private async saveDescriptionsToCache(descriptions: RemoteConfigDescriptions): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_DESCRIPTIONS_KEY, JSON.stringify(descriptions));
    } catch (err) {
      console.warn("[remoteConfig] \u00e9criture cache descriptions \u00e9chou\u00e9e:", (err as Error).message);
    }
  }

  private startPolling(): void {
    this.intervalId = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
    this.appStateSub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") this.refresh();
    });
  }

  stopPolling(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.appStateSub?.remove();
    this.wsUnsubscribe?.();
    this.wsUnsubscribe = null;
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.current));
  }

  private notifyDescriptions(): void {
    this.descListeners.forEach((l) => l(this.currentDescriptions));
  }

  private initWebSocketListener(): void {
    const setupListener = async () => {
      try {
        const { websocketService } = await import("./websocket.service");
        this.wsUnsubscribe = websocketService.on("remote_config_update", (data: unknown) => {
          const payload = data as { key: string; value: unknown };
          if (payload && typeof payload.key === "string" && "value" in payload) {
            this.current = { ...this.current, [payload.key]: payload.value } as RemoteConfig;
            this.notify();
            this.saveToCache(this.current);
          }
        });
      } catch (err) {
        console.warn("[remoteConfig] WS listener init failed:", (err as Error).message);
      }
    };
    setupListener();
  }
}

export const remoteConfigService = new RemoteConfigService();
