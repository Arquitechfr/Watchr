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

async function getAuthUser(email: string) {
  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash("password123", 12),
  });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  return { user, token };
}

async function createShow() {
  return Show.create({
    tmdbId: 456,
    type: "tv",
    title: "Comment Test Show",
    seasons: [
      {
        seasonNumber: 1,
        episodeCount: 2,
        episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }],
      },
    ],
  });
}

describe("Comments", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  it("should create a comment on a show", async () => {
    const { token } = await getAuthUser("comment1@example.com");
    const show = await createShow();

    const res = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), content: "Great show!" });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Great show!");
    expect(res.body.showId).toBe(show._id.toString());
  });

  it("should create a comment on an episode", async () => {
    const { token } = await getAuthUser("comment2@example.com");
    const show = await createShow();

    const res = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        showId: show._id.toString(),
        episodeRef: { season: 1, episode: 1 },
        content: "Amazing pilot",
      });

    expect(res.status).toBe(201);
    expect(res.body.episodeRef).toEqual({ season: 1, episode: 1 });
  });

  it("should list comments for a show", async () => {
    const { token, user } = await getAuthUser("comment3@example.com");
    const show = await createShow();

    await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), content: "First comment" });

    const res = await request(app)
      .get(`/api/comments/show/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0].userId).toBe(user._id.toString());
    expect(res.body.comments[0].replies).toHaveLength(0);
  });

  it("should reply to a comment", async () => {
    const { token } = await getAuthUser("comment4@example.com");
    const show = await createShow();

    const parentRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), content: "Parent comment" });

    const parentId = parentRes.body.id;

    const replyRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), parentId, content: "Reply" });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.parentId).toBe(parentId);

    const listRes = await request(app)
      .get(`/api/comments/show/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.body.comments[0].replies).toHaveLength(1);
    expect(listRes.body.comments[0].replies[0].content).toBe("Reply");
  });

  it("should update own comment", async () => {
    const { token } = await getAuthUser("comment5@example.com");
    const show = await createShow();

    const createRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), content: "Original" });

    const updateRes = await request(app)
      .patch(`/api/comments/${createRes.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Updated" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.content).toBe("Updated");
  });

  it("should delete own comment and its replies", async () => {
    const { token } = await getAuthUser("comment6@example.com");
    const show = await createShow();

    const parentRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), content: "Parent" });

    await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), parentId: parentRes.body.id, content: "Reply" });

    const deleteRes = await request(app)
      .delete(`/api/comments/${parentRes.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    const listRes = await request(app)
      .get(`/api/comments/show/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.body.total).toBe(0);
  });

  it("should like and unlike a comment", async () => {
    const { token } = await getAuthUser("comment7@example.com");
    const show = await createShow();

    const createRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), content: "Likeable" });

    const likeRes = await request(app)
      .post(`/api/comments/${createRes.body.id}/like`)
      .set("Authorization", `Bearer ${token}`);

    expect(likeRes.status).toBe(204);

    const listRes1 = await request(app)
      .get(`/api/comments/show/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes1.body.comments[0].likesCount).toBe(1);
    expect(listRes1.body.comments[0].likedByMe).toBe(true);

    const unlikeRes = await request(app)
      .delete(`/api/comments/${createRes.body.id}/like`)
      .set("Authorization", `Bearer ${token}`);

    expect(unlikeRes.status).toBe(204);

    const listRes2 = await request(app)
      .get(`/api/comments/show/${show._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes2.body.comments[0].likesCount).toBe(0);
    expect(listRes2.body.comments[0].likedByMe).toBe(false);
  });

  it("should reject updating another user's comment", async () => {
    const { token: ownerToken } = await getAuthUser("owner@example.com");
    const { token: otherToken } = await getAuthUser("other@example.com");
    const show = await createShow();

    const createRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ showId: show._id.toString(), content: "Mine" });

    const updateRes = await request(app)
      .patch(`/api/comments/${createRes.body.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ content: "Hacked" });

    expect(updateRes.status).toBe(404);
  });

  it("should reject a reply to a reply", async () => {
    const { token } = await getAuthUser("nested@example.com");
    const show = await createShow();

    const parentRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), content: "Parent" });

    const replyRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), parentId: parentRes.body.id, content: "Reply" });

    const nestedRes = await request(app)
      .post("/api/comments")
      .set("Authorization", `Bearer ${token}`)
      .send({ showId: show._id.toString(), parentId: replyRes.body.id, content: "Nested" });

    expect(nestedRes.status).toBe(400);
  });
});
