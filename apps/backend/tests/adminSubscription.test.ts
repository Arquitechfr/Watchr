import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { User } from "../src/models/user.model.js";
import { VipFeature } from "../src/models/vipFeature.model.js";
import { env } from "../src/config/env.js";

const mockCancelRevolutSubscription = vi.fn();
const mockTranslateMultiLang = vi.fn();

vi.mock("../src/lib/revolutClient.js", () => ({
  createRevolutCustomer: vi.fn(),
  createRevolutSubscription: vi.fn(),
  getRevolutOrder: vi.fn(),
  cancelRevolutSubscription: (...args: unknown[]) => mockCancelRevolutSubscription(...args),
  getRevolutSubscription: vi.fn(),
  RevolutApiError: class RevolutApiError extends Error {
    constructor(public status: number, public body: unknown) {
      super(`Revolut API error: ${status}`);
    }
  },
}));

vi.mock("../src/services/translation.service.js", () => ({
  translateMultiLang: (...args: unknown[]) => mockTranslateMultiLang(...args),
  detectLanguage: vi.fn(),
  pickLongestText: vi.fn(),
  translateForUser: vi.fn(),
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

async function createAdminAndToken(email: string, username: string) {
  const user = await User.create({
    email,
    username,
    passwordHash: await bcrypt.hash("password123", 12),
    role: "admin",
    subscriptionPlan: "free",
  });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
  return { user, token };
}

async function createUser(email: string, username: string, subscriptionPlan: "free" | "vip" = "free") {
  return User.create({
    email,
    username,
    passwordHash: await bcrypt.hash("password123", 12),
    subscriptionPlan,
  });
}

describe("Admin Subscription API", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(async () => {
    await clearDatabase();
    mockCancelRevolutSubscription.mockReset();
    mockTranslateMultiLang.mockReset();
  });

  // ─── Stats ───

  it("GET /admin/subscriptions/stats — returns subscription stats", async () => {
    const { token } = await createAdminAndToken("admin1@test.com", "admin1");
    await createUser("user1@test.com", "user1", "vip");
    await createUser("user2@test.com", "user2", "free");
    await createUser("user3@test.com", "user3", "vip");

    const res = await request(app)
      .get("/api/admin/subscriptions/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalVip).toBe(2);
    expect(res.body.totalFree).toBe(1);
  });

  // ─── List ───

  it("GET /admin/subscriptions — returns paginated list", async () => {
    const { token } = await createAdminAndToken("admin2@test.com", "admin2");
    await createUser("user4@test.com", "user4", "vip");
    await createUser("user5@test.com", "user5", "free");

    const res = await request(app)
      .get("/api/admin/subscriptions?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(3); // 2 users + admin
    expect(res.body.total).toBe(3);
  });

  it("GET /admin/subscriptions — filter by plan=vip", async () => {
    const { token } = await createAdminAndToken("admin3@test.com", "admin3");
    await createUser("user6@test.com", "user6", "vip");
    await createUser("user7@test.com", "user7", "free");

    const res = await request(app)
      .get("/api/admin/subscriptions?plan=vip")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.users.every((u: { subscriptionPlan: string }) => u.subscriptionPlan === "vip")).toBe(true);
  });

  // ─── Cancel ───

  it("POST /admin/subscriptions/:userId/cancel — cancels VIP subscription", async () => {
    const { token } = await createAdminAndToken("admin4@test.com", "admin4");
    const target = await createUser("user8@test.com", "user8", "vip");
    await User.findByIdAndUpdate(target._id, { revolutSubscriptionId: "sub-cancel-test" });

    mockCancelRevolutSubscription.mockResolvedValue(undefined);

    const res = await request(app)
      .post(`/api/admin/subscriptions/${target._id}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockCancelRevolutSubscription).toHaveBeenCalledWith("sub-cancel-test");

    const updated = await User.findById(target._id);
    expect(updated?.subscriptionPlan).toBe("free");
    expect(updated?.revolutSubscriptionId).toBeNull();
  });

  it("POST /admin/subscriptions/:userId/cancel — non-VIP returns 400", async () => {
    const { token } = await createAdminAndToken("admin5@test.com", "admin5");
    const target = await createUser("user9@test.com", "user9", "free");

    const res = await request(app)
      .post(`/api/admin/subscriptions/${target._id}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_ACTIVE_SUBSCRIPTION");
  });

  // ─── Override ───

  it("POST /admin/subscriptions/:userId/override — grants VIP", async () => {
    const { token } = await createAdminAndToken("admin6@test.com", "admin6");
    const target = await createUser("user10@test.com", "user10", "free");

    const res = await request(app)
      .post(`/api/admin/subscriptions/${target._id}/override`)
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "vip", reason: "Promotional grant" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await User.findById(target._id);
    expect(updated?.subscriptionPlan).toBe("vip");
  });

  it("POST /admin/subscriptions/:userId/override — revokes VIP and cancels Revolut", async () => {
    const { token } = await createAdminAndToken("admin7@test.com", "admin7");
    const target = await createUser("user11@test.com", "user11", "vip");
    await User.findByIdAndUpdate(target._id, { revolutSubscriptionId: "sub-override-test" });

    mockCancelRevolutSubscription.mockResolvedValue(undefined);

    const res = await request(app)
      .post(`/api/admin/subscriptions/${target._id}/override`)
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "free", reason: "Refund processed" });

    expect(res.status).toBe(200);
    expect(mockCancelRevolutSubscription).toHaveBeenCalledWith("sub-override-test");

    const updated = await User.findById(target._id);
    expect(updated?.subscriptionPlan).toBe("free");
    expect(updated?.revolutSubscriptionId).toBeNull();
  });

  // ─── VIP Features CRUD ───

  it("POST /admin/vip-features — creates feature with translations", async () => {
    const { token } = await createAdminAndToken("admin8@test.com", "admin8");

    mockTranslateMultiLang.mockResolvedValue(
      new Map([
        ["fr", { body: "Expérience sans publicités", subject: "Profitez de Watchr sans aucune publicité" }],
        ["es", { body: "Experiencia sin anuncios", subject: "Disfruta de Watchr sin ningún anuncio" }],
      ]),
    );

    const res = await request(app)
      .post("/api/admin/vip-features")
      .set("Authorization", `Bearer ${token}`)
      .send({ icon: "remove-circle-outline", label: "Ad-free experience", description: "Enjoy Watchr without any advertisements" });

    expect(res.status).toBe(201);
    expect(res.body.icon).toBe("remove-circle-outline");
    expect(res.body.translations.en).toBe("Ad-free experience");
    expect(res.body.translations.fr).toBe("Expérience sans publicités");
    expect(res.body.descriptionTranslations.en).toBe("Enjoy Watchr without any advertisements");
    expect(res.body.descriptionTranslations.fr).toBe("Profitez de Watchr sans aucune publicité");
    expect(res.body.isActive).toBe(true);
  });

  it("GET /admin/vip-features — lists all features including inactive", async () => {
    const { token } = await createAdminAndToken("admin9@test.com", "admin9");
    await VipFeature.create({
      icon: "star-outline",
      labelKey: "feature_test_1",
      translations: new Map([["en", "Test feature"]]),
      order: 0,
      isActive: true,
    });
    await VipFeature.create({
      icon: "heart-outline",
      labelKey: "feature_test_2",
      translations: new Map([["en", "Inactive feature"]]),
      order: 1,
      isActive: false,
    });

    const res = await request(app)
      .get("/api/admin/vip-features")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("PATCH /admin/vip-features/:id — updates feature", async () => {
    const { token } = await createAdminAndToken("admin10@test.com", "admin10");
    const feature = await VipFeature.create({
      icon: "star-outline",
      labelKey: "feature_update_test",
      translations: new Map([["en", "Old label"]]),
      order: 0,
      isActive: true,
    });

    const res = await request(app)
      .patch(`/api/admin/vip-features/${feature._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it("DELETE /admin/vip-features/:id — deletes feature", async () => {
    const { token } = await createAdminAndToken("admin11@test.com", "admin11");
    const feature = await VipFeature.create({
      icon: "star-outline",
      labelKey: "feature_delete_test",
      translations: new Map([["en", "Delete me"]]),
      order: 0,
      isActive: true,
    });

    const res = await request(app)
      .delete(`/api/admin/vip-features/${feature._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    const deleted = await VipFeature.findById(feature._id);
    expect(deleted).toBeNull();
  });

  it("PATCH /admin/vip-features/reorder — reorders features", async () => {
    const { token } = await createAdminAndToken("admin12@test.com", "admin12");
    const f1 = await VipFeature.create({
      icon: "star-outline",
      labelKey: "feature_reorder_1",
      translations: new Map([["en", "First"]]),
      order: 0,
      isActive: true,
    });
    const f2 = await VipFeature.create({
      icon: "heart-outline",
      labelKey: "feature_reorder_2",
      translations: new Map([["en", "Second"]]),
      order: 1,
      isActive: true,
    });

    const res = await request(app)
      .patch("/api/admin/vip-features/reorder")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: [f2._id.toString(), f1._id.toString()] });

    expect(res.status).toBe(200);
    const updated1 = await VipFeature.findById(f1._id).lean();
    const updated2 = await VipFeature.findById(f2._id).lean();
    expect(updated1?.order).toBe(1);
    expect(updated2?.order).toBe(0);
  });

  // ─── Public endpoint ───

  it("GET /internal/vip-features — returns active features only", async () => {
    await VipFeature.create({
      icon: "star-outline",
      labelKey: "feature_public_1",
      translations: new Map([["en", "Active feature"]]),
      order: 0,
      isActive: true,
    });
    await VipFeature.create({
      icon: "heart-outline",
      labelKey: "feature_public_2",
      translations: new Map([["en", "Inactive feature"]]),
      order: 1,
      isActive: false,
    });

    const res = await request(app).get("/internal/vip-features");

    expect(res.status).toBe(200);
    expect(res.body.features).toHaveLength(1);
    expect(res.body.features[0].labelKey).toBe("feature_public_1");
  });
});
