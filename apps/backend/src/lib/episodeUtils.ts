import { Season } from "../models/show.model.js";
import { WatchedEpisode } from "../models/watchEntry.model.js";

/**
 * NOTE: These functions intentionally diverge from `calculateWatchStatus` in tracking.service.ts.
 *
 * `calculateWatchStatus` counts ALL episodes (including unaired and specials/season 0) to determine
 * whether a user has "completed" a show. This is correct for status logic — a show is completed when
 * every episode including specials is watched.
 *
 * `getAiredEpisodeCount` and `getAiredWatchedCount` exclude season 0 (specials) and only count
 * aired episodes (airDate <= now). These are used for the PROGRESS BAR displayed to users, which
 * should reflect "how many regular aired episodes have I watched" — not specials, not future episodes.
 *
 * Two different definitions of "total", on purpose. Do not "fix" one to match the other.
 */

export function getAiredEpisodeCount(seasons: Season[]): number {
  const now = new Date();
  return seasons
    .filter((season) => season.seasonNumber !== 0)
    .reduce(
      (sum, season) =>
        sum +
        (season.episodes ?? []).filter(
          (episode) => episode.airDate && new Date(episode.airDate) <= now,
        ).length,
      0,
    );
}

export function getAiredWatchedCount(
  watchedEpisodes: WatchedEpisode[],
  seasons: Season[],
): number {
  const hasSeasonZero = seasons.some((s) => s.seasonNumber === 0);
  if (!hasSeasonZero) return watchedEpisodes.length;

  const seasonZeroEpisodeKeys = new Set<string>();
  for (const season of seasons) {
    if (season.seasonNumber !== 0) continue;
    for (const episode of season.episodes ?? []) {
      seasonZeroEpisodeKeys.add(`${season.seasonNumber}-${episode.episodeNumber}`);
    }
  }

  return watchedEpisodes.filter(
    (ep) => !seasonZeroEpisodeKeys.has(`${ep.season}-${ep.episode}`),
  ).length;
}
