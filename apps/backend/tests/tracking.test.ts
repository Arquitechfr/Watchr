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

  it("should upsert tracking entry and compute status automatically", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    const res = await request(app)
      .post(`/api/tracking/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentSeason: 1, currentEpisode: 1 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("plan_to_watch");
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

  it("should compute status as completed when all episodes watched and show ended", async () => {
    const { token } = await getAuthUser();
    const show = await Show.create({
      tmdbId: 456,
      type: "tv",
      title: "Ended Show",
      status: "Ended",
      seasons: [{ seasonNumber: 1, episodeCount: 2, episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }] }],
    });

    const res = await request(app)
      .post(`/api/tracking/${show._id.toString()}/mark-up-to`)
      .set("Authorization", `Bearer ${token}`)
      .send({ season: 1, episode: 2, includePrevious: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
    expect(res.body.watchedEpisodes).toHaveLength(2);
  });

  it("should toggle dropped status", async () => {
    const { token } = await getAuthUser();
    const show = await createShow();

    await request(app)
      .post(`/api/tracking/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const droppedRes = await request(app)
      .patch(`/api/tracking/${show._id.toString()}/dropped`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dropped: true });

    expect(droppedRes.status).toBe(200);
    expect(droppedRes.body.status).toBe("dropped");

    const resumedRes = await request(app)
      .patch(`/api/tracking/${show._id.toString()}/dropped`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dropped: false });

    expect(resumedRes.status).toBe(200);
    expect(resumedRes.body.status).toBe("plan_to_watch");
  });

  it("should keep movie status as completed when marked as watched", async () => {
    const { token } = await getAuthUser();
    const movie = await Show.create({
      tmdbId: 999,
      type: "movie",
      title: "Test Movie",
    });

    const upsertRes = await request(app)
      .post(`/api/tracking/${movie._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "completed" });

    expect(upsertRes.status).toBe(200);
    expect(upsertRes.body.status).toBe("completed");

    const getRes = await request(app)
      .get(`/api/tracking/${movie._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe("completed");
  });

  it("should list unwatched episodes with localized translations", async () => {
    const { token } = await getAuthUser();
    const show = await Show.create({
      tmdbId: 789,
      type: "tv",
      title: "English Show",
      status: "Ended",
      seasons: [
        {
          seasonNumber: 1,
          episodeCount: 2,
          episodes: [
            { episodeNumber: 1, airDate: new Date("2020-01-01") },
            { episodeNumber: 2, airDate: new Date("2020-01-02") },
          ],
        },
      ],
      translations: new Map([
        [
          "fr",
          {
            title: "Série en français",
            seasons: [
              {
                seasonNumber: 1,
                episodeCount: 2,
                episodes: [
                  { episodeNumber: 1, name: "Épisode 1", airDate: new Date("2020-01-01") },
                  { episodeNumber: 2, name: "Épisode 2", airDate: new Date("2020-01-02") },
                ],
              },
            ],
          },
        ],
      ]),
    });

    await request(app)
      .post(`/api/tracking/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "watching" });

    await request(app)
      .patch(`/api/tracking/${show._id.toString()}/episodes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ season: 1, episode: 1, watched: true });

    const res = await request(app)
      .get("/api/tracking/unwatched?type=tv")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept-Language", "fr");

    expect(res.status).toBe(200);
    expect(res.body.shows).toHaveLength(1);
    expect(res.body.shows[0].title).toBe("Série en français");
    expect(res.body.shows[0].unwatchedEpisodes).toHaveLength(1);
    expect(res.body.shows[0].unwatchedEpisodes[0].episode).toBe(2);
  });
});
