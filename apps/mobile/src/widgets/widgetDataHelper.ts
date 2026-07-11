import AsyncStorage from "@react-native-async-storage/async-storage";
import { remoteConfigService } from "../services/remoteConfig";
import { getItem as secureGetItem } from "../utils/secureStorage";

export type WidgetTab = "unwatched" | "upcoming";

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

export interface WidgetData {
  unwatched: WidgetEpisode[];
  upcoming: WidgetEpisode[];
}

const WIDGET_DATA_KEY = "widgetData";
const WIDGET_TAB_KEY = "widgetActiveTab";
const MAX_EPISODES = 5;

function getApiBaseUrl(): string {
  return `${remoteConfigService.getConfig().backend_url}/api`;
}

function getPosterUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return `${getApiBaseUrl()}/images/poster/w200${path}`;
}

export async function getWidgetActiveTab(): Promise<WidgetTab> {
  try {
    const tab = await AsyncStorage.getItem(WIDGET_TAB_KEY);
    return tab === "upcoming" ? "upcoming" : "unwatched";
  } catch {
    return "unwatched";
  }
}

export async function setWidgetActiveTab(tab: WidgetTab): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_TAB_KEY, tab);
  } catch {
    // ignore
  }
}

export async function loadWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) {
      return JSON.parse(raw) as WidgetData;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function saveWidgetData(data: WidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await secureGetItem("accessToken");
  } catch {
    return null;
  }
}

interface UnwatchedApiResponse {
  shows: Array<{
    showId: string;
    tmdbId: number;
    title: string;
    posterPath?: string;
    unwatchedEpisodes: Array<{
      season: number;
      episode: number;
      name?: string;
      airDate?: string;
    }>;
  }>;
}

interface UpcomingApiResponse {
  today: Array<{
    showId: string;
    tmdbId: number;
    title: string;
    posterPath?: string;
    season: number;
    episode: number;
    name?: string;
    airDate: string;
  }>;
  thisWeek: Array<{
    showId: string;
    tmdbId: number;
    title: string;
    posterPath?: string;
    season: number;
    episode: number;
    name?: string;
    airDate: string;
  }>;
  nextWeek: Array<{
    showId: string;
    tmdbId: number;
    title: string;
    posterPath?: string;
    season: number;
    episode: number;
    name?: string;
    airDate: string;
  }>;
  later: Array<{
    showId: string;
    tmdbId: number;
    title: string;
    posterPath?: string;
    season: number;
    episode: number;
    name?: string;
    airDate: string;
  }>;
}

export async function fetchWidgetData(): Promise<WidgetData> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const [unwatchedRes, upcomingRes] = await Promise.all([
      fetch(`${baseUrl}/tracking/unwatched?type=tv`, {
        headers,
        signal: controller.signal,
      }),
      fetch(`${baseUrl}/upcoming`, {
        headers,
        signal: controller.signal,
      }),
    ]);

    clearTimeout(timeoutId);

    let unwatchedEpisodes: WidgetEpisode[] = [];
    let upcomingEpisodes: WidgetEpisode[] = [];

    if (unwatchedRes.ok) {
      const data = (await unwatchedRes.json()) as UnwatchedApiResponse;
      const flat: WidgetEpisode[] = [];
      for (const show of data.shows) {
        for (const ep of show.unwatchedEpisodes) {
          flat.push({
            showId: show.showId,
            tmdbId: show.tmdbId,
            title: show.title,
            posterUrl: getPosterUrl(show.posterPath),
            season: ep.season,
            episode: ep.episode,
            name: ep.name,
            airDate: ep.airDate,
          });
        }
      }
      flat.sort((a, b) => {
        const aDate = a.airDate ? new Date(a.airDate).getTime() : 0;
        const bDate = b.airDate ? new Date(b.airDate).getTime() : 0;
        return bDate - aDate;
      });
      unwatchedEpisodes = flat.slice(0, MAX_EPISODES);
    }

    if (upcomingRes.ok) {
      const data = (await upcomingRes.json()) as UpcomingApiResponse;
      const all = [...data.today, ...data.thisWeek, ...data.nextWeek, ...data.later];
      upcomingEpisodes = all
        .map((ep) => ({
          showId: ep.showId,
          tmdbId: ep.tmdbId,
          title: ep.title,
          posterUrl: getPosterUrl(ep.posterPath),
          season: ep.season,
          episode: ep.episode,
          name: ep.name,
          airDate: ep.airDate,
        }))
        .slice(0, MAX_EPISODES);
    }

    const widgetData: WidgetData = { unwatched: unwatchedEpisodes, upcoming: upcomingEpisodes };
    await saveWidgetData(widgetData);
    return widgetData;
  } catch {
    clearTimeout(timeoutId);
    const cached = await loadWidgetData();
    return cached ?? { unwatched: [], upcoming: [] };
  }
}

export async function markEpisodeWatched(
  showId: string,
  season: number,
  episode: number,
): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;

  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${baseUrl}/tracking/${showId}/toggle-episode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ season, episode, watched: true }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

export function formatWidgetDataForStorage(
  unwatchedShows: Array<{
    showId: string;
    tmdbId: number;
    title: string;
    posterPath?: string;
    unwatchedEpisodes: Array<{ season: number; episode: number; name?: string; airDate?: string }>;
  }>,
  upcomingData: {
    today: Array<{ showId: string; tmdbId: number; title: string; posterPath?: string; season: number; episode: number; name?: string; airDate: string }>;
    thisWeek: Array<{ showId: string; tmdbId: number; title: string; posterPath?: string; season: number; episode: number; name?: string; airDate: string }>;
    nextWeek: Array<{ showId: string; tmdbId: number; title: string; posterPath?: string; season: number; episode: number; name?: string; airDate: string }>;
    later: Array<{ showId: string; tmdbId: number; title: string; posterPath?: string; season: number; episode: number; name?: string; airDate: string }>;
  },
): WidgetData {
  const flatUnwatched: WidgetEpisode[] = [];
  for (const show of unwatchedShows) {
    for (const ep of show.unwatchedEpisodes) {
      flatUnwatched.push({
        showId: show.showId,
        tmdbId: show.tmdbId,
        title: show.title,
        posterUrl: getPosterUrl(show.posterPath),
        season: ep.season,
        episode: ep.episode,
        name: ep.name,
        airDate: ep.airDate,
      });
    }
  }
  flatUnwatched.sort((a, b) => {
    const aDate = a.airDate ? new Date(a.airDate).getTime() : 0;
    const bDate = b.airDate ? new Date(b.airDate).getTime() : 0;
    return bDate - aDate;
  });

  const allUpcoming = [
    ...upcomingData.today,
    ...upcomingData.thisWeek,
    ...upcomingData.nextWeek,
    ...upcomingData.later,
  ].map((ep) => ({
    showId: ep.showId,
    tmdbId: ep.tmdbId,
    title: ep.title,
    posterUrl: getPosterUrl(ep.posterPath),
    season: ep.season,
    episode: ep.episode,
    name: ep.name,
    airDate: ep.airDate,
  }));

  return {
    unwatched: flatUnwatched.slice(0, MAX_EPISODES),
    upcoming: allUpcoming.slice(0, MAX_EPISODES),
  };
}
