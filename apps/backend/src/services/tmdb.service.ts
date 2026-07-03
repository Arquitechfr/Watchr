import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { tmdbRateLimiter } from "../lib/rateLimiter.js";
import { log, logError } from "../lib/logger.js";

export interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  overview?: string;
  first_air_date?: string;
  release_date?: string;
  media_type?: string;
}

export interface TmdbEpisode {
  episode_number: number;
  name?: string;
  overview?: string;
  still_path?: string | null;
  air_date?: string;
}

export interface TmdbSeason {
  season_number: number;
  episode_count?: number;
  episodes?: TmdbEpisode[];
}

export interface TmdbShowDetails {
  id: number;
  name?: string;
  title?: string;
  poster_path?: string | null;
  overview?: string;
  first_air_date?: string;
  release_date?: string;
  seasons?: TmdbSeason[];
  next_episode_to_air?: {
    season_number: number;
    episode_number: number;
    air_date?: string;
  } | null;
}

class TmdbService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://api.themoviedb.org/3",
      timeout: 10_000,
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      config.params = { ...config.params, api_key: env.TMDB_API_KEY };
      log("TmdbService", "request", { url: config.url, params: config.params });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        log("TmdbService", "response", { url: response.config.url, status: response.status });
        return response;
      },
      (error: AxiosError) => {
        logError("TmdbService", "response error", error, {
          url: error.config?.url,
          status: error.response?.status,
        });
        return Promise.reject(error);
      },
    );
  }

  async searchShows(query: string): Promise<TmdbSearchResult[]> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<{ results: TmdbSearchResult[] }>("/search/tv", {
        params: { query, include_adult: false },
      });
      return response.data.results || [];
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async searchMovies(query: string): Promise<TmdbSearchResult[]> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<{ results: TmdbSearchResult[] }>("/search/movie", {
        params: { query, include_adult: false },
      });
      return response.data.results || [];
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getTvDetails(tmdbId: number): Promise<TmdbShowDetails> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<TmdbShowDetails>(`/tv/${tmdbId}`, {
        params: { append_to_response: "next_episode_to_air" },
      });
      return response.data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getTvSeason(tmdbId: number, seasonNumber: number): Promise<TmdbSeason> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<TmdbSeason>(
        `/tv/${tmdbId}/season/${seasonNumber}`,
      );
      return response.data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getMovieDetails(tmdbId: number): Promise<TmdbShowDetails> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<TmdbShowDetails>(`/movie/${tmdbId}`);
      return response.data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  private handleError(err: unknown): Error {
    if (err instanceof AxiosError) {
      const status = err.response?.status || 500;
      const message = err.response?.data?.status_message || err.message;
      return new ApiError(status >= 500 ? 502 : status, "TMDB_ERROR", `TMDB error: ${message}`);
    }
    return new ApiError(502, "TMDB_ERROR", "TMDB unreachable");
  }
}

export const tmdbService = new TmdbService();
