import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { Show } from "../src/models/show.model.js";
import { User } from "../src/models/user.model.js";
import { ApiKey, generateApiKey } from "../src/models/ApiKey.js";
import { checkAndConsumeMcpQuota } from "../src/lib/mcpQuota.js";
import { searchShows } from "../src/services/show.service.js";
import bcrypt from "bcryptjs";

vi.mock("../src/lib/mcpQuota.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    checkAndConsumeMcpQuota: vi.fn(actual.checkAndConsumeMcpQuota),
  };
});

vi.mock("../src/services/show.service.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchShows: vi.fn(actual.searchShows),
  };
});

const app = createApp();

interface CreateUserOptions {
  subscriptionPlan?: "free" | "vip";
  isSystemUser?: boolean;
  role?: "user" | "admin";
}

async function createUserAndKey(
  scopes: ("read" | "write")[] = ["read", "write"],
  options?: CreateUserOptions,
) {
  const user = await User.create({
    email: "mcp@example.com",
    username: "McpUser01",
    passwordHash: await bcrypt.hash("password123", 12),
    subscriptionPlan: options?.subscriptionPlan,
    isSystemUser: options?.isSystemUser,
    role: options?.role,
  });
  const { token, hash, prefix } = generateApiKey();
  await ApiKey.create({
    userId: user._id,
    name: "test-key",
    keyHash: hash,
    keyPrefix: prefix,
    scopes,
  });
  return { user, token };
}

async function createShow() {
  return Show.create({
    tmdbId: 1396,
    type: "tv",
    title: "Breaking Bad",
    seasons: [
      {
        seasonNumber: 1,
        episodeCount: 2,
        episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }],
      },
      {
        seasonNumber: 2,
        episodeCount: 1,
        episodes: [{ episodeNumber: 1 }],
      },
    ],
  });
}

function mcpRequest(token: string, tool: string, args: Record<string, unknown> = {}) {
  return request(app)
    .post("/mcp")
    .set("Authorization", `Bearer ${token}`)
    .set("Content-Type", "application/json")
    .send({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: tool, arguments: args },
      id: 1,
    });
}

describe("MCP Server", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(async () => {
    vi.mocked(checkAndConsumeMcpQuota).mockClear();
    vi.mocked(searchShows).mockClear();
    await clearDatabase();
  });

  it("should search shows with read scope", async () => {
    const { token } = await createUserAndKey(["read"]);
    const res = await mcpRequest(token, "search_show", { query: "Breaking Bad" });
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it("should reject write tool with read-only scope", async () => {
    const { token } = await createUserAndKey(["read"]);
    const res = await mcpRequest(token, "add_to_watchlist", { tmdbId: 1396, type: "tv" });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    expect(text).toContain("Insufficient scope");
  });

  it("should add show to watchlist and list it", async () => {
    const { token, user: _user } = await createUserAndKey(["read", "write"]);
    await createShow();

    const addRes = await mcpRequest(token, "add_to_watchlist", { tmdbId: 1396, type: "tv" });
    expect(addRes.status).toBe(200);

    const listRes = await mcpRequest(token, "list_watchlist", { page: 1, limit: 20 });
    expect(listRes.status).toBe(200);
    const listText = listRes.body?.result?.content?.[0]?.text;
    expect(listText).toBeDefined();
    const parsed = JSON.parse(listText);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].showId).toBeDefined();
  });

  it("should mark all episodes watched when status is completed", async () => {
    const { token } = await createUserAndKey(["read", "write"]);
    const show = await createShow();

    await mcpRequest(token, "add_to_watchlist", { tmdbId: 1396, type: "tv" });

    const res = await mcpRequest(token, "update_watch_status", {
      showId: show._id.toString(),
      status: "completed",
    });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe("completed");
    expect(parsed.watchedEpisodes).toHaveLength(3);
  });

  it("should toggle a specific episode", async () => {
    const { token } = await createUserAndKey(["read", "write"]);
    const show = await createShow();

    await mcpRequest(token, "add_to_watchlist", { tmdbId: 1396, type: "tv" });

    const res = await mcpRequest(token, "toggle_episode", {
      showId: show._id.toString(),
      season: 1,
      episode: 1,
      watched: true,
    });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    const parsed = JSON.parse(text);
    expect(parsed.watchedEpisodes).toHaveLength(1);
    expect(parsed.watchedEpisodes[0].season).toBe(1);
    expect(parsed.watchedEpisodes[0].episode).toBe(1);
  });

  it("should mark episodes up to a specific point", async () => {
    const { token } = await createUserAndKey(["read", "write"]);
    const show = await createShow();

    await mcpRequest(token, "add_to_watchlist", { tmdbId: 1396, type: "tv" });

    const res = await mcpRequest(token, "mark_episodes_up_to", {
      showId: show._id.toString(),
      season: 1,
      episode: 2,
      includePrevious: true,
    });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    const parsed = JSON.parse(text);
    expect(parsed.watchedEpisodes.length).toBeGreaterThanOrEqual(2);
  });

  it("should get show details by TMDB ID", async () => {
    const { token } = await createUserAndKey(["read"]);
    await createShow();

    const res = await mcpRequest(token, "get_show_details", { tmdbId: 1396 });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
    const parsed = JSON.parse(text);
    expect(parsed.title).toBe("Breaking Bad");
  });

  it("should rate a show and retrieve ratings", async () => {
    const { token } = await createUserAndKey(["read", "write"]);
    const show = await createShow();

    const rateRes = await mcpRequest(token, "rate_show", {
      showId: show._id.toString(),
      value: 5,
    });
    expect(rateRes.status).toBe(200);

    const getRes = await mcpRequest(token, "get_ratings", {
      showId: show._id.toString(),
    });
    expect(getRes.status).toBe(200);
    const text = getRes.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
  });

  it("should add a comment and list comments", async () => {
    const { token } = await createUserAndKey(["read", "write"]);
    const show = await createShow();

    const addRes = await mcpRequest(token, "add_comment", {
      showId: show._id.toString(),
      content: "Great show!",
    });
    expect(addRes.status).toBe(200);

    const listRes = await mcpRequest(token, "list_comments", {
      showId: show._id.toString(),
      page: 1,
      limit: 10,
      sort: "recent",
    });
    expect(listRes.status).toBe(200);
    const text = listRes.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
  });

  it("should get upcoming episodes", async () => {
    const { token } = await createUserAndKey(["read"]);
    const res = await mcpRequest(token, "get_upcoming", {});
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty("today");
    expect(parsed).toHaveProperty("thisWeek");
    expect(parsed).toHaveProperty("nextWeek");
    expect(parsed).toHaveProperty("later");
  });

  it("should get user stats", async () => {
    const { token } = await createUserAndKey(["read"]);
    const res = await mcpRequest(token, "get_stats", {});
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
  });

  it("should get recommendations", async () => {
    const { token } = await createUserAndKey(["read"]);
    const res = await mcpRequest(token, "get_recommendations", {});
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
  });

  it("should remove show from watchlist", async () => {
    const { token } = await createUserAndKey(["read", "write"]);
    const show = await createShow();

    await mcpRequest(token, "add_to_watchlist", { tmdbId: 1396, type: "tv" });

    const res = await mcpRequest(token, "remove_from_watchlist", {
      showId: show._id.toString(),
    });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    const parsed = JSON.parse(text);
    expect(parsed.success).toBe(true);
  });

  // --- Quota tests ---

  it("free user under quota: tool executes and _quota is present (fail-open)", async () => {
    const { token } = await createUserAndKey(["read"]);
    const res = await mcpRequest(token, "search_show", { query: "Breaking Bad" });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
    const parsed = JSON.parse(text);
    expect(parsed._quota).toBeDefined();
    expect(parsed._quota.remaining).toBe(-1);
    expect(parsed._quota.limit).toBe(50);
  });

  it("free user at quota: returns QUOTA_EXCEEDED and tool is not executed", async () => {
    const { token } = await createUserAndKey(["read"]);
    vi.mocked(checkAndConsumeMcpQuota).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 50,
    });

    const res = await mcpRequest(token, "search_show", { query: "Breaking Bad" });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    expect(text).toBeDefined();
    const parsed = JSON.parse(text);
    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("QUOTA_EXCEEDED");
    expect(parsed.error.status).toBe(429);
    expect(searchShows).not.toHaveBeenCalled();
  });

  it("VIP user: never blocked, checkAndConsumeMcpQuota not called, no _quota", async () => {
    const { token } = await createUserAndKey(["read"], { subscriptionPlan: "vip" });

    for (let i = 0; i < 3; i++) {
      const res = await mcpRequest(token, "search_show", { query: "Breaking Bad" });
      expect(res.status).toBe(200);
      const text = res.body?.result?.content?.[0]?.text;
      const parsed = JSON.parse(text);
      expect(parsed._quota).toBeUndefined();
    }
    expect(checkAndConsumeMcpQuota).not.toHaveBeenCalled();
  });

  it("isSystemUser: never blocked", async () => {
    const { token } = await createUserAndKey(["read"], { isSystemUser: true });

    for (let i = 0; i < 3; i++) {
      const res = await mcpRequest(token, "search_show", { query: "Breaking Bad" });
      expect(res.status).toBe(200);
    }
    expect(checkAndConsumeMcpQuota).not.toHaveBeenCalled();
  });

  it("Redis unavailable: fail-open, tool executes, _quota present with remaining -1", async () => {
    const { token } = await createUserAndKey(["read"]);
    const res = await mcpRequest(token, "search_show", { query: "Breaking Bad" });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    const parsed = JSON.parse(text);
    expect(parsed._quota).toBeDefined();
    expect(parsed._quota.remaining).toBe(-1);
  });

  it("free user with remaining quota: _quota exposes remaining and limit", async () => {
    const { token } = await createUserAndKey(["read"]);
    vi.mocked(checkAndConsumeMcpQuota).mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
      limit: 50,
    });

    const res = await mcpRequest(token, "search_show", { query: "Breaking Bad" });
    expect(res.status).toBe(200);
    const text = res.body?.result?.content?.[0]?.text;
    const parsed = JSON.parse(text);
    expect(parsed._quota).toBeDefined();
    expect(parsed._quota.remaining).toBe(5);
    expect(parsed._quota.limit).toBe(50);
  });
});
