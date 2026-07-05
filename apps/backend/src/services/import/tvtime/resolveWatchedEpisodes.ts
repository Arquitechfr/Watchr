import { Types } from "mongoose";
import { Show, Season } from "../../../models/show.model.js";
import { WatchEntry, WatchedEpisode } from "../../../models/watchEntry.model.js";
import { tmdbService } from "../../tmdb.service.js";
import { log, logError } from "../../../lib/logger.js";
import type { TvTimeEpisodeEntry, TmdbMatchResult } from "./types.js";

export interface MatchedSeries {
  tmdbId: number;
  showId: Types.ObjectId;
  sId: string;
}

/**
 * Find the last watched episode from the export for a given series.
 * Returns the max (season, episode) pair.
 */
function findLastWatchedEpisode(
  sId: string,
  episodeEntries: TvTimeEpisodeEntry[],
): { season: number; episode: number; entry: TvTimeEpisodeEntry | null } {
  let maxSeason = 0;
  let maxEpisode = 0;
  let lastEntry: TvTimeEpisodeEntry | null = null;

  for (const ep of episodeEntries) {
    if (ep.sId !== sId) continue;
    if (ep.seasonNumber > maxSeason || (ep.seasonNumber === maxSeason && ep.episodeNumber > maxEpisode)) {
      maxSeason = ep.seasonNumber;
      maxEpisode = ep.episodeNumber;
      lastEntry = ep;
    }
  }

  return { season: maxSeason, episode: maxEpisode, entry: lastEntry };
}

/**
 * Get all episodes for a show from the Show model (cached) or fetch from TMDB.
 * Includes all seasons (regular and specials).
 */
async function getShowEpisodes(tmdbId: number): Promise<Season[]> {
  const show = await Show.findOne({ tmdbId }).lean();
  if (show && show.seasons && show.seasons.length > 0) {
    return show.seasons;
  }

  // Fetch from TMDB if not cached
  const details = await tmdbService.getTvDetails(tmdbId);
  const seasons: Season[] = [];

  if (details.seasons) {
    for (const tmdbSeason of details.seasons) {
      // Skip seasons without episodes
      if (!tmdbSeason.episodes || tmdbSeason.episodes.length === 0) continue;

      // If episodes are already in the details, use them
      if (tmdbSeason.episodes && tmdbSeason.episodes.length > 0) {
        seasons.push({
          seasonNumber: tmdbSeason.season_number,
          episodeCount: tmdbSeason.episode_count,
          episodes: tmdbSeason.episodes.map((e) => ({
            episodeNumber: e.episode_number,
            name: e.name,
            overview: e.overview,
            stillPath: e.still_path ?? undefined,
            airDate: e.air_date ? new Date(e.air_date) : undefined,
            runtime: e.runtime,
          })),
        });
      } else {
        // Fetch individual season
        const seasonData = await tmdbService.getTvSeason(tmdbId, tmdbSeason.season_number);
        seasons.push({
          seasonNumber: seasonData.season_number,
          episodeCount: seasonData.episode_count,
          episodes: (seasonData.episodes ?? []).map((e) => ({
            episodeNumber: e.episode_number,
            name: e.name,
            overview: e.overview,
            stillPath: e.still_path ?? undefined,
            airDate: e.air_date ? new Date(e.air_date) : undefined,
            runtime: e.runtime,
          })),
        });
      }
    }
  }

  return seasons;
}

/**
 * Build the list of watched episodes for a series, including bulk-filled episodes.
 * - Episodes up to the last watched episode are marked as watched with importedBulk: true.
 * - The last watched episode from the export gets importedBulk: false and the real watchedAt.
 * - Specials (season 0) are excluded from bulk-fill unless they appear explicitly in the export.
 */
function buildWatchedEpisodes(
  seasons: Season[],
  lastWatched: { season: number; episode: number; entry: TvTimeEpisodeEntry | null },
  episodeEntries: TvTimeEpisodeEntry[],
  sId: string,
): WatchedEpisode[] {
  const watched: WatchedEpisode[] = [];

  // Collect explicit special episodes from the export
  const explicitSpecials = new Set(
    episodeEntries
      .filter((e) => e.sId === sId && e.isSpecial)
      .map((e) => `${e.seasonNumber}:${e.episodeNumber}`),
  );

  for (const season of seasons) {
    if (season.seasonNumber <= 0) {
      // Only include specials if they appear explicitly in the export
      for (const ep of season.episodes) {
        if (explicitSpecials.has(`${season.seasonNumber}:${ep.episodeNumber}`)) {
          const explicitEntry = episodeEntries.find(
            (e) =>
              e.sId === sId &&
              e.isSpecial &&
              e.seasonNumber === season.seasonNumber &&
              e.episodeNumber === ep.episodeNumber,
          );
          watched.push({
            season: season.seasonNumber,
            episode: ep.episodeNumber,
            watchedAt: explicitEntry?.createdAt,
            importedBulk: false,
          });
        }
      }
      continue;
    }

    for (const ep of season.episodes) {
      const isBeforeOrAtLast =
        season.seasonNumber < lastWatched.season ||
        (season.seasonNumber === lastWatched.season && ep.episodeNumber <= lastWatched.episode);

      if (!isBeforeOrAtLast) continue;

      const isLastWatched =
        season.seasonNumber === lastWatched.season && ep.episodeNumber === lastWatched.episode;

      if (isLastWatched && lastWatched.entry) {
        watched.push({
          season: season.seasonNumber,
          episode: ep.episodeNumber,
          watchedAt: lastWatched.entry.createdAt,
          importedBulk: false,
        });
      } else {
        watched.push({
          season: season.seasonNumber,
          episode: ep.episodeNumber,
          watchedAt: undefined,
          importedBulk: true,
        });
      }
    }
  }

  return watched;
}

/**
 * Resolve watched episodes for all auto-matched series.
 * For each matched series, bulk-fills all episodes up to the last watched one from the export.
 */
export async function resolveWatchedEpisodes(
  userId: string,
  matchedSeries: MatchedSeries[],
  episodeEntries: TvTimeEpisodeEntry[],
): Promise<void> {
  for (const series of matchedSeries) {
    try {
      const lastWatched = findLastWatchedEpisode(series.sId, episodeEntries);
      if (lastWatched.season === 0 && lastWatched.episode === 0) {
        // No episodes watched for this series — just create a WatchEntry with plan_to_watch
        await WatchEntry.findOneAndUpdate(
          { userId: new Types.ObjectId(userId), showId: series.showId },
          {
            $setOnInsert: {
              status: "plan_to_watch",
              watchedEpisodes: [],
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        continue;
      }

      const seasons = await getShowEpisodes(series.tmdbId);
      const watchedEpisodes = buildWatchedEpisodes(
        seasons,
        lastWatched,
        episodeEntries,
        series.sId,
      );

      const status = "watching";
      const lastEp = watchedEpisodes[watchedEpisodes.length - 1];

      await WatchEntry.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), showId: series.showId },
        {
          $set: {
            status,
            watchedEpisodes,
            currentSeason: lastEp?.season,
            currentEpisode: lastEp?.episode,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      log("TvTimeImport", "resolveWatchedEpisodes", {
        sId: series.sId,
        tmdbId: series.tmdbId,
        episodesFilled: watchedEpisodes.length,
      });
    } catch (err) {
      logError("TvTimeImport", "resolveWatchedEpisodes error", err, {
        sId: series.sId,
        tmdbId: series.tmdbId,
      });
    }
  }
}

/**
 * Extract matched series from match results.
 * Returns the TMDB ID and Show ObjectId for each auto-matched series.
 */
export async function getMatchedSeries(
  matchResults: TmdbMatchResult[],
): Promise<MatchedSeries[]> {
  const matched: MatchedSeries[] = [];

  for (const result of matchResults) {
    if (!result.matched || !result.bestMatch) continue;
    const show = await Show.findOne({ tmdbId: result.bestMatch.tmdbId }).lean();
    if (show) {
      matched.push({
        tmdbId: result.bestMatch.tmdbId,
        showId: show._id as Types.ObjectId,
        sId: result.tvtimeInternalId,
      });
    }
  }

  return matched;
}
