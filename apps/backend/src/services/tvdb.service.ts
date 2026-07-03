import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";

export interface TvdbSearchResult {
  id: number;
  name?: string;
  image?: string | null;
  overview?: string;
  firstAired?: string;
}

interface TvdbLoginResponse {
  data: {
    token: string;
  };
}

class TvdbService {
  private readonly client: AxiosInstance;
  private token: string | null = null;
  private loginPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: "https://api4.thetvdb.com/v4",
      timeout: 10_000,
    });

    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const token = await this.ensureToken();
      config.headers.set("Authorization", `Bearer ${token}`);
      log("TvdbService", "request", { url: config.url, params: config.params });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        log("TvdbService", "response", { url: response.config.url, status: response.status });
        return response;
      },
      async (error: AxiosError) => {
        logError("TvdbService", "response error", error, {
          url: error.config?.url,
          status: error.response?.status,
        });
        if (error.response?.status === 401 && this.token) {
          this.token = null;
        }
        return Promise.reject(error);
      },
    );
  }

  private async ensureToken(): Promise<string> {
    if (this.token) return this.token;
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = this.login();
    try {
      this.token = await this.loginPromise;
      return this.token;
    } finally {
      this.loginPromise = null;
    }
  }

  private async login(): Promise<string> {
    try {
      log("TvdbService", "login start");
      const body: { apikey: string; pin?: string } = { apikey: env.TVDB_API_KEY };
      if (env.TVDB_PIN) {
        body.pin = env.TVDB_PIN;
      }
      const response = await axios.post<TvdbLoginResponse>("https://api4.thetvdb.com/v4/login", body);
      const token = response.data.data.token;
      log("TvdbService", "login success", { tokenPreview: token.slice(0, 8) });
      return token;
    } catch (err) {
      logError("TvdbService", "login failed", err);
      throw this.handleError(err);
    }
  }

  async searchShows(query: string): Promise<TvdbSearchResult[]> {
    try {
      const response = await this.client.get<{ data: TvdbSearchResult[] }>("/search", {
        params: { q: query, type: "series" },
      });
      return response.data.data || [];
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async searchMovies(query: string): Promise<TvdbSearchResult[]> {
    try {
      const response = await this.client.get<{ data: TvdbSearchResult[] }>("/search", {
        params: { q: query, type: "movie" },
      });
      return response.data.data || [];
    } catch (err) {
      throw this.handleError(err);
    }
  }

  private handleError(err: unknown): Error {
    if (err instanceof AxiosError) {
      const status = err.response?.status || 500;
      const message = err.response?.data?.message || err.message;
      return new ApiError(status >= 500 ? 502 : status, "TVDB_ERROR", `TVDB error: ${message}`);
    }
    return new ApiError(502, "TVDB_ERROR", "TVDB unreachable");
  }
}

export const tvdbService = new TvdbService();
