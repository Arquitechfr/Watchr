import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { Show } from "../src/models/show.model.js";
import { User } from "../src/models/user.model.js";
import { Rating } from "../src/models/rating.model.js";
import { normalizeValue } from "../src/services/rating.service.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";
import { Types } from "mongoose";

const app = createApp();

async function getAuthUser() {
  const user = await User.create({
    email: "rating@example.com",
    username: "TestUser02",
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
      .send({ showId, value: 4 });

    expect(showRatingRes.status).toBe(200);
    expect(showRatingRes.body.rating.value).toBe(4);

    const episodeRatingRes = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId, value: 5, episodeRef: { season: 1, episode: 2 } });

    expect(episodeRatingRes.status).toBe(200);
    expect(episodeRatingRes.body.rating.value).toBe(5);

    const listRes = await request(app)
      .get(`/api/ratings/${showId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.user.show).toBe(4);
    expect(listRes.body.user.episodes).toHaveLength(1);
    expect(listRes.body.user.episodes[0]).toEqual({ season: 1, episode: 2, value: 5 });
  });

  it("should reject ratings above 5 (Zod validation)", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();
    const showId = show._id.toString();

    const res = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId, value: 8 });

    expect(res.status).toBe(400);
  });

  it("normalizeValue should convert /10 scale to /5 scale", () => {
    expect(normalizeValue(10)).toBe(5);
    expect(normalizeValue(8)).toBe(4);
    expect(normalizeValue(7)).toBe(4);
    expect(normalizeValue(6)).toBe(3);
    expect(normalizeValue(5)).toBe(5);
    expect(normalizeValue(4)).toBe(4);
    expect(normalizeValue(3)).toBe(3);
    expect(normalizeValue(1)).toBe(1);
  });

  it("listRatingsForShow should normalize legacy /10 values in DB", async () => {
    const { user, token } = await getAuthUser();
    const show = await createShow();
    const showId = show._id.toString();

    // Insert legacy /10 ratings directly in DB (bypassing Mongoose + Zod validation)
    const db = Rating.db;
    await db.collection("ratings").insertMany([
      {
        userId: new Types.ObjectId(user._id.toString()),
        showId: new Types.ObjectId(showId),
        value: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: new Types.ObjectId(user._id.toString()),
        showId: new Types.ObjectId(showId),
        episodeRef: { season: 1, episode: 1 },
        value: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const listRes = await request(app)
      .get(`/api/ratings/${showId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.user.show).toBe(5);
    expect(listRes.body.user.episodes).toHaveLength(1);
    expect(listRes.body.user.episodes[0]).toEqual({ season: 1, episode: 1, value: 4 });
  });
});
