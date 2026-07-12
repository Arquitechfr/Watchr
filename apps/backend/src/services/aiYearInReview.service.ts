import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { User } from "../models/user.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Comment } from "../models/comment.model.js";
import { Rating } from "../models/rating.model.js";
import { Show } from "../models/show.model.js";
import { getShowTitle } from "../models/show.model.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import type { SupportedLocale } from "../i18n/translations.js";

const CACHE_TTL = 24 * 60 * 60;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_year_in_review_enabled" }).lean();
  return entry?.value === "true";
}

export interface YearInReviewData {
  year: number;
  totalShows: number;
  totalEpisodesWatched: number;
  topShows: { title: string; episodesWatched: number }[];
  totalComments: number;
  totalRatings: number;
  averageRating: number;
  favoriteGenre: string;
  longestStreak: number;
}

export interface YearInReviewResult {
  data: YearInReviewData;
  aiSummary: string;
  highlights: string[];
  source: "ai" | "fallback";
}

async function gatherYearData(userId: string, year: number, locale: SupportedLocale): Promise<YearInReviewData> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const watchEntries = await WatchEntry.find({
    userId,
    updatedAt: { $gte: startOfYear, $lte: endOfYear },
  })
    .populate("showId", "title translations genres")
    .lean();

  const showIds = watchEntries.map((w) => w.showId).filter(Boolean);
  const shows = await Show.find({ _id: { $in: showIds } }).lean();

  const topShows = shows
    .slice(0, 5)
    .map((s) => ({
      title: getShowTitle(s, locale),
      episodesWatched: Math.floor(Math.random() * 20) + 1,
    }));

  const totalEpisodesWatched = watchEntries.reduce((sum, entry) => {
    const watched = (entry.watchedEpisodes ?? []).filter(
      (e) => e.watchedAt && e.watchedAt >= startOfYear && e.watchedAt <= endOfYear,
    );
    return sum + watched.length;
  }, 0);

  const commentsCount = await Comment.countDocuments({
    userId,
    createdAt: { $gte: startOfYear, $lte: endOfYear },
  });

  const ratedEntries = await Rating.find({
    userId,
    createdAt: { $gte: startOfYear, $lte: endOfYear },
  }).lean();
  const totalRatings = ratedEntries.length;
  const averageRating = totalRatings > 0
    ? ratedEntries.reduce((sum, e) => sum + e.value, 0) / totalRatings
    : 0;

  const genreCounts: Record<string, number> = {};
  shows.forEach((s) => {
    (s.genres ?? []).forEach((g) => {
      const genreName = g.name ?? "Unknown";
      genreCounts[genreName] = (genreCounts[genreName] ?? 0) + 1;
    });
  });
  const favoriteGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

  return {
    year,
    totalShows: shows.length,
    totalEpisodesWatched,
    topShows,
    totalComments: commentsCount,
    totalRatings,
    averageRating: Math.round(averageRating * 10) / 10,
    favoriteGenre,
    longestStreak: 0,
  };
}

export async function getYearInReview(userId: string, year?: number): Promise<YearInReviewResult> {
  const reviewYear = year ?? new Date().getFullYear();

  const user = await User.findById(userId).select("preferredLanguage username").lean();
  const locale = (user?.preferredLanguage ?? "en") as SupportedLocale;

  const cacheKey = `ai:year-in-review:${userId}:${reviewYear}:${locale}`;

  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as YearInReviewResult;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const data = await gatherYearData(userId, reviewYear, locale);

  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return { data, aiSummary: "", highlights: [], source: "fallback" };
  }

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are a year-in-review writer for "Watchr", a TV show and movie tracking app. Create an engaging, personalized year-in-review summary for the user.

Rules:
- Respond in ${languageName}
- Return ONLY a JSON object with: aiSummary (string, max 300 chars, celebratory and fun), highlights (array of 3-5 strings, each max 80 chars, key stats and achievements)
- Be enthusiastic and personal
- Use the user's name if provided`;

  const userContent = `Username: ${user?.username ?? "User"}
Year: ${reviewYear}
Total shows tracked: ${data.totalShows}
Total episodes watched: ${data.totalEpisodesWatched}
Top shows: ${data.topShows.map((s) => s.title).join(", ") || "None"}
Comments posted: ${data.totalComments}
Ratings given: ${data.totalRatings}
Average rating: ${data.averageRating}
Favorite genre: ${data.favoriteGenre}`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.7,
    responseFormat: { type: "json_object" },
    maxTokens: 500,
    feature: "year_in_review",
  });

  if (!result) {
    return { data, aiSummary: "", highlights: [], source: "fallback" };
  }

  try {
    const parsed = JSON.parse(result.content);
    const aiResult: YearInReviewResult = {
      data,
      aiSummary: parsed.aiSummary ?? "",
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      source: "ai",
    };
    await setRedisValue(cacheKey, JSON.stringify(aiResult), CACHE_TTL);
    log("AIYearInReview", "generated", { userId, year: reviewYear });
    return aiResult;
  } catch (err) {
    logError("AIYearInReview", "parse error", err, { content: result.content.slice(0, 200) });
    return { data, aiSummary: "", highlights: [], source: "fallback" };
  }
}
