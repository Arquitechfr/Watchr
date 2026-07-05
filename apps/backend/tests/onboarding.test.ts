import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { Show } from "../src/models/show.model.js";
import { User } from "../src/models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

const mockGetShowDetails = vi.fn();

vi.mock("../src/services/show.service.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/services/show.service.js")>();
  return {
    ...original,
    getShowDetails: (...args: unknown[]) => mockGetShowDetails(...args),
  };
});

const app = createApp();

async function getAuthUser() {
  const user = await User.create({
    email: "onboarding@example.com",
    username: "OnboardUser",
    passwordHash: await bcrypt.hash("password123", 12),
  });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  return { user, token };
}

describe("Onboarding", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(() => {
    mockGetShowDetails.mockReset();
    return clearDatabase();
  });

  it("should have hasCompletedOnboarding === false after registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "password123",
    });
    expect(res.status).toBe(201);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.hasCompletedOnboarding).toBe(false);
  });

  it("should complete onboarding with empty body and persist flag", async () => {
    const { token } = await getAuthUser();

    const patchRes = await request(app)
      .patch("/api/auth/me/onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.hasCompletedOnboarding).toBe(true);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.hasCompletedOnboarding).toBe(true);
  });

  it("should reject onboarding completion with unexpected body", async () => {
    const { token } = await getAuthUser();

    const res = await request(app)
      .patch("/api/auth/me/onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({ unexpected: true });
    expect(res.status).toBe(400);
  });

  it("should batch add to watchlist with partial success", async () => {
    const { token } = await getAuthUser();

    await Show.create({
      tmdbId: 100,
      type: "tv",
      title: "Cached Show",
      seasons: [{ seasonNumber: 1, episodeCount: 1, episodes: [{ episodeNumber: 1 }] }],
    });

    mockGetShowDetails.mockRejectedValueOnce(new Error("TMDB fetch failed"));

    const res = await request(app)
      .post("/api/tracking/batch-by-tmdb")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          { tmdbId: 100, type: "tv" },
          { tmdbId: 200, type: "tv" },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.added).toBe(1);
    expect(res.body.failed).toBe(1);
    expect(res.body.failedIds).toContain("200");
  });
});
