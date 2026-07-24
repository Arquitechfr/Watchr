import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { User } from "../src/models/user.model.js";
import { RevolutWebhookEvent } from "../src/models/revolutWebhookEvent.model.js";
import type { RevolutSubscription } from "../src/lib/revolutClient.js";

const mockGetRevolutSubscription = vi.fn();

vi.mock("../src/lib/revolutClient.js", () => ({
  getRevolutSubscription: (...args: unknown[]) => mockGetRevolutSubscription(...args),
  RevolutApiError: class RevolutApiError extends Error {
    constructor(public status: number, public body: unknown) {
      super(`Revolut API error: ${status}`);
    }
  },
}));

vi.mock("../src/config/firebaseAdmin.js", () => ({
  firebaseAuth: {
    verifyIdToken: vi.fn(),
  },
}));

vi.mock("express-rate-limit", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const app = createApp();

const SIGNING_SECRET = "test_signing_secret";

function signPayload(rawBody: string, timestamp: string): string {
  const payloadToSign = `v1.${timestamp}.${rawBody}`;
  const sig =
    "v1=" +
    crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(payloadToSign, "utf8")
      .digest("hex");
  return sig;
}

function buildWebhookRequest(body: object, opts?: { timestamp?: string; signature?: string }) {
  const rawBody = JSON.stringify(body);
  const timestamp = opts?.timestamp ?? String(Date.now());
  const signature = opts?.signature ?? signPayload(rawBody, timestamp);
  return request(app)
    .post("/api/webhooks/revolut")
    .set("Content-Type", "application/json")
    .set("Revolut-Signature", signature)
    .set("Revolut-Request-Timestamp", timestamp)
    .send(rawBody);
}

describe("Revolut Webhook", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(async () => {
    await clearDatabase();
    mockGetRevolutSubscription.mockReset();
  });

  it("should upgrade user to vip when subscription state is active", async () => {
    const user = await User.create({
      email: "test@test-watchr.dev",
      username: "testuser",
      passwordHash: "hash",
      subscriptionPlan: "free",
    });

    const sub: RevolutSubscription = {
      id: "sub-123",
      external_reference: user._id.toString(),
      state: "active",
    };
    mockGetRevolutSubscription.mockResolvedValue(sub);

    const res = await buildWebhookRequest({
      event: "SUBSCRIPTION_INITIATED",
      subscription_id: "sub-123",
    });

    expect(res.status).toBe(204);
    const updated = await User.findById(user._id);
    expect(updated?.subscriptionPlan).toBe("vip");
  });

  it("should reject invalid signature with 401", async () => {
    const user = await User.create({
      email: "test2@test-watchr.dev",
      username: "testuser2",
      passwordHash: "hash",
      subscriptionPlan: "free",
    });

    const res = await buildWebhookRequest(
      { event: "SUBSCRIPTION_INITIATED", subscription_id: "sub-123" },
      { signature: "v1=invalidsignature" },
    );

    expect(res.status).toBe(401);
    const updated = await User.findById(user._id);
    expect(updated?.subscriptionPlan).toBe("free");
    expect(mockGetRevolutSubscription).not.toHaveBeenCalled();
  });

  it("should reject expired timestamp with 401", async () => {
    const expiredTimestamp = String(Date.now() - 6 * 60 * 1000);
    const res = await buildWebhookRequest(
      { event: "SUBSCRIPTION_INITIATED", subscription_id: "sub-123" },
      { timestamp: expiredTimestamp },
    );

    expect(res.status).toBe(401);
    expect(mockGetRevolutSubscription).not.toHaveBeenCalled();
  });

  it("should short-circuit duplicate events without calling Revolut API", async () => {
    const user = await User.create({
      email: "test3@test-watchr.dev",
      username: "testuser3",
      passwordHash: "hash",
      subscriptionPlan: "free",
    });

    const sub: RevolutSubscription = {
      id: "sub-456",
      external_reference: user._id.toString(),
      state: "active",
    };
    mockGetRevolutSubscription.mockResolvedValue(sub);

    const body = { event: "SUBSCRIPTION_INITIATED", subscription_id: "sub-456" };
    const timestamp = String(Date.now());
    const rawBody = JSON.stringify(body);
    const signature = signPayload(rawBody, timestamp);

    const req = () =>
      request(app)
        .post("/api/webhooks/revolut")
        .set("Content-Type", "application/json")
        .set("Revolut-Signature", signature)
        .set("Revolut-Request-Timestamp", timestamp)
        .send(rawBody);

    const res1 = await req();
    expect(res1.status).toBe(204);

    const res2 = await req();
    expect(res2.status).toBe(204);

    expect(mockGetRevolutSubscription).toHaveBeenCalledTimes(1);
  });

  it("should downgrade user to free when subscription state is cancelled", async () => {
    const user = await User.create({
      email: "test4@test-watchr.dev",
      username: "testuser4",
      passwordHash: "hash",
      subscriptionPlan: "vip",
    });

    const sub: RevolutSubscription = {
      id: "sub-789",
      external_reference: user._id.toString(),
      state: "cancelled",
    };
    mockGetRevolutSubscription.mockResolvedValue(sub);

    const res = await buildWebhookRequest({
      event: "SUBSCRIPTION_CANCELLED",
      subscription_id: "sub-789",
    });

    expect(res.status).toBe(204);
    const updated = await User.findById(user._id);
    expect(updated?.subscriptionPlan).toBe("free");
  });

  it("should not change user plan when subscription state is pending", async () => {
    const user = await User.create({
      email: "test5@test-watchr.dev",
      username: "testuser5",
      passwordHash: "hash",
      subscriptionPlan: "free",
    });

    const sub: RevolutSubscription = {
      id: "sub-pending",
      external_reference: user._id.toString(),
      state: "pending",
    };
    mockGetRevolutSubscription.mockResolvedValue(sub);

    const res = await buildWebhookRequest({
      event: "SUBSCRIPTION_INITIATED",
      subscription_id: "sub-pending",
    });

    expect(res.status).toBe(204);
    const updated = await User.findById(user._id);
    expect(updated?.subscriptionPlan).toBe("free");
  });

  it("should not change user plan when subscription state is unknown", async () => {
    const user = await User.create({
      email: "test6@test-watchr.dev",
      username: "testuser6",
      passwordHash: "hash",
      subscriptionPlan: "vip",
    });

    const sub: RevolutSubscription = {
      id: "sub-foo",
      external_reference: user._id.toString(),
      state: "foo",
    };
    mockGetRevolutSubscription.mockResolvedValue(sub);

    const res = await buildWebhookRequest({
      event: "SUBSCRIPTION_INITIATED",
      subscription_id: "sub-foo",
    });

    expect(res.status).toBe(204);
    const updated = await User.findById(user._id);
    expect(updated?.subscriptionPlan).toBe("vip");
  });

  it("should return 204 when external_reference is missing or invalid", async () => {
    const sub: RevolutSubscription = {
      id: "sub-no-ref",
      external_reference: null,
      state: "active",
    };
    mockGetRevolutSubscription.mockResolvedValue(sub);

    const res = await buildWebhookRequest({
      event: "SUBSCRIPTION_INITIATED",
      subscription_id: "sub-no-ref",
    });

    expect(res.status).toBe(204);
    expect(mockGetRevolutSubscription).toHaveBeenCalledTimes(1);
    const count = await User.countDocuments({ subscriptionPlan: "vip" });
    expect(count).toBe(0);
  });

  it("should return 500 when getRevolutSubscription throws RevolutApiError", async () => {
    const { RevolutApiError } = await import("../src/lib/revolutClient.js");
    mockGetRevolutSubscription.mockRejectedValue(
      new RevolutApiError(404, { error: "not_found" }),
    );

    const res = await buildWebhookRequest({
      event: "SUBSCRIPTION_INITIATED",
      subscription_id: "sub-error",
    });

    expect(res.status).toBe(500);
    const count = await User.countDocuments({ subscriptionPlan: "vip" });
    expect(count).toBe(0);
  });
});
