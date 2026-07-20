import AsyncStorage from "@react-native-async-storage/async-storage";
import { remoteConfigService } from "../services/remoteConfig";
import { getItem as secureGetItem } from "../utils/secureStorage";

const WIDGET_AUTH_TOKEN_KEY = "widget_auth_token";

function getApiBaseUrl(): string {
  return `${remoteConfigService.getConfig().backend_url}/api`;
}

function getPosterUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return `${getApiBaseUrl()}/images/poster/w200${path}`;
}

async function getAuthToken(): Promise<string | null> {
  try {
    const token = await secureGetItem("accessToken");
    if (token) return token;
  } catch {
    // secure storage may not be available in headless task
  }
  try {
    return await AsyncStorage.getItem(WIDGET_AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Stats Widget ───

export interface WidgetStatsData {
  episodesWatched: number;
  hoursWatched: number;
  watchStreak: number;
  tvCount: number;
  movieCount: number;
}

const WIDGET_STATS_KEY = "widgetStatsData";

export async function loadStatsWidgetData(): Promise<WidgetStatsData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STATS_KEY);
    if (raw) return JSON.parse(raw) as WidgetStatsData;
  } catch { /* ignore */ }
  return null;
}

export async function saveStatsWidgetData(data: WidgetStatsData): Promise<void> {
  try { await AsyncStorage.setItem(WIDGET_STATS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export async function fetchStatsWidgetData(): Promise<WidgetStatsData> {
  try {
    const res = await fetchJson(`${getApiBaseUrl()}/auth/me/stats`);
    if (res.ok) {
      const data = await res.json();
      const stats: WidgetStatsData = {
        episodesWatched: data.episodesWatched ?? 0,
        hoursWatched: data.hoursWatched ?? 0,
        watchStreak: data.watchStreak ?? 0,
        tvCount: data.tvCount ?? 0,
        movieCount: data.movieCount ?? 0,
      };
      await saveStatsWidgetData(stats);
      return stats;
    }
  } catch { /* ignore */ }
  const cached = await loadStatsWidgetData();
  return cached ?? { episodesWatched: 0, hoursWatched: 0, watchStreak: 0, tvCount: 0, movieCount: 0 };
}

// ─── Today Widget ───

export interface WidgetTodayData {
  episodes: WidgetEpisode[];
}

export interface WidgetEpisode {
  showId: string;
  tmdbId: number;
  title: string;
  posterUrl?: string;
  season: number;
  episode: number;
  name?: string;
  airDate?: string;
}

const WIDGET_TODAY_KEY = "widgetTodayData";
const MAX_TODAY_EPISODES = 5;

export async function loadTodayWidgetData(): Promise<WidgetTodayData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_TODAY_KEY);
    if (raw) return JSON.parse(raw) as WidgetTodayData;
  } catch { /* ignore */ }
  return null;
}

export async function saveTodayWidgetData(data: WidgetTodayData): Promise<void> {
  try { await AsyncStorage.setItem(WIDGET_TODAY_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export async function fetchTodayWidgetData(): Promise<WidgetTodayData> {
  try {
    const res = await fetchJson(`${getApiBaseUrl()}/upcoming`);
    if (res.ok) {
      const data = await res.json();
      const episodes: WidgetEpisode[] = (data.today ?? []).map((ep: any) => ({
        showId: ep.showId,
        tmdbId: ep.tmdbId,
        title: ep.title,
        posterUrl: getPosterUrl(ep.posterPath),
        season: ep.season,
        episode: ep.episode,
        name: ep.name,
        airDate: ep.airDate,
      }));
      const todayData: WidgetTodayData = { episodes: episodes.slice(0, MAX_TODAY_EPISODES) };
      await saveTodayWidgetData(todayData);
      return todayData;
    }
  } catch { /* ignore */ }
  const cached = await loadTodayWidgetData();
  return cached ?? { episodes: [] };
}

// ─── Favorites Widget ───

export interface WidgetFavoriteItem {
  showId: string;
  tmdbId: number;
  title: string;
  posterUrl?: string;
  type: "tv" | "movie";
}

export interface WidgetFavoritesData {
  favorites: WidgetFavoriteItem[];
}

const WIDGET_FAVORITES_KEY = "widgetFavoritesData";
const MAX_FAVORITES = 10;

export async function loadFavoritesWidgetData(): Promise<WidgetFavoritesData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_FAVORITES_KEY);
    if (raw) return JSON.parse(raw) as WidgetFavoritesData;
  } catch { /* ignore */ }
  return null;
}

export async function saveFavoritesWidgetData(data: WidgetFavoritesData): Promise<void> {
  try { await AsyncStorage.setItem(WIDGET_FAVORITES_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export async function fetchFavoritesWidgetData(): Promise<WidgetFavoritesData> {
  try {
    const res = await fetchJson(`${getApiBaseUrl()}/favorites?limit=${MAX_FAVORITES}`);
    if (res.ok) {
      const data = await res.json();
      const favorites: WidgetFavoriteItem[] = (data.data ?? []).map((item: any) => ({
        showId: item.showId,
        tmdbId: item.tmdbId,
        title: item.title,
        posterUrl: getPosterUrl(item.posterPath),
        type: item.type,
      }));
      const favData: WidgetFavoritesData = { favorites };
      await saveFavoritesWidgetData(favData);
      return favData;
    }
  } catch { /* ignore */ }
  const cached = await loadFavoritesWidgetData();
  return cached ?? { favorites: [] };
}

// ─── Friends Activity Widget ───

export interface WidgetActivityItem {
  username: string;
  avatarUrl?: string;
  type: "rating" | "comment" | "watchlist_add";
  showTitle: string;
  tmdbId: number;
  posterUrl?: string;
  ratingValue?: number;
  commentContent?: string;
  createdAt: string;
}

export interface WidgetFriendsData {
  activities: WidgetActivityItem[];
}

const WIDGET_FRIENDS_KEY = "widgetFriendsData";
const MAX_ACTIVITIES = 5;

export async function loadFriendsWidgetData(): Promise<WidgetFriendsData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_FRIENDS_KEY);
    if (raw) return JSON.parse(raw) as WidgetFriendsData;
  } catch { /* ignore */ }
  return null;
}

export async function saveFriendsWidgetData(data: WidgetFriendsData): Promise<void> {
  try { await AsyncStorage.setItem(WIDGET_FRIENDS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export async function fetchFriendsWidgetData(): Promise<WidgetFriendsData> {
  try {
    const res = await fetchJson(`${getApiBaseUrl()}/social/activity?limit=${MAX_ACTIVITIES}`);
    if (res.ok) {
      const data = await res.json();
      const activities: WidgetActivityItem[] = (data.data ?? []).map((item: any) => ({
        username: item.user?.username ?? "",
        avatarUrl: item.user?.avatarUrl,
        type: item.type,
        showTitle: item.show?.title ?? "",
        tmdbId: item.show?.tmdbId ?? 0,
        posterUrl: getPosterUrl(item.show?.posterPath),
        ratingValue: item.rating?.value,
        commentContent: item.comment?.content,
        createdAt: item.createdAt,
      }));
      const friendsData: WidgetFriendsData = { activities };
      await saveFriendsWidgetData(friendsData);
      return friendsData;
    }
  } catch { /* ignore */ }
  const cached = await loadFriendsWidgetData();
  return cached ?? { activities: [] };
}
