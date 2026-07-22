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

function jsonResult(result: unknown): {
  content: { type: "text"; text: string }[];
  structuredContent: { result: unknown };
} {
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
    structuredContent: { result },
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

async function safeTool<T>(
  fn: () => Promise<T>,
): Promise<ReturnType<typeof jsonResult> | ReturnType<typeof toolError>> {
  try {
    const result = await fn();
    return jsonResult(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return toolError(err.status, err.code, err.message);
    }
    logError("McpServer", "Unexpected tool error", err);
    return toolError(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
}

export function buildMcpServer(apiUser: ApiUserContext): McpServer {
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
      description: "Update the watch status of a show in the user's watchlist",
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

      // When marking as completed, mark all episodes as watched
      if (status === "completed") {
        return safeTool(async () => {
          const show = await Show.findById(showId).lean();
          if (!show) {
            throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
          }
          const seasons = show.seasons ?? [];
          if (seasons.length > 0) {
            const lastSeason = seasons[seasons.length - 1];
            const lastEpisode = lastSeason.episodes?.length ?? 0;
            return upsertWithProgress(apiUser.userId, showId, {
              status: "completed",
              markUpTo: {
                season: lastSeason.seasonNumber,
                episode: lastEpisode,
                includePrevious: true,
              },
            });
          }
          return upsertTracking(apiUser.userId, showId, { status: status as WatchStatus });
        });
      }

      return safeTool(() => upsertTracking(apiUser.userId, showId, { status: status as WatchStatus }));
    },
  );

  server.registerTool(
    "remove_from_watchlist",
    {
      description: "Remove a show from the user's watchlist",
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
        await deleteTracking(apiUser.userId, showId);
        return { success: true, showId };
      });
    },
  );

  // --- Tracking tools ---

  server.registerTool(
    "toggle_episode",
    {
      description: "Mark a specific episode as watched or unwatched",
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
      return safeTool(() => toggleEpisode(apiUser.userId, showId, season, episode, watched));
    },
  );

  server.registerTool(
    "mark_episodes_up_to",
    {
      description: "Mark all episodes up to a specific season/episode as watched",
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
      return safeTool(() => markEpisodesUpTo(apiUser.userId, showId, season, episode, includePrevious));
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
      description: "Rate a show or episode (1-5 stars). Optionally include a review text.",
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
      return safeTool(() => upsertRating(apiUser.userId, { showId, value, episodeRef, review }));
    },
  );

  server.registerTool(
    "get_ratings",
    {
      description: "Get user ratings and community ratings for a show",
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
      return safeTool(() => listRatingsForShow(apiUser.userId, showId));
    },
  );

  // --- Social tools ---

  server.registerTool(
    "list_comments",
    {
      description: "List public comments for a show, optionally filtered by episode",
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
      return safeTool(() => listCommentsForShow(apiUser.userId, showId, {
        season,
        episode,
        page,
        limit,
        sort,
      }));
    },
  );

  server.registerTool(
    "add_comment",
    {
      description: "Post a public comment on a show or episode",
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
      return safeTool(() => createComment(apiUser.userId, { showId, content, episodeRef, isSpoiler }));
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

  const server = buildMcpServer({ userId: apiUser.userId, scopes: apiUser.scopes, language });

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
