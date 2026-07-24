import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { User } from "../src/models/user.model.js";
import { Conversation } from "../src/models/conversation.model.js";
import { Message } from "../src/models/message.model.js";
import { UserBlock } from "../src/models/userBlock.model.js";
import { MessageReport } from "../src/models/messageReport.model.js";
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

describe("Messaging System", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  describe("Conversation creation", () => {
    it("should create a new conversation between two users", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const res = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(201);
      expect(res.body.isNew).toBe(true);
      expect(res.body.id).toBeTruthy();

      const conv = await Conversation.findById(res.body.id);
      expect(conv).toBeTruthy();
      expect(conv!.participantIds).toHaveLength(2);
    });

    it("should return existing conversation if already exists", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const res1 = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res2 = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res2.body.isNew).toBe(false);
      expect(res1.body.id).toBe(res2.body.id);
    });

    it("should not allow conversation with self", async () => {
      const { user: userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .post(`/api/messages/conversations/${userA._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("CANNOT_MESSAGE_SELF");
    });

    it("should not allow conversation with non-existent user", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");

      const res = await request(app)
        .post(`/api/messages/conversations/507f1f77bcf86cd799439011`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });
  });

  describe("Send message", () => {
    it("should send a message in a conversation", async () => {
      const { user: userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const conversationId = convRes.body.id;

      const res = await request(app)
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Hello World!" });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe("Hello World!");
      expect(res.body.senderId).toBe(userA._id.toString());
      expect(res.body.isDeleted).toBe(false);
    });

    it("should not send message to a conversation the user is not part of", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { token: tokenC } = await getAuthUser("UserC", "c@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ content: "Intrusion!" });

      expect(res.status).toBe(403);
    });

    it("should reject empty message content", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "" });

      expect(res.status).toBe(400);
    });
  });

  describe("Message edit", () => {
    it("should edit own message", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Original" });

      const res = await request(app)
        .patch(`/api/messages/${msgRes.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Edited" });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe("Edited");
      expect(res.body.editedAt).not.toBeNull();
    });

    it("should not edit another user's message", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "From A" });

      const res = await request(app)
        .patch(`/api/messages/${msgRes.body.id}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ content: "Hacked" });

      expect(res.status).toBe(403);
    });
  });

  describe("Message delete", () => {
    it("should delete own message", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "To be deleted" });

      const res = await request(app)
        .delete(`/api/messages/${msgRes.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);

      const msg = await Message.findById(msgRes.body.id);
      expect(msg!.isDeleted).toBe(true);
      expect(msg!.content).toBe("");
    });
  });

  describe("Reactions", () => {
    it("should add and remove a reaction", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "React to me" });

      const addRes = await request(app)
        .post(`/api/messages/${msgRes.body.id}/reactions`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ emoji: "👍" });

      expect(addRes.status).toBe(201);
      expect(addRes.body.reactions).toHaveLength(1);
      expect(addRes.body.reactions[0].emoji).toBe("👍");

      const removeRes = await request(app)
        .delete(`/api/messages/${msgRes.body.id}/reactions`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ emoji: "👍" });

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.reactions).toHaveLength(0);
    });
  });

  describe("Mark as read", () => {
    it("should mark messages as read", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Unread message" });

      const res = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/read`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.marked).toBeGreaterThan(0);
    });
  });

  describe("Report message", () => {
    it("should report a message", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Report me" });

      const res = await request(app)
        .post(`/api/messages/${msgRes.body.id}/report`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ reason: "spam" });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");

      const report = await MessageReport.findOne({ messageId: msgRes.body.id });
      expect(report).toBeTruthy();
      expect(report!.reason).toBe("spam");
    });

    it("should not allow duplicate reports", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Report me twice" });

      await request(app)
        .post(`/api/messages/${msgRes.body.id}/report`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ reason: "spam" });

      const res = await request(app)
        .post(`/api/messages/${msgRes.body.id}/report`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ reason: "harassment" });

      expect(res.status).toBe(409);
    });
  });

  describe("User blocking", () => {
    it("should block a user", async () => {
      const { user: userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const res = await request(app)
        .post(`/api/blocks/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(201);
      expect(res.body.blocked).toBe(true);

      const block = await UserBlock.findOne({ blockerId: userA._id, blockedId: userB._id });
      expect(block).toBeTruthy();
    });

    it("should not send message to blocked user", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      await request(app)
        .post(`/api/blocks/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "After block" });

      expect(res.status).toBe(403);
    });

    it("should unblock a user", async () => {
      const { user: userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      await request(app)
        .post(`/api/blocks/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .delete(`/api/blocks/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.unblocked).toBe(true);

      const block = await UserBlock.findOne({ blockerId: userA._id, blockedId: userB._id });
      expect(block).toBeNull();
    });

    it("should list blocked users", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      await request(app)
        .post(`/api/blocks/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get(`/api/blocks`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].id).toBe(userB._id.toString());
    });
  });

  describe("Unread count", () => {
    it("should return total unread count", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Unread 1" });

      await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Unread 2" });

      const res = await request(app)
        .get(`/api/messages/unread-count`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(2);
    });
  });

  describe("Archive / Mute", () => {
    it("should archive and unarchive a conversation", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const archiveRes = await request(app)
        .patch(`/api/messages/conversations/${convRes.body.id}/archive`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ archived: true });

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.archived).toBe(true);

      const unarchiveRes = await request(app)
        .patch(`/api/messages/conversations/${convRes.body.id}/archive`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ archived: false });

      expect(unarchiveRes.status).toBe(200);
      expect(unarchiveRes.body.unarchived).toBe(true);
    });

    it("should mute and unmute a conversation", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const muteRes = await request(app)
        .patch(`/api/messages/conversations/${convRes.body.id}/mute`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ muted: true });

      expect(muteRes.status).toBe(200);
      expect(muteRes.body.muted).toBe(true);

      const unmuteRes = await request(app)
        .patch(`/api/messages/conversations/${convRes.body.id}/mute`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ muted: false });

      expect(unmuteRes.status).toBe(200);
      expect(unmuteRes.body.unmuted).toBe(true);
    });

    it("should delete and restore a conversation (soft delete)", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const deleteRes = await request(app)
        .delete(`/api/messages/conversations/${convRes.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.deleted).toBe(true);

      const listRes = await request(app)
        .get(`/api/messages/conversations`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.conversations.find((c: { id: string }) => c.id === convRes.body.id)).toBeUndefined();

      const restoreRes = await request(app)
        .patch(`/api/messages/conversations/${convRes.body.id}/restore`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.restored).toBe(true);

      const listRes2 = await request(app)
        .get(`/api/messages/conversations`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(listRes2.status).toBe(200);
      expect(listRes2.body.conversations.find((c: { id: string }) => c.id === convRes.body.id)).toBeTruthy();
    });

    it("should not affect the other participant when one deletes a conversation", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { token: tokenB, user: userA } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userA._id}`)
        .set("Authorization", `Bearer ${tokenB}`);

      await request(app)
        .delete(`/api/messages/conversations/${convRes.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const listB = await request(app)
        .get(`/api/messages/conversations`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(listB.status).toBe(200);
      expect(listB.body.conversations.find((c: { id: string }) => c.id === convRes.body.id)).toBeTruthy();
    });
  });

  describe("Conversation reactivation on new message (Bug 1)", () => {
    it("should unarchive conversation for recipient when they receive a new message", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const conversationId = convRes.body.id;

      await request(app)
        .patch(`/api/messages/conversations/${conversationId}/archive`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ archived: true });

      const listBefore = await request(app)
        .get(`/api/messages/conversations`)
        .set("Authorization", `Bearer ${tokenB}`);
      expect(listBefore.body.conversations.find((c: { id: string }) => c.id === conversationId)).toBeUndefined();

      await request(app)
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Reactivate!" });

      const listAfter = await request(app)
        .get(`/api/messages/conversations`)
        .set("Authorization", `Bearer ${tokenB}`);
      expect(listAfter.body.conversations.find((c: { id: string }) => c.id === conversationId)).toBeTruthy();
    });

    it("should undelete conversation for recipient when they receive a new message", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const conversationId = convRes.body.id;

      await request(app)
        .delete(`/api/messages/conversations/${conversationId}`)
        .set("Authorization", `Bearer ${tokenB}`);

      const listBefore = await request(app)
        .get(`/api/messages/conversations`)
        .set("Authorization", `Bearer ${tokenB}`);
      expect(listBefore.body.conversations.find((c: { id: string }) => c.id === conversationId)).toBeUndefined();

      await request(app)
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Reactivate from delete!" });

      const listAfter = await request(app)
        .get(`/api/messages/conversations`)
        .set("Authorization", `Bearer ${tokenB}`);
      expect(listAfter.body.conversations.find((c: { id: string }) => c.id === conversationId)).toBeTruthy();
    });
  });

  describe("Unread count excludes deleted conversations (Bug 2)", () => {
    it("should not count unread messages from deleted conversations", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Unread in deleted conv" });

      await request(app)
        .delete(`/api/messages/conversations/${convRes.body.id}`)
        .set("Authorization", `Bearer ${tokenB}`);

      const res = await request(app)
        .get(`/api/messages/unread-count`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(0);
    });
  });

  describe("Reaction participation check (Bug 5)", () => {
    it("should not allow non-participant to add a reaction", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { token: tokenC } = await getAuthUser("UserC", "c@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "React test" });

      const res = await request(app)
        .post(`/api/messages/${msgRes.body.id}/reactions`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ emoji: "👍" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("NOT_PARTICIPANT");
    });

    it("should not allow non-participant to remove a reaction", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { token: tokenC } = await getAuthUser("UserC", "c@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "React test" });

      await request(app)
        .post(`/api/messages/${msgRes.body.id}/reactions`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ emoji: "👍" });

      const res = await request(app)
        .delete(`/api/messages/${msgRes.body.id}/reactions`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ emoji: "👍" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("NOT_PARTICIPANT");
    });
  });

  describe("Report participation check (Bug 6)", () => {
    it("should not allow non-participant to report a message", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { token: tokenC } = await getAuthUser("UserC", "c@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Report test" });

      const res = await request(app)
        .post(`/api/messages/${msgRes.body.id}/report`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ reason: "spam" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("NOT_PARTICIPANT");
    });
  });

  describe("Hidden messages filtered from getMessages (Bug 7)", () => {
    it("should not return hidden messages in getMessages", async () => {
      const { token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB, token: tokenB } = await getAuthUser("UserB", "b@example.com");

      const convRes = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const msgRes = await request(app)
        .post(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Will be hidden" });

      await Message.updateOne({ _id: msgRes.body.id }, { $set: { isHidden: true } });

      const res = await request(app)
        .get(`/api/messages/conversations/${convRes.body.id}/messages`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.messages.find((m: { id: string }) => m.id === msgRes.body.id)).toBeUndefined();
    });
  });

  describe("Welcome message", () => {
    it("should send welcome message content in correct locale", async () => {
      const { translations } = await import("../src/i18n/translations.js");
      expect(translations.en.welcomeMessage?.content).toBeTruthy();
      expect(translations.fr.welcomeMessage?.content).toBeTruthy();
      expect(translations.es.welcomeMessage?.content).toBeTruthy();
      expect(translations.pt.welcomeMessage?.content).toBeTruthy();
      expect(translations.de.welcomeMessage?.content).toBeTruthy();
      expect(translations.it.welcomeMessage?.content).toBeTruthy();
      expect(translations.ar.welcomeMessage?.content).toBeTruthy();
    });
  });

  describe("Multiple conversations with same user (regression: multikey index bug)", () => {
    it("should allow a user to have conversations with multiple different users", async () => {
      const { user: _userA, token: tokenA } = await getAuthUser("UserA", "a@example.com");
      const { user: userB } = await getAuthUser("UserB", "b@example.com");
      const { user: userC } = await getAuthUser("UserC", "c@example.com");

      const res1 = await request(app)
        .post(`/api/messages/conversations/${userB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res2 = await request(app)
        .post(`/api/messages/conversations/${userC._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.isNew).toBe(true);
      expect(res2.body.isNew).toBe(true);
      expect(res1.body.id).not.toBe(res2.body.id);

      const conv1 = await Conversation.findById(res1.body.id);
      const conv2 = await Conversation.findById(res2.body.id);
      expect(conv1!.participantKey).toBeTruthy();
      expect(conv2!.participantKey).toBeTruthy();
      expect(conv1!.participantKey).not.toBe(conv2!.participantKey);
    });
  });

  describe("Admin message routes", () => {
    it("should get message stats as admin", async () => {
      const admin = await User.create({
        email: "admin@example.com",
        username: "admin",
        passwordHash: await bcrypt.hash("password123", 12),
        role: "admin",
      });
      const token = jwt.sign({ sub: admin._id.toString() }, env.JWT_ACCESS_SECRET, {
        expiresIn: "15m",
      });

      const res = await request(app)
        .get(`/api/admin/messages/stats`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalConversations");
      expect(res.body).toHaveProperty("totalMessages");
      expect(res.body).toHaveProperty("pendingReports");
    });

    it("should reject admin routes for non-admin users", async () => {
      const { token } = await getAuthUser("RegularUser", "regular@example.com");

      const res = await request(app)
        .get(`/api/admin/messages/stats`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
