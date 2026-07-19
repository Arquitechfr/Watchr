import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";
import { User } from "../src/models/user.model.js";
import { Follow } from "../src/models/follow.model.js";
import { MobileConfig } from "../src/models/MobileConfig.js";
import type { DecodedIdToken } from "firebase-admin/auth";

const mockVerifyIdToken = vi.fn();

vi.mock("../src/config/firebaseAdmin.js", () => ({
  firebaseAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
}));

vi.mock("express-rate-limit", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const app = createApp();

function makeDecodedToken(overrides: Partial<DecodedIdToken> = {}): DecodedIdToken {
  return {
    uid: "google-uid-123",
    email: "google@test-watchr.dev",
    email_verified: true,
    auth_time: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    sub: "google-uid-123",
    aud: "watchr",
    iss: "https://securetoken.google.com/watchr",
    firebase: {
      identities: { "google.com": ["123"] },
      sign_in_provider: "google.com",
    },
    ...overrides,
  } as DecodedIdToken;
}

describe("Auth", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  it("should register a new user and return tokens", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@test-watchr.dev",
      password: "password123",
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("should persist the preferred language sent at registration", async () => {
    const register = await request(app).post("/api/auth/register").send({
      email: "lang@test-watchr.dev",
      password: "password123",
      language: "fr",
    });
    expect(register.status).toBe(201);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${register.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.preferredLanguage).toBe("fr");
  });

  it("should default to english when no language is sent at registration", async () => {
    const register = await request(app).post("/api/auth/register").send({
      email: "nolang@test-watchr.dev",
      password: "password123",
    });
    expect(register.status).toBe(201);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${register.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.preferredLanguage).toBe("en");
  });

  it("should reject duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      email: "dup@test-watchr.dev",
      password: "password123",
    });
    const res = await request(app).post("/api/auth/register").send({
      email: "dup@test-watchr.dev",
      password: "password123",
    });
    expect(res.status).toBe(409);
  });

  it("should login with valid credentials", async () => {
    await request(app).post("/api/auth/register").send({
      email: "login@test-watchr.dev",
      password: "password123",
    });
    const res = await request(app).post("/api/auth/login").send({
      email: "login@test-watchr.dev",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("should reject invalid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "none@test-watchr.dev",
      password: "password123",
    });
    expect(res.status).toBe(401);
  });

  it("should rotate refresh token", async () => {
    const register = await request(app).post("/api/auth/register").send({
      email: "refresh@test-watchr.dev",
      password: "password123",
    });
    const oldRefresh = register.body.refreshToken;

    const res = await request(app).post("/api/auth/refresh").send({
      refreshToken: oldRefresh,
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(oldRefresh);
  });

  it("should allow refresh with old token within grace period (concurrent refresh)", async () => {
    const register = await request(app).post("/api/auth/register").send({
      email: "grace@test-watchr.dev",
      password: "password123",
    });
    const oldRefresh = register.body.refreshToken;

    // First refresh — rotates the token
    const res1 = await request(app).post("/api/auth/refresh").send({
      refreshToken: oldRefresh,
    });
    expect(res1.status).toBe(200);
    expect(res1.body.refreshToken).not.toBe(oldRefresh);

    // Second refresh with the SAME old token — should still succeed within grace period
    const res2 = await request(app).post("/api/auth/refresh").send({
      refreshToken: oldRefresh,
    });
    expect(res2.status).toBe(200);
    expect(res2.body.accessToken).toBeDefined();
    expect(res2.body.refreshToken).toBeDefined();
  });

  it("should reject refresh with old token after logout (even within grace period)", async () => {
    const register = await request(app).post("/api/auth/register").send({
      email: "grace-logout@test-watchr.dev",
      password: "password123",
    });
    const oldRefresh = register.body.refreshToken;

    // First refresh — rotates the token
    await request(app).post("/api/auth/refresh").send({
      refreshToken: oldRefresh,
    });

    // Logout with the old token — should remove it
    await request(app).post("/api/auth/logout").send({
      refreshToken: oldRefresh,
    });

    // Try to refresh with the old token — should fail (logout removes it)
    const res = await request(app).post("/api/auth/refresh").send({
      refreshToken: oldRefresh,
    });
    expect(res.status).toBe(401);
  });

  it("should revoke refresh token on logout", async () => {
    const register = await request(app).post("/api/auth/register").send({
      email: "logout@test-watchr.dev",
      password: "password123",
    });
    const refreshToken = register.body.refreshToken;

    const logout = await request(app).post("/api/auth/logout").send({
      refreshToken,
    });
    expect(logout.status).toBe(200);

    const res = await request(app).post("/api/auth/refresh").send({
      refreshToken,
    });
    expect(res.status).toBe(401);
  });

  it("should login with Firebase and create a new user", async () => {
    mockVerifyIdToken.mockResolvedValueOnce(makeDecodedToken());

    const res = await request(app).post("/api/auth/firebase").send({
      idToken: "valid-id-token",
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("should persist the preferred language sent at Firebase signup", async () => {
    mockVerifyIdToken.mockResolvedValueOnce(makeDecodedToken({ email: "google-lang@test-watchr.dev" }));

    const res = await request(app).post("/api/auth/firebase").send({
      idToken: "valid-id-token",
      language: "fr",
    });
    expect(res.status).toBe(200);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.preferredLanguage).toBe("fr");
  });

  it("should link Firebase login to existing email account", async () => {
    await request(app).post("/api/auth/register").send({
      email: "google@test-watchr.dev",
      password: "password123",
    });
    mockVerifyIdToken.mockResolvedValueOnce(makeDecodedToken());

    const res = await request(app).post("/api/auth/firebase").send({
      idToken: "valid-id-token",
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("should reject Firebase login with unverified email", async () => {
    mockVerifyIdToken.mockResolvedValueOnce(makeDecodedToken({ email_verified: false }));

    const res = await request(app).post("/api/auth/firebase").send({
      idToken: "valid-id-token",
    });
    expect(res.status).toBe(401);
  });

  it("should reject invalid Firebase token", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

    const res = await request(app).post("/api/auth/firebase").send({
      idToken: "invalid-id-token",
    });
    expect(res.status).toBe(401);
  });

  it("should reject registration with blocked email domain", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "password123",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("EMAIL_DOMAIN_BLOCKED");
  });

  it("should reject Firebase login with blocked email domain", async () => {
    mockVerifyIdToken.mockResolvedValueOnce(makeDecodedToken({ email: "test@mailinator.com" }));

    const res = await request(app).post("/api/auth/firebase").send({
      idToken: "valid-id-token",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("EMAIL_DOMAIN_BLOCKED");
  });

  it("should auto-follow admin bidirectionally on register", async () => {
    const admin = await User.create({
      email: "admin@watchr.me",
      username: "admin",
      passwordHash: "$2a$12$dummy",
      role: "admin",
    });

    await MobileConfig.create({
      key: "default_admin_user_id",
      value: admin._id.toString(),
      type: "string",
      updatedBy: "test",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@test-watchr.dev",
      password: "password123",
    });
    expect(res.status).toBe(201);

    const newUser = await User.findOne({ email: "newuser@test-watchr.dev" });
    expect(newUser).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const userFollowsAdmin = await Follow.findOne({
      followerId: newUser!._id,
      followingId: admin._id,
    });
    expect(userFollowsAdmin).toBeTruthy();

    const adminFollowsUser = await Follow.findOne({
      followerId: admin._id,
      followingId: newUser!._id,
    });
    expect(adminFollowsUser).toBeTruthy();
  });
});
