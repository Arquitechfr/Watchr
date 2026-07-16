import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { Show } from "../src/models/show.model.js";
import { User } from "../src/models/user.model.js";
import { Rating } from "../src/models/rating.model.js";
import { WatchEntry } from "../src/models/watchEntry.model.js";
import { Comment } from "../src/models/comment.model.js";
import { Follow } from "../src/models/follow.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

const app = createApp();

async function getAuthUser(username: string, email: string) {
  const user = await User.create({
    email,
    username,
    passwordHash: await bcrypt.hash("password123", 12),
  });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  return { user, token };
}

async function createShow(tmdbId: number, title: string) {
  return Show.create({
    tmdbId,
    type: "tv",
    title,
    seasons: [{ seasonNumber: 1, episodeCount: 2, episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }] }],
  });
}

describe("Social", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  describe("Follow / Unfollow", () => {
    it("should follow a user successfully", async () => {
      const { user: userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const res = await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(201);
      expect(res.body.isFollowing).toBe(true);

      const followDoc = await Follow.findOne({ followerId: userA._id, followingId: userB._id });
      expect(followDoc).toBeTruthy();
    });

    it("should be idempotent when following twice", async () => {
      const { user: userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res2 = await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res2.status).toBe(201);
      expect(res2.body.isFollowing).toBe(true);

      const count = await Follow.countDocuments({ followerId: userA._id, followingId: userB._id });
      expect(count).toBe(1);
    });

    it("should reject self-follow", async () => {
      const { user, token } = await getAuthUser("SelfUser", "self@example.com");

      const res = await request(app)
        .post(`/api/social/follow/${user._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("SELF_FOLLOW");
    });

    it("should reject following a non-existent user", async () => {
      const { token } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .post("/api/social/follow/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("should reject following a banned user", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      await User.findByIdAndUpdate(userB._id, { isBanned: true });

      const res = await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("USER_BANNED");
    });

    it("should unfollow a user successfully", async () => {
      const { user: userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .delete(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(204);

      const followDoc = await Follow.findOne({ followerId: userA._id, followingId: userB._id });
      expect(followDoc).toBeNull();
    });

    it("should unfollow without error even if not following", async () => {
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .delete(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(204);
    });

    it("should return follow status correctly", async () => {
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");

      const res1 = await request(app)
        .get(`/api/social/follow/${userB._id}/status`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res1.status).toBe(200);
      expect(res1.body.isFollowing).toBe(false);

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res2 = await request(app)
        .get(`/api/social/follow/${userB._id}/status`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res2.status).toBe(200);
      expect(res2.body.isFollowing).toBe(true);
    });
  });

  describe("Follow counts", () => {
    it("should return correct follower and following counts", async () => {
      const { user: userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get(`/api/social/followers/${userB._id}?page=1&limit=20`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].username).toBe("UserA");
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe("Public profile", () => {
    it("should return public profile by username", async () => {
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .get("/api/social/users/UserB")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe("UserB");
      expect(res.body.id).toBe(userB._id.toString());
      expect(res.body.isFollowing).toBe(false);
      expect(res.body.activityVisibility).toBe("private");
      expect(res.body.email).toBeUndefined();
    });

    it("should return 404 for non-existent username", async () => {
      const { token } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .get("/api/social/users/NonExistent")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("Activity visibility", () => {
    it("should update activity visibility to public", async () => {
      const { user, token } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .patch("/api/social/me/activity-visibility")
        .set("Authorization", `Bearer ${token}`)
        .send({ activityVisibility: "public" });

      expect(res.status).toBe(200);
      expect(res.body.activityVisibility).toBe("public");

      const updatedUser = await User.findById(user._id).select("activityVisibility").lean();
      expect(updatedUser?.activityVisibility).toBe("public");
    });

    it("should reject invalid visibility value", async () => {
      const { token } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .patch("/api/social/me/activity-visibility")
        .set("Authorization", `Bearer ${token}`)
        .send({ activityVisibility: "invalid" });

      expect(res.status).toBe(400);
    });
  });

  describe("Search users", () => {
    it("should search users by prefix", async () => {
      await getAuthUser("Alice", "alice@example.com");
      await getAuthUser("Alicia", "alicia@example.com");
      await getAuthUser("Bob", "bob@example.com");
      const { token } = await getAuthUser("CurrentUser", "current@example.com");

      const res = await request(app)
        .get("/api/social/search?q=Ali&page=1&limit=10")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((u: { username: string }) => u.username.startsWith("Ali"))).toBe(true);
    });

    it("should exclude self from search results", async () => {
      await getAuthUser("Alice", "alice@example.com");
      const { token } = await getAuthUser("Alicia", "alicia@example.com");

      const res = await request(app)
        .get("/api/social/search?q=Ali&page=1&limit=10")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].username).toBe("Alice");
    });

    it("should reject query shorter than 2 characters", async () => {
      const { token } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .get("/api/social/search?q=A&page=1&limit=10")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe("Friends activity feed", () => {
    it("should return empty feed when not following anyone", async () => {
      const { token } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .get("/api/social/activity?page=1&limit=20")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("should exclude activity from private users", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const show = await createShow(100, "Test Show");

      await Rating.create({
        userId: userB._id,
        showId: show._id,
        value: 4,
      });

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      // userB has activityVisibility = "private" (default)
      const res = await request(app)
        .get("/api/social/activity?page=1&limit=20")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("should include ratings from public users", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const show = await createShow(101, "Rated Show");

      await User.findByIdAndUpdate(userB._id, { activityVisibility: "public" });

      await Rating.create({
        userId: userB._id,
        showId: show._id,
        value: 5,
      });

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get("/api/social/activity?page=1&limit=20")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe("rating");
      expect(res.body.data[0].rating.value).toBe(5);
      expect(res.body.data[0].user.username).toBe("UserB");
      expect(res.body.data[0].show.title).toBe("Rated Show");
    });

    it("should include watchlist adds from public users with plan_to_watch status", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const show = await createShow(102, "Watchlist Show");

      await User.findByIdAndUpdate(userB._id, { activityVisibility: "public" });

      await WatchEntry.create({
        userId: userB._id,
        showId: show._id,
        status: "plan_to_watch",
      });

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get("/api/social/activity?page=1&limit=20")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe("watchlist_add");
    });

    it("should exclude watchlist adds with dropped status", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const show = await createShow(103, "Dropped Show");

      await User.findByIdAndUpdate(userB._id, { activityVisibility: "public" });

      await WatchEntry.create({
        userId: userB._id,
        showId: show._id,
        status: "dropped",
      });

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get("/api/social/activity?page=1&limit=20")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("should include non-spoiler comments from public users", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const show = await createShow(104, "Commented Show");

      await User.findByIdAndUpdate(userB._id, { activityVisibility: "public" });

      await Comment.create({
        userId: userB._id,
        showId: show._id,
        content: "Great show!",
        isSpoiler: false,
        isHidden: false,
      });

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get("/api/social/activity?page=1&limit=20")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe("comment");
      expect(res.body.data[0].comment.content).toBe("Great show!");
    });

    it("should exclude spoiler comments from feed", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const show = await createShow(105, "Spoiler Show");

      await User.findByIdAndUpdate(userB._id, { activityVisibility: "public" });

      await Comment.create({
        userId: userB._id,
        showId: show._id,
        content: "The main character dies!",
        isSpoiler: true,
        isHidden: false,
      });

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get("/api/social/activity?page=1&limit=20")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("should group watchlist adds within 5-minute window", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      await User.findByIdAndUpdate(userB._id, { activityVisibility: "public" });

      const show1 = await createShow(110, "Show One");
      const show2 = await createShow(111, "Show Two");
      const show3 = await createShow(112, "Show Three");
      const show4 = await createShow(113, "Show Four");

      const now = new Date();
      await WatchEntry.insertMany([
        { userId: userB._id, showId: show1._id, status: "plan_to_watch", createdAt: now },
        { userId: userB._id, showId: show2._id, status: "plan_to_watch", createdAt: new Date(now.getTime() + 60_000) },
        { userId: userB._id, showId: show3._id, status: "plan_to_watch", createdAt: new Date(now.getTime() + 120_000) },
        { userId: userB._id, showId: show4._id, status: "plan_to_watch", createdAt: new Date(now.getTime() + 10 * 60_000) },
      ]);

      await request(app)
        .post(`/api/social/follow/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get("/api/social/activity?page=1&limit=20")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      // 3 grouped + 1 separate = 2 items
      expect(res.body.data).toHaveLength(2);

      const groupedItem = res.body.data.find((d: { watchlistAdd?: { count: number } }) => d.watchlistAdd?.count > 1);
      expect(groupedItem).toBeTruthy();
      expect(groupedItem.watchlistAdd.count).toBe(3);
      expect(groupedItem.watchlistAdd.titles).toHaveLength(3);
    });
  });

  describe("Rate limiting", () => {
    it("should rate limit follow requests after 20 in 1 minute", async () => {
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");

      // Create 20 extra users to follow (idempotent — can follow same user)
      const targetId = userB._id.toString();
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post(`/api/social/follow/${targetId}`)
          .set("Authorization", `Bearer ${tokenA}`);
      }

      const res = await request(app)
        .post(`/api/social/follow/${targetId}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(429);
    });
  });
});
