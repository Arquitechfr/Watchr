import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { User } from "../src/models/user.model.js";
import { MobileConfig } from "../src/models/MobileConfig.js";
import { env } from "../src/config/env.js";

const mockCreateRevolutCustomer = vi.fn();
const mockCreateRevolutSubscription = vi.fn();
const mockGetRevolutOrder = vi.fn();
const mockCancelRevolutSubscription = vi.fn();
const mockGetRevolutSubscription = vi.fn();

vi.mock("../src/lib/revolutClient.js", () => ({
  createRevolutCustomer: (...args: unknown[]) => mockCreateRevolutCustomer(...args),
  createRevolutSubscription: (...args: unknown[]) => mockCreateRevolutSubscription(...args),
  getRevolutOrder: (...args: unknown[]) => mockGetRevolutOrder(...args),
  cancelRevolutSubscription: (...args: unknown[]) => mockCancelRevolutSubscription(...args),
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

async function createUserAndToken(email: string, username: string, subscriptionPlan: "free" | "vip" = "free") {
  const user = await User.create({
    email,
    username,
    passwordHash: await bcrypt.hash("password123", 12),
    subscriptionPlan,
  });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
  return { user, token };
}

describe("Subscription API", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(async () => {
    await clearDatabase();
    mockCreateRevolutCustomer.mockReset();
    mockCreateRevolutSubscription.mockReset();
    mockGetRevolutOrder.mockReset();
    mockCancelRevolutSubscription.mockReset();
    mockGetRevolutSubscription.mockReset();

    await MobileConfig.create({
      key: "revolut_plan_variation_id",
      value: "test-variation-id",
      type: "string",
      updatedBy: "test",
    });
  });

  it("POST /subscriptions/start — free user gets checkoutUrl", async () => {
    const { user, token } = await createUserAndToken("sub1@test.com", "subuser1");

    mockCreateRevolutCustomer.mockResolvedValue({ id: "cust-123", email: "sub1@test.com" });
    mockCreateRevolutSubscription.mockResolvedValue({
      id: "sub-abc",
      setup_order_id: "order-xyz",
      state: "pending",
    });
    mockGetRevolutOrder.mockResolvedValue({
      id: "order-xyz",
      checkout_url: "https://checkout.revolut.com/pay/xyz",
      state: "pending",
    });

    const res = await request(app)
      .post("/api/subscriptions/start")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toBe("https://checkout.revolut.com/pay/xyz");
    expect(res.body.subscriptionId).toBe("sub-abc");

    const updated = await User.findById(user._id);
    expect(updated?.revolutCustomerId).toBe("cust-123");
    expect(updated?.revolutSubscriptionId).toBe("sub-abc");
  });

  it("POST /subscriptions/start — already VIP returns 400", async () => {
    const { token } = await createUserAndToken("sub2@test.com", "subuser2", "vip");

    const res = await request(app)
      .post("/api/subscriptions/start")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ALREADY_VIP");
  });

  it("POST /subscriptions/cancel — VIP user gets downgraded to free", async () => {
    const { user, token } = await createUserAndToken("sub3@test.com", "subuser3", "vip");
    await User.findByIdAndUpdate(user._id, { revolutSubscriptionId: "sub-cancel-123" });

    mockCancelRevolutSubscription.mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/subscriptions/cancel")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await User.findById(user._id);
    expect(updated?.subscriptionPlan).toBe("free");
    expect(updated?.revolutSubscriptionId).toBeNull();
  });

  it("POST /subscriptions/cancel — free user returns 400", async () => {
    const { token } = await createUserAndToken("sub4@test.com", "subuser4", "free");

    const res = await request(app)
      .post("/api/subscriptions/cancel")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_ACTIVE_SUBSCRIPTION");
  });

  it("GET /subscriptions/status — returns plan and state for VIP", async () => {
    const { user, token } = await createUserAndToken("sub5@test.com", "subuser5", "vip");
    await User.findByIdAndUpdate(user._id, { revolutSubscriptionId: "sub-status-123" });

    mockGetRevolutSubscription.mockResolvedValue({
      id: "sub-status-123",
      external_reference: user._id.toString(),
      state: "active",
    });

    const res = await request(app)
      .get("/api/subscriptions/status")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe("vip");
    expect(res.body.state).toBe("active");
  });

  it("GET /subscriptions/status — returns plan for free user", async () => {
    const { token } = await createUserAndToken("sub6@test.com", "subuser6", "free");

    const res = await request(app)
      .get("/api/subscriptions/status")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe("free");
  });
});
