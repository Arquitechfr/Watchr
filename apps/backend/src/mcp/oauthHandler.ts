import { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer } from "./server.js";
import { logError } from "../lib/logger.js";

export async function mcpOAuthHandler(req: Request, res: Response): Promise<void> {
  const auth = req.auth!;
  const userId = auth.extra?.userId as string;
  const scopes = auth.scopes;
  const language = "en";

  const server = buildMcpServer({ userId, scopes, language });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

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
    logError("McpOAuth", "Error handling MCP OAuth request", error);
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
