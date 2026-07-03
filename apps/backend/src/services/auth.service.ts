/* eslint-disable no-console */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";
import { User } from "../models/user.model.js";
import { generateRefreshToken, hashToken } from "../lib/hashToken.js";
import { ApiError } from "../middleware/error.middleware.js";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(email: string, password: string): Promise<TokenPair> {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "EMAIL_IN_USE", "Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash });
  return await issueTokenPair(user._id.toString());
}

export async function loginUser(email: string, password: string): Promise<TokenPair> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.passwordHash) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  return await issueTokenPair(user._id.toString());
}

export async function loginWithFirebase(idToken: string): Promise<TokenPair> {
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, "INVALID_FIREBASE_TOKEN", "Invalid Firebase token");
  }

  if (!decoded.email || !decoded.email_verified) {
    throw new ApiError(401, "UNVERIFIED_EMAIL", "Google email is not verified");
  }

  const email = decoded.email.toLowerCase();
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({ email, firebaseUid: decoded.uid });
  } else if (!user.firebaseUid) {
    user.firebaseUid = decoded.uid;
    await user.save();
  }

  return await issueTokenPair(user._id.toString());
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  const tokenHash = hashToken(refreshToken);
  const user = await User.findOne({ "refreshTokens.tokenHash": tokenHash });
  if (!user) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token not found");
  }

  const stored = user.refreshTokens.find((t) => t.tokenHash === tokenHash);
  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token expired or revoked");
  }

  await User.updateOne(
    { _id: user._id },
    { $pull: { refreshTokens: { tokenHash } } },
  );

  return await issueTokenPair(user._id.toString());
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await User.updateOne(
    { "refreshTokens.tokenHash": tokenHash },
    { $pull: { refreshTokens: { tokenHash } } },
  );
}

export async function issueTokenPair(userId: string): Promise<TokenPair> {
  const accessToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await User.updateOne(
    { _id: userId },
    { $push: { refreshTokens: { tokenHash, expiresAt, createdAt: new Date() } } },
  ).catch((err) => {
    console.error("Failed to store refresh token:", err);
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId).select("email preferredLanguage createdAt").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return {
    id: user._id.toString(),
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateLanguage(userId: string, language: string) {
  const user = await User.findByIdAndUpdate(
    userId,
    { preferredLanguage: language },
    { new: true },
  ).select("preferredLanguage").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return { preferredLanguage: user.preferredLanguage };
}
