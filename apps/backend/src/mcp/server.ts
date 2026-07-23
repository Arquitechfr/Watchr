import { Request, Response } from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { searchShows, getShowDetails } from "../services/show.service.js";
import {
  listTracking,
  addToWatchlistByTmdb,
  upsertTracking,
  upsertWithProgress,
  deleteTracking,
  toggleEpisode,
  markEpisodesUpTo,
} from "../services/tracking.service.js";
import { upsertRating, listRatingsForShow } from "../services/rating.service.js";
import { createComment, listCommentsForShow } from "../services/comment.service.js";
import { getUpcomingEpisodes } from "../services/upcoming.service.js";
import { getUserStats } from "../services/stats.service.js";
import { getRecommendations } from "../services/recommendation.service.js";
import { WatchStatus } from "../models/watchEntry.model.js";
import { Show } from "../models/show.model.js";
import { logError } from "../lib/logger.js";
import { ApiError } from "../middleware/error.middleware.js";
import { User } from "../models/user.model.js";
import { checkAndConsumeMcpQuota } from "../lib/mcpQuota.js";

export interface ApiUserContext {
  userId: string;
  scopes: string[];
  language: string;
}

function checkScope(scopes: string[], required: "read" | "write"): boolean {
  return scopes.includes(required);
}

function scopeError(scope: "read" | "write"): { content: { type: "text"; text: string }[]; isError: true } {
  return {
    content: [{ type: "text", text: `Insufficient scope: '${scope}' required for this tool` }],
    isError: true,
  };
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * MCP tools receive `showId` from an LLM, which often only knows the TMDB ID
 * surfaced by `search_show`/`get_show_details` rather than Watchr's internal
 * Mongo _id. This resolves either form to a valid Watchr show _id, fetching
 * and caching the show from TMDB if it isn't tracked yet.
 */
async function resolveShowId(showIdOrTmdbId: string, language: string): Promise<string> {
  if (OBJECT_ID_REGEX.test(showIdOrTmdbId)) {
    return showIdOrTmdbId;
  }

  const tmdbId = Number(showIdOrTmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  let show = await Show.findOne({ tmdbId }).select("_id").lean();
  if (!show) {
    await getShowDetails(tmdbId, language);
    show = await Show.findOne({ tmdbId }).select("_id").lean();
  }

  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  return show._id.toString();
}

function jsonResult(
  result: unknown,
  quota?: { remaining: number; limit: number },
): {
  content: { type: "text"; text: string }[];
  structuredContent: { result: unknown };
  _meta?: { quota: { remaining: number; limit: number } };
} {
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
    structuredContent: { result },
    ...(quota !== undefined ? { _meta: { quota } } : {}),
  };
}

function toolError(status: number, code: string, message: string): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: { status, code, message } }) }],
    isError: true,
  };
}

export async function buildMcpServer(apiUser: ApiUserContext): Promise<McpServer> {
  const userData = await User.findById(apiUser.userId)
    .select("subscriptionPlan isSystemUser role")
    .lean();

  if (!userData) {
    logError("McpServer", "User not found for quota check", null, { userId: apiUser.userId });
  }

  const effectivePlan: "free" | "vip" =
    userData?.isSystemUser || userData?.role === "admin"
      ? "vip"
      : (userData?.subscriptionPlan ?? "free");

  async function safeTool<T>(
    fn: () => Promise<T>,
  ): Promise<ReturnType<typeof jsonResult> | ReturnType<typeof toolError>> {
    try {
      let quotaInfo: { remaining: number; limit: number } | undefined;
      if (effectivePlan !== "vip") {
        const quota = await checkAndConsumeMcpQuota(apiUser.userId, effectivePlan);
        if (!quota.allowed) {
          return toolError(
            429,
            "QUOTA_EXCEEDED",
            `Daily MCP quota reached (${quota.limit} calls/day). Upgrade to VIP for unlimited access.`,
          );
        }
        quotaInfo = { remaining: quota.remaining, limit: quota.limit };
      }
      const result = await fn();
      return jsonResult(result, quotaInfo);
    } catch (err) {
      if (err instanceof ApiError) {
        return toolError(err.status, err.code, err.message);
      }
      logError("McpServer", "Unexpected tool error", err);
      return toolError(500, "INTERNAL_ERROR", "An unexpected error occurred");
    }
  }

  const server = new McpServer({
    name: "watchr-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "search_show",
    {
      description: "Search for TV shows and movies by title",
      inputSchema: { query: z.string().min(1).max(200) },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ query }) => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      return safeTool(() => searchShows(query, apiUser.language));
    },
  );

  server.registerTool(
    "list_watchlist",
    {
      description: "List the user's watchlist with pagination",
      inputSchema: {
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ page, limit }) => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      return safeTool(() => listTracking(apiUser.userId, page, limit, undefined, apiUser.language));
    },
  );

  server.registerTool(
    "add_to_watchlist",
    {
      description: "Add a show or movie to the user's watchlist by TMDB ID",
      inputSchema: {
        tmdbId: z.number().int().positive(),
        type: z.enum(["tv", "movie"]),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
    },
    async ({ tmdbId, type }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }
      return safeTool(() => addToWatchlistByTmdb(apiUser.userId, tmdbId, type, apiUser.language));
    },
  );

  server.registerTool(
    "update_watch_status",
    {
      description: "Update the watch status of a show in the user's watchlist. showId accepts either the Watchr show ID or a TMDB ID.",
      inputSchema: {
        showId: z.string().min(1),
        status: z.enum(["watching", "completed", "plan_to_watch", "dropped"]),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
    },
    async ({ showId, status }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }

      return safeTool(async () => {
        const resolvedShowId = await resolveShowId(showId, apiUser.language);

        // When marking as completed, mark all episodes as watched
        if (status === "completed") {
          const show = await Show.findById(resolvedShowId).lean();
          if (!show) {
            throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
          }
          const seasons = show.seasons ?? [];
          if (seasons.length > 0) {
            const lastSeason = seasons[seasons.length - 1];
            const lastEpisode = lastSeason.episodes?.length ?? 0;
            return upsertWithProgress(apiUser.userId, resolvedShowId, {
              status: "completed",
              markUpTo: {
                season: lastSeason.seasonNumber,
                episode: lastEpisode,
                includePrevious: true,
              },
            });
          }
          return upsertTracking(apiUser.userId, resolvedShowId, { status: status as WatchStatus });
        }

        return upsertTracking(apiUser.userId, resolvedShowId, { status: status as WatchStatus });
      });
    },
  );

  server.registerTool(
    "remove_from_watchlist",
    {
      description: "Remove a show from the user's watchlist. showId accepts either the Watchr show ID or a TMDB ID.",
      inputSchema: {
        showId: z.string().min(1),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
    },
    async ({ showId }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }
      return safeTool(async () => {
        const resolvedShowId = await resolveShowId(showId, apiUser.language);
        await deleteTracking(apiUser.userId, resolvedShowId);
        return { success: true, showId: resolvedShowId };
      });
    },
  );

  // --- Tracking tools ---

  server.registerTool(
    "toggle_episode",
    {
      description: "Mark a specific episode as watched or unwatched. showId accepts either the Watchr show ID or a TMDB ID.",
      inputSchema: {
        showId: z.string().min(1),
        season: z.number().int().min(1),
        episode: z.number().int().min(1),
        watched: z.boolean(),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
    },
    async ({ showId, season, episode, watched }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }
      return safeTool(async () => {
        const resolvedShowId = await resolveShowId(showId, apiUser.language);
        return toggleEpisode(apiUser.userId, resolvedShowId, season, episode, watched);
      });
    },
  );

  server.registerTool(
    "mark_episodes_up_to",
    {
      description: "Mark all episodes up to a specific season/episode as watched. showId accepts either the Watchr show ID or a TMDB ID.",
      inputSchema: {
        showId: z.string().min(1),
        season: z.number().int().min(1),
        episode: z.number().int().min(1),
        includePrevious: z.boolean().default(true),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
    },
    async ({ showId, season, episode, includePrevious }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }
      return safeTool(async () => {
        const resolvedShowId = await resolveShowId(showId, apiUser.language);
        return markEpisodesUpTo(apiUser.userId, resolvedShowId, season, episode, includePrevious);
      });
    },
  );

  server.registerTool(
    "get_show_details",
    {
      description: "Get detailed information about a show by TMDB ID",
      inputSchema: {
        tmdbId: z.number().int().positive(),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ tmdbId }) => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      return safeTool(() => getShowDetails(tmdbId, apiUser.language));
    },
  );

  // --- Rating tools ---

  server.registerTool(
    "rate_show",
    {
      description: "Rate a show or episode (1-5 stars). Optionally include a review text. showId accepts either the Watchr show ID or a TMDB ID.",
      inputSchema: {
        showId: z.string().min(1),
        value: z.number().int().min(1).max(5),
        season: z.number().int().min(1).optional(),
        episode: z.number().int().min(1).optional(),
        review: z.string().max(2000).optional(),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
    },
    async ({ showId, value, season, episode, review }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }
      const episodeRef = season !== undefined && episode !== undefined ? { season, episode } : undefined;
      return safeTool(async () => {
        const resolvedShowId = await resolveShowId(showId, apiUser.language);
        return upsertRating(apiUser.userId, { showId: resolvedShowId, value, episodeRef, review });
      });
    },
  );

  server.registerTool(
    "get_ratings",
    {
      description: "Get user ratings and community ratings for a show. showId accepts either the Watchr show ID or a TMDB ID.",
      inputSchema: {
        showId: z.string().min(1),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ showId }) => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      return safeTool(async () => {
        const resolvedShowId = await resolveShowId(showId, apiUser.language);
        return listRatingsForShow(apiUser.userId, resolvedShowId);
      });
    },
  );

  // --- Social tools ---

  server.registerTool(
    "list_comments",
    {
      description: "List public comments for a show, optionally filtered by episode. showId accepts either the Watchr show ID or a TMDB ID.",
      inputSchema: {
        showId: z.string().min(1),
        season: z.number().int().min(1).optional(),
        episode: z.number().int().min(1).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
        sort: z.enum(["recent", "liked", "replied", "relevant"]).default("recent"),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ showId, season, episode, page, limit, sort }) => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      return safeTool(async () => {
        const resolvedShowId = await resolveShowId(showId, apiUser.language);
        return listCommentsForShow(apiUser.userId, resolvedShowId, {
          season,
          episode,
          page,
          limit,
          sort,
        });
      });
    },
  );

  server.registerTool(
    "add_comment",
    {
      description: "Post a public comment on a show or episode. showId accepts either the Watchr show ID or a TMDB ID.",
      inputSchema: {
        showId: z.string().min(1),
        content: z.string().min(1).max(2000),
        season: z.number().int().min(1).optional(),
        episode: z.number().int().min(1).optional(),
        isSpoiler: z.boolean().default(false),
      },
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
    },
    async ({ showId, content, season, episode, isSpoiler }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }
      const episodeRef = season !== undefined && episode !== undefined ? { season, episode } : undefined;
      return safeTool(async () => {
        const resolvedShowId = await resolveShowId(showId, apiUser.language);
        return createComment(apiUser.userId, { showId: resolvedShowId, content, episodeRef, isSpoiler });
      });
    },
  );

  // --- Discovery & stats tools ---

  server.registerTool(
    "get_upcoming",
    {
      description: "Get upcoming episodes for shows in the user's watchlist (today, this week, next week, later)",
      inputSchema: {},
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async () => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      return safeTool(() => getUpcomingEpisodes(apiUser.userId, apiUser.language));
    },
  );

  server.registerTool(
    "get_stats",
    {
      description: "Get the user's watching statistics (episodes watched, hours, streak, genres, recent activity)",
      inputSchema: {},
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async () => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      return safeTool(() => getUserStats(apiUser.userId, apiUser.language));
    },
  );

  server.registerTool(
    "get_recommendations",
    {
      description: "Get personalized show recommendations based on watch history and ratings",
      inputSchema: {},
      outputSchema: { result: z.unknown() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async () => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      return safeTool(() => getRecommendations(apiUser.userId, apiUser.language));
    },
  );

  return server;
}

export async function mcpHandler(req: Request, res: Response): Promise<void> {
  const apiUser = req.apiUser!;
  const language = req.language ?? "en";

  const server = await buildMcpServer({ userId: apiUser.userId, scopes: apiUser.scopes, language });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  // Attach cleanup listener BEFORE handleRequest to avoid race condition
  // where 'close' fires during/just after handleRequest but before listener is attached.
  let cleanedUp = false;
  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    transport.close();
    server.close();
  };
  res.on("close", cleanup);

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logError("McpServer", "Error handling MCP request", error);
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
}
