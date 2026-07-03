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
    email: "track@example.com",
    passwordHash: await bcrypt.hash("password123", 12),
  });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  return { user, token };
}

async function createShow() {
  return Show.create({
    tmdbId: 123,
    type: "tv",
    title: "Test Show",
    seasons: [{ seasonNumber: 1, episodeCount: 2, episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }] }],
  });
}

describe("Tracking", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  it("should upsert tracking entry", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    const res = await request(app)
      .post(`/api/tracking/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "watching" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("watching");
  });

  it("should toggle episode watched", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    await request(app)
      .post(`/api/tracking/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "watching" });

    const res = await request(app)
      .patch(`/api/tracking/${show._id.toString()}/episodes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ season: 1, episode: 1, watched: true });

    expect(res.status).toBe(200);
    expect(res.body.watchedEpisodes).toHaveLength(1);
    expect(res.body.watchedEpisodes[0].episode).toBe(1);
  });

  it("should toggle episode unwatched", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    await request(app)
      .post(`/api/tracking/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "watching" });

    await request(app)
      .patch(`/api/tracking/${show._id.toString()}/episodes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ season: 1, episode: 1, watched: true });

    const res = await request(app)
      .patch(`/api/tracking/${show._id.toString()}/episodes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ season: 1, episode: 1, watched: false });

    expect(res.status).toBe(200);
    expect(res.body.watchedEpisodes).toHaveLength(0);
  });

  it("should list tracking entries", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    await request(app)
      .post(`/api/tracking/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "watching" });

    const res = await request(app)
      .get("/api/tracking")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it("should mark episodes up to current episode", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    const res = await request(app)
      .post(`/api/tracking/${show._id.toString()}/mark-up-to`)
      .set("Authorization", `Bearer ${token}`)
      .send({ season: 1, episode: 2, includePrevious: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("watching");
    expect(res.body.watchedEpisodes).toHaveLength(2);
    expect(res.body.currentSeason).toBe(1);
    expect(res.body.currentEpisode).toBe(2);
  });

  it("should mark only current episode when includePrevious is false", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    const res = await request(app)
      .post(`/api/tracking/${show._id.toString()}/mark-up-to`)
      .set("Authorization", `Bearer ${token}`)
      .send({ season: 1, episode: 2, includePrevious: false });

    expect(res.status).toBe(200);
    expect(res.body.watchedEpisodes).toHaveLength(1);
    expect(res.body.watchedEpisodes[0].episode).toBe(2);
  });

  it("should create tracking entry when toggling episode without existing entry", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    const res = await request(app)
      .patch(`/api/tracking/${show._id.toString()}/episodes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ season: 1, episode: 1, watched: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("watching");
    expect(res.body.watchedEpisodes).toHaveLength(1);
  });
});
