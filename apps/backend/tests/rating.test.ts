import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { Show } from "../src/models/show.model.js";
import { User } from "../src/models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

const app = createApp();

async function getAuthUser() {
  const user = await User.create({
    email: "rating@example.com",
    passwordHash: await bcrypt.hash("password123", 12),
  });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  return { user, token };
}

async function createShow() {
  return Show.create({
    tmdbId: 789,
    type: "tv",
    title: "Rated Show",
    seasons: [{ seasonNumber: 1, episodeCount: 2, episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }] }],
  });
}

describe("Ratings", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  it("should return show and episode ratings in the frontend format", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();
    const showId = show._id.toString();

    const showRatingRes = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId, value: 8 });

    expect(showRatingRes.status).toBe(200);
    expect(showRatingRes.body.value).toBe(8);

    const episodeRatingRes = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId, value: 9, episodeRef: { season: 1, episode: 2 } });

    expect(episodeRatingRes.status).toBe(200);
    expect(episodeRatingRes.body.value).toBe(9);

    const listRes = await request(app)
      .get(`/api/ratings/${showId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.show).toBe(8);
    expect(listRes.body.episodes).toHaveLength(1);
    expect(listRes.body.episodes[0]).toEqual({ season: 1, episode: 2, value: 9 });
  });
});
