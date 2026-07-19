import { Request, Response } from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { searchShows } from "../services/show.service.js";
import {
  listTracking,
  addToWatchlistByTmdb,
  upsertTracking,
  upsertWithProgress,
  deleteTracking,
} from "../services/tracking.service.js";
import { WatchStatus } from "../models/watchEntry.model.js";
import { Show } from "../models/show.model.js";
import { logError } from "../lib/logger.js";

interface ApiUserContext {
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

function buildMcpServer(apiUser: ApiUserContext): McpServer {
  const server = new McpServer({
    name: "watchr-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "search_show",
    {
      description: "Search for TV shows and movies by title",
      inputSchema: { query: z.string().min(1).max(200) },
    },
    async ({ query }) => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      const results = await searchShows(query, apiUser.language);
      return {
        content: [{ type: "text", text: JSON.stringify(results) }],
      };
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
    },
    async ({ page, limit }) => {
      if (!checkScope(apiUser.scopes, "read")) {
        return scopeError("read");
      }
      const result = await listTracking(apiUser.userId, page, limit, undefined, apiUser.language);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
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
    },
    async ({ tmdbId, type }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }
      const entry = await addToWatchlistByTmdb(apiUser.userId, tmdbId, type, apiUser.language);
      return {
        content: [{ type: "text", text: JSON.stringify(entry) }],
      };
    },
  );

  server.registerTool(
    "update_watch_status",
    {
      description: "Update the watch status of a show in the user's watchlist",
      inputSchema: {
        itemId: z.string().min(1),
        status: z.enum(["watching", "completed", "plan_to_watch", "dropped"]),
      },
    },
    async ({ itemId, status }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }

      // When marking as completed, mark all episodes as watched
      if (status === "completed") {
        const show = await Show.findById(itemId).lean();
        if (!show) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Show not found" }) }],
            isError: true,
          };
        }
        const seasons = show.seasons ?? [];
        if (seasons.length > 0) {
          const lastSeason = seasons[seasons.length - 1];
          const lastEpisode = lastSeason.episodes?.length ?? 0;
          const entry = await upsertWithProgress(apiUser.userId, itemId, {
            status: "completed",
            markUpTo: {
              season: lastSeason.seasonNumber,
              episode: lastEpisode,
              includePrevious: true,
            },
          });
          return {
            content: [{ type: "text", text: JSON.stringify(entry) }],
          };
        }
      }

      const entry = await upsertTracking(apiUser.userId, itemId, { status: status as WatchStatus });
      return {
        content: [{ type: "text", text: JSON.stringify(entry) }],
      };
    },
  );

  server.registerTool(
    "remove_from_watchlist",
    {
      description: "Remove a show from the user's watchlist",
      inputSchema: {
        itemId: z.string().min(1),
      },
    },
    async ({ itemId }) => {
      if (!checkScope(apiUser.scopes, "write")) {
        return scopeError("write");
      }
      await deleteTracking(apiUser.userId, itemId);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, itemId }) }],
      };
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
