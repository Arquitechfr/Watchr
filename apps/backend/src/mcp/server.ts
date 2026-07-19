import { Request, Response } from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { searchShows } from "../services/show.service.js";
import {
  listTracking,
  addToWatchlistByTmdb,
  upsertTracking,
  deleteTracking,
} from "../services/tracking.service.js";
import { WatchStatus } from "../models/watchEntry.model.js";
import { logError } from "../lib/logger.js";

interface ApiUserContext {
  userId: string;
  scopes: string[];
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
      const results = await searchShows(query);
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
      const result = await listTracking(apiUser.userId, page, limit);
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
      const entry = await addToWatchlistByTmdb(apiUser.userId, tmdbId, type);
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

  const server = buildMcpServer({ userId: apiUser.userId, scopes: apiUser.scopes });

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    logError("McpServer", "Error handling MCP request", error);
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
