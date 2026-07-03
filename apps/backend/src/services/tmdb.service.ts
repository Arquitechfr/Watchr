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
  runtime?: number;
}

export interface TmdbSeason {
  season_number: number;
  episode_count?: number;
  episodes?: TmdbEpisode[];
}

export interface TmdbCast {
  id: number;
  name?: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface TmdbCrew {
  id: number;
  name?: string;
  job?: string;
  department?: string;
  profile_path?: string | null;
}

export interface TmdbCredits {
  cast?: TmdbCast[];
  crew?: TmdbCrew[];
}

export interface TmdbGenre {
  id: number;
  name?: string;
}

export interface TmdbNetwork {
  id: number;
  name?: string;
  logo_path?: string | null;
}

export interface TmdbCreatedBy {
  id: number;
  name?: string;
  profile_path?: string | null;
}

export interface TmdbProductionCompany {
  id: number;
  name?: string;
  logo_path?: string | null;
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
  genres?: TmdbGenre[];
  status?: string;
  vote_average?: number;
  vote_count?: number;
  episode_run_time?: number[];
  runtime?: number;
  networks?: TmdbNetwork[];
  created_by?: TmdbCreatedBy[];
  production_companies?: TmdbProductionCompany[];
  credits?: TmdbCredits;
  number_of_seasons?: number;
  number_of_episodes?: number;
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

  async searchShows(query: string, language = "en-US"): Promise<TmdbSearchResult[]> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<{ results: TmdbSearchResult[] }>("/search/tv", {
        params: { query, include_adult: false, language },
      });
      return response.data.results || [];
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async searchMovies(query: string, language = "en-US"): Promise<TmdbSearchResult[]> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<{ results: TmdbSearchResult[] }>("/search/movie", {
        params: { query, include_adult: false, language },
      });
      return response.data.results || [];
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getTvDetails(tmdbId: number, language = "en-US"): Promise<TmdbShowDetails> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<TmdbShowDetails>(`/tv/${tmdbId}`, {
        params: { append_to_response: "next_episode_to_air,credits", language },
      });
      return response.data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getTvSeason(tmdbId: number, seasonNumber: number, language = "en-US"): Promise<TmdbSeason> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<TmdbSeason>(
        `/tv/${tmdbId}/season/${seasonNumber}`,
        { params: { language } },
      );
      return response.data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getTvCredits(tmdbId: number, language = "en-US"): Promise<TmdbCredits> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<TmdbCredits>(`/tv/${tmdbId}/credits`, {
        params: { language },
      });
      return response.data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getMovieDetails(tmdbId: number, language = "en-US"): Promise<TmdbShowDetails> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<TmdbShowDetails>(`/movie/${tmdbId}`, {
        params: { append_to_response: "credits", language },
      });
      return response.data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getMovieCredits(tmdbId: number, language = "en-US"): Promise<TmdbCredits> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<TmdbCredits>(`/movie/${tmdbId}/credits`, {
        params: { language },
      });
      return response.data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getTrendingTv(limit = 10, language = "en-US"): Promise<TmdbSearchResult[]> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<{ results: TmdbSearchResult[] }>("/trending/tv/week", {
        params: { language },
      });
      return (response.data.results || []).slice(0, limit);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getTrendingMovies(limit = 10, language = "en-US"): Promise<TmdbSearchResult[]> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<{ results: TmdbSearchResult[] }>("/trending/movie/week", {
        params: { language },
      });
      return (response.data.results || []).slice(0, limit);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getPopularTv(limit = 10, language = "en-US"): Promise<TmdbSearchResult[]> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<{ results: TmdbSearchResult[] }>("/tv/popular", {
        params: { language },
      });
      return (response.data.results || []).slice(0, limit);
    } catch (err) {
      throw this.handleError(err);
    }
  }

  async getPopularMovies(limit = 10, language = "en-US"): Promise<TmdbSearchResult[]> {
    await tmdbRateLimiter.consume();
    try {
      const response = await this.client.get<{ results: TmdbSearchResult[] }>("/movie/popular", {
        params: { language },
      });
      return (response.data.results || []).slice(0, limit);
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
