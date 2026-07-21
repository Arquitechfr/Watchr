/* eslint-disable no-console */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";
import { User, NotificationPreferences, IUser } from "../models/user.model.js";
import { AuthCode } from "../models/authCode.model.js";
import { generateRefreshToken, hashToken } from "../lib/hashToken.js";
import { generateUniqueUsername } from "../lib/usernameGenerator.js";
import { uploadAvatar as uploadAvatarToS3, uploadBanner as uploadBannerToS3 } from "../services/upload.service.js";
import { EmailService } from "../services/email.service.js";
import { ApiError } from "../middleware/error.middleware.js";
import { posthogClient } from "../lib/posthog.js";
import { translateBioAsync } from "../services/aiBioTranslation.service.js";
import { log, logError } from "../lib/logger.js";
import { normalizeLocale } from "../i18n/index.js";
import { isEmailDomainBlocked } from "../lib/blockedEmailDomains.js";
import { autoFollowAdmin } from "../services/autoFollowAdmin.js";
import { sendWelcomeMessage } from "../services/welcomeMessage.service.js";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 15 * 60;
const EMAIL_CODE_TTL_SECONDS = 15 * 60;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const EMAIL_CODE_REQUEST_COOLDOWN_MS = 30_000;
const EMAIL_CODE_MAX_REQUESTS_PER_WINDOW = 5;
const EMAIL_CODE_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAGIC_LINK_TOKEN_TTL_SECONDS = 15 * 60;

function hashEmailCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateSixDigitCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function checkUserCanLogin(user: IUser): void {
  if (user.isBanned) {
    throw new ApiError(403, "ACCOUNT_BANNED", "This account has been banned");
  }
  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "This account is suspended");
  }
  if (user.suspendedUntil && user.suspendedUntil <= new Date()) {
    user.suspendedUntil = null;
  }
}

export async function registerUser(
  email: string,
  password: string,
  signupPlatform?: "ios" | "android" | "web",
  language?: string,
): Promise<TokenPair> {
  if (isEmailDomainBlocked(email)) {
    throw new ApiError(422, "EMAIL_DOMAIN_BLOCKED", "This email domain is not allowed");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "EMAIL_IN_USE", "Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const username = await generateUniqueUsername();
  const preferredLanguage = normalizeLocale(language);
  const user = await User.create({ email, passwordHash, username, signupPlatform, preferredLanguage });

  EmailService.sendWelcomeEmail(user.email, user.username, user.preferredLanguage).catch((err) =>
    console.error("Failed to send welcome email:", err),
  );

  import("./admin/adminFeedNotification.service.js")
    .then(({ createNotification }) =>
      createNotification({
        type: "user_registered",
        title: "New user registered",
        message: `${user.username} (${user.email}) just signed up.`,
        severity: "info",
        metadata: {
          refId: user._id.toString(),
          refType: "user",
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          provider: "email",
          signupPlatform: signupPlatform ?? "unknown",
        },
      }),
    )
    .catch(() => {});

  posthogClient.capture({
    distinctId: user._id.toString(),
    event: "user_signed_up",
    properties: { signupPlatform: signupPlatform ?? "unknown", method: "email" },
  });

  autoFollowAdmin(user._id.toString()).catch((err) =>
    console.error("Failed to auto-follow admin:", err),
  );

  sendWelcomeMessage(user._id.toString(), user.preferredLanguage).catch((err) =>
    console.error("Failed to send welcome message:", err),
  );

  return await issueTokenPair(user._id.toString(), user.preferredLanguage);
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

  user.lastLoginAt = new Date();
  checkUserCanLogin(user);
  await user.save();

  return await issueTokenPair(user._id.toString(), user.preferredLanguage);
}

export async function loginWithFirebase(
  idToken: string,
  signupPlatform?: "ios" | "android" | "web",
  language?: string,
): Promise<TokenPair> {
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

  if (isEmailDomainBlocked(email)) {
    throw new ApiError(422, "EMAIL_DOMAIN_BLOCKED", "This email domain is not allowed");
  }

  let user = await User.findOne({ email });
  let isNewUser = false;

  if (!user) {
    const username = await generateUniqueUsername();
    const preferredLanguage = normalizeLocale(language);
    user = await User.create({ email, firebaseUid: decoded.uid, username, signupPlatform, preferredLanguage });
    isNewUser = true;
  } else if (!user.firebaseUid) {
    user.firebaseUid = decoded.uid;
    await user.save();
  }

  if (isNewUser) {
    EmailService.sendWelcomeEmail(user.email, user.username, user.preferredLanguage).catch((err) =>
      console.error("Failed to send welcome email:", err),
    );

    posthogClient.capture({
      distinctId: user._id.toString(),
      event: "user_signed_up",
      properties: { signupPlatform: signupPlatform ?? "unknown", method: "google" },
    });

    autoFollowAdmin(user._id.toString()).catch((err) =>
      console.error("Failed to auto-follow admin:", err),
    );

    sendWelcomeMessage(user._id.toString(), user.preferredLanguage).catch((err) =>
      console.error("Failed to send welcome message:", err),
    );
  }

  user.lastLoginAt = new Date();
  checkUserCanLogin(user);
  await user.save();

  return await issueTokenPair(user._id.toString(), user.preferredLanguage);
}

export async function loginWithGoogleUserInfo(
  email: string,
  signupPlatform?: "ios" | "android" | "web",
  language?: string,
): Promise<TokenPair> {
  const normalizedEmail = email.toLowerCase();

  if (isEmailDomainBlocked(normalizedEmail)) {
    throw new ApiError(422, "EMAIL_DOMAIN_BLOCKED", "This email domain is not allowed");
  }

  let firebaseUid: string;
  try {
    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.getUserByEmail(normalizedEmail);
    } catch {
      firebaseUser = await firebaseAuth.createUser({
        email: normalizedEmail,
        emailVerified: true,
      });
    }
    firebaseUid = firebaseUser.uid;
  } catch {
    throw new ApiError(401, "FIREBASE_USER_LOOKUP_FAILED", "Failed to find or create Firebase user");
  }

  let user = await User.findOne({ email: normalizedEmail });
  let isNewUser = false;

  if (!user) {
    const username = await generateUniqueUsername();
    const preferredLanguage = normalizeLocale(language);
    user = await User.create({ email: normalizedEmail, firebaseUid, username, signupPlatform, preferredLanguage });
    isNewUser = true;
  } else if (!user.firebaseUid) {
    user.firebaseUid = firebaseUid;
    await user.save();
  }

  if (isNewUser) {
    EmailService.sendWelcomeEmail(user.email, user.username, user.preferredLanguage).catch((err) =>
      console.error("Failed to send welcome email:", err),
    );

    posthogClient.capture({
      distinctId: user._id.toString(),
      event: "user_signed_up",
      properties: { signupPlatform: signupPlatform ?? "unknown", method: "google" },
    });

    autoFollowAdmin(user._id.toString()).catch((err) =>
      console.error("Failed to auto-follow admin:", err),
    );

    sendWelcomeMessage(user._id.toString(), user.preferredLanguage).catch((err) =>
      console.error("Failed to send welcome message:", err),
    );
  }

  user.lastLoginAt = new Date();
  checkUserCanLogin(user);
  await user.save();

  return await issueTokenPair(user._id.toString(), user.preferredLanguage);
}

const REFRESH_TOKEN_GRACE_PERIOD_MS = 30_000;

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

  // Grace period: if the token was already rotated recently, return the replacement token
  if (stored.rotatedAt && stored.replacedByTokenHash) {
    const elapsed = Date.now() - stored.rotatedAt.getTime();
    if (elapsed < REFRESH_TOKEN_GRACE_PERIOD_MS) {
      const replacement = user.refreshTokens.find((t) => t.tokenHash === stored.replacedByTokenHash);
      if (replacement && replacement.expiresAt >= new Date()) {
        checkUserCanLogin(user);
        await user.save();
        // Issue a fresh pair and clean up the old rotated token
        await User.updateOne(
          { _id: user._id },
          { $pull: { refreshTokens: { tokenHash } } },
        );
        return await issueTokenPair(user._id.toString(), user.preferredLanguage);
      }
    }
  }

  checkUserCanLogin(user);
  await user.save();

  // Issue new token pair first
  const newTokens = await issueTokenPair(user._id.toString(), user.preferredLanguage);
  const newTokenHash = hashToken(newTokens.refreshToken);

  // Mark old token as rotated (grace period) instead of deleting immediately
  await User.updateOne(
    { _id: user._id, "refreshTokens.tokenHash": tokenHash },
    {
      $set: {
        "refreshTokens.$.rotatedAt": new Date(),
        "refreshTokens.$.replacedByTokenHash": newTokenHash,
      },
    },
  );

  // Schedule cleanup of the old rotated token after grace period
  setTimeout(async () => {
    try {
      await User.updateOne(
        { _id: user._id },
        { $pull: { refreshTokens: { tokenHash } } },
      );
    } catch {
      // Best-effort cleanup — token will expire naturally anyway
    }
  }, REFRESH_TOKEN_GRACE_PERIOD_MS + 1000);

  return newTokens;
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await User.updateOne(
    { "refreshTokens.tokenHash": tokenHash },
    { $pull: { refreshTokens: { tokenHash } } },
  );
}

export async function issueTokenPair(userId: string, preferredLanguage?: string): Promise<TokenPair> {
  const payload: Record<string, unknown> = { sub: userId };
  if (preferredLanguage) {
    payload.lang = preferredLanguage;
  }
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await User.updateOne(
    { _id: userId },
    { $push: { refreshTokens: { tokenHash, expiresAt, createdAt: new Date() } } },
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): { sub: string; lang?: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; lang?: string };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId).select("email username usernameChanged avatarUrl bannerUrl preferredLanguage themePreference hasCompletedOnboarding firebaseUid createdAt lastLoginAt role isBanned suspendedUntil banReason activityVisibility bio favoriteGenres").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    usernameChanged: user.usernameChanged,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    preferredLanguage: user.preferredLanguage,
    themePreference: user.themePreference ?? "system",
    hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
    googleLinked: !!user.firebaseUid,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    role: user.role,
    isBanned: user.isBanned,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    banReason: user.banReason,
    activityVisibility: user.activityVisibility ?? "private",
    bio: user.bio ?? "",
    favoriteGenres: user.favoriteGenres ?? [],
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

export async function updateProfile(
  userId: string,
  updates: { bio?: string; favoriteGenres?: string[] },
): Promise<{ bio: string; favoriteGenres: string[] }> {
  const setFields: Record<string, unknown> = {};
  const bioChanged = updates.bio !== undefined;
  if (bioChanged) {
    setFields.bio = updates.bio;
    setFields.bioTranslations = new Map();
    setFields.bioOriginalLanguage = null;
  }
  if (updates.favoriteGenres !== undefined) {
    setFields.favoriteGenres = updates.favoriteGenres;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: setFields },
    { new: true },
  ).select("bio favoriteGenres").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (bioChanged && updates.bio && updates.bio.trim().length >= 3) {
    translateBioAsync(userId, updates.bio).catch((err) =>
      logError("AuthService", "bio translation failed", err),
    );
  }

  return {
    bio: user.bio ?? "",
    favoriteGenres: user.favoriteGenres ?? [],
  };
}

export async function updateThemePreference(
  userId: string,
  pref: "system" | "light" | "dark",
): Promise<{ themePreference: string }> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { themePreference: pref } },
    { new: true },
  ).select("themePreference").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return { themePreference: user.themePreference ?? "system" };
}

export async function updateAvatar(userId: string, buffer: Buffer, mimeType: string): Promise<string> {
  const url = await uploadAvatarToS3(userId, buffer, mimeType);
  const user = await User.findByIdAndUpdate(
    userId,
    { avatarUrl: url },
    { new: true },
  ).select("avatarUrl").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return user.avatarUrl!;
}

export async function updateBanner(userId: string, buffer: Buffer, mimeType: string): Promise<string> {
  const url = await uploadBannerToS3(userId, buffer, mimeType);
  const user = await User.findByIdAndUpdate(
    userId,
    { bannerUrl: url },
    { new: true },
  ).select("bannerUrl").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return user.bannerUrl!;
}

export async function updateUsername(userId: string, newUsername: string): Promise<{ username: string; usernameChanged: boolean }> {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  if (user.usernameChanged) {
    throw new ApiError(403, "USERNAME_ALREADY_CHANGED", "Username can only be changed once");
  }
  const existing = await User.findOne({
    username: { $regex: `^${newUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    _id: { $ne: userId },
  }).lean();
  if (existing) {
    throw new ApiError(409, "USERNAME_TAKEN", "This username is already taken");
  }
  user.username = newUsername;
  user.usernameChanged = true;
  await user.save();
  return { username: user.username, usernameChanged: true };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return;
  }

  const resetToken = jwt.sign(
    { sub: user._id.toString(), type: "password_reset" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: PASSWORD_RESET_TOKEN_TTL_SECONDS },
  );

  const resetUrl = `watchr://reset-password?token=${resetToken}`;

  await EmailService.sendResetPasswordEmail(user.email, resetUrl, user.preferredLanguage);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  let payload: { sub: string; type: string };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; type: string };
  } catch {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired reset token");
  }

  if (payload.type !== "password_reset") {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const result = await User.updateOne(
    { _id: payload.sub },
    { $set: { passwordHash }, $unset: { refreshTokens: [] } },
  );
  if (result.matchedCount === 0) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  log("Auth", "password reset — sessions revoked", { userId: payload.sub });
}

export async function requestEmailCode(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return;
  }

  checkUserCanLogin(user);

  const recentCodes = await AuthCode.find({
    email: normalizedEmail,
    createdAt: { $gte: new Date(Date.now() - EMAIL_CODE_REQUEST_WINDOW_MS) },
  }).sort({ createdAt: -1 });

  if (recentCodes.length >= EMAIL_CODE_MAX_REQUESTS_PER_WINDOW) {
    throw new ApiError(429, "TOO_MANY_CODE_REQUESTS", "Too many code requests. Try again later.");
  }

  if (recentCodes.length > 0) {
    const lastCode = recentCodes[0];
    const elapsed = Date.now() - lastCode.createdAt.getTime();
    if (elapsed < EMAIL_CODE_REQUEST_COOLDOWN_MS) {
      throw new ApiError(429, "CODE_COOLDOWN", "Please wait before requesting another code.");
    }
  }

  const code = generateSixDigitCode();
  const codeHash = hashEmailCode(code);

  const magicLinkToken = jwt.sign(
    { sub: user._id.toString(), type: "email_magic" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: MAGIC_LINK_TOKEN_TTL_SECONDS },
  );

  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_SECONDS * 1000);

  await AuthCode.create({
    email: normalizedEmail,
    codeHash,
    magicLinkToken,
    expiresAt,
    attempts: 0,
  });

  const magicLinkUrl = `https://app.watchr.me/auth/magic-link?token=${magicLinkToken}`;

  EmailService.sendEmailCodeEmail(user.email, code, magicLinkUrl, user.preferredLanguage).catch((err) =>
    console.error("Failed to send email code:", err),
  );
}

export async function verifyEmailCode(email: string, code: string): Promise<TokenPair> {
  const normalizedEmail = email.toLowerCase().trim();

  const authCode = await AuthCode.findOne({
    email: normalizedEmail,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!authCode) {
    throw new ApiError(401, "EMAIL_CODE_EXPIRED", "Code expired or not found. Please request a new one.");
  }

  if (authCode.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    await AuthCode.deleteOne({ _id: authCode._id });
    throw new ApiError(401, "TOO_MANY_CODE_ATTEMPTS", "Too many attempts. Please request a new code.");
  }

  const inputHash = hashEmailCode(code);
  if (inputHash !== authCode.codeHash) {
    authCode.attempts += 1;
    await authCode.save();
    throw new ApiError(401, "INVALID_EMAIL_CODE", "Invalid code.");
  }

  await AuthCode.deleteOne({ _id: authCode._id });

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  user.lastLoginAt = new Date();
  checkUserCanLogin(user);
  await user.save();

  return await issueTokenPair(user._id.toString(), user.preferredLanguage);
}

export async function verifyMagicLink(token: string): Promise<TokenPair> {
  let payload: { sub: string; type: string };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; type: string };
  } catch {
    throw new ApiError(401, "INVALID_MAGIC_LINK", "Invalid or expired magic link");
  }

  if (payload.type !== "email_magic") {
    throw new ApiError(401, "INVALID_MAGIC_LINK", "Invalid magic link token");
  }

  const authCode = await AuthCode.findOne({ magicLinkToken: token });
  if (!authCode || authCode.expiresAt < new Date()) {
    throw new ApiError(401, "INVALID_MAGIC_LINK", "Invalid or expired magic link");
  }

  await AuthCode.deleteOne({ _id: authCode._id });

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  user.lastLoginAt = new Date();
  checkUserCanLogin(user);
  await user.save();

  return await issueTokenPair(user._id.toString(), user.preferredLanguage);
}

export async function registerPushToken(userId: string, token: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: { expoPushToken: token } });

  posthogClient.capture({
    distinctId: userId,
    event: "push_token_registered",
  });
}

export async function unregisterPushToken(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $unset: { expoPushToken: "" } });
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  newReleases: true,
  commentReplies: true,
  commentReactions: true,
  commentLikes: true,
  directMessages: true,
  notificationOffsetMinutes: 0,
};

export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<{
    pushEnabled: boolean;
    emailEnabled: boolean;
    newReleases: boolean;
    commentReplies: boolean;
    commentReactions: boolean;
    commentLikes: boolean;
    directMessages: boolean;
    notificationOffsetMinutes: number;
  }>,
): Promise<{ notificationPreferences: NotificationPreferences }> {
  const setFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(prefs)) {
    setFields[`notificationPreferences.${key}`] = value;
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: setFields },
    { new: true },
  ).select("notificationPreferences").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return { notificationPreferences: user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES };
}

export async function getNotificationPreferences(userId: string): Promise<{ notificationPreferences: NotificationPreferences }> {
  const user = await User.findById(userId).select("notificationPreferences").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return { notificationPreferences: user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES };
}

export async function completeOnboarding(
  userId: string,
  source?: string,
): Promise<{ hasCompletedOnboarding: boolean }> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { hasCompletedOnboarding: true } },
    { new: true },
  ).select("hasCompletedOnboarding").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  posthogClient.capture({
    distinctId: userId,
    event: "onboarding_completed",
    properties: source ? { source } : {},
  });

  return { hasCompletedOnboarding: user.hasCompletedOnboarding ?? true };
}

export async function linkGoogleAccount(userId: string, idToken: string): Promise<{ googleLinked: boolean }> {
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, "INVALID_FIREBASE_TOKEN", "Invalid Firebase token");
  }

  if (!decoded.email || !decoded.email_verified) {
    throw new ApiError(401, "UNVERIFIED_EMAIL", "Google email is not verified");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (decoded.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ApiError(400, "GOOGLE_EMAIL_MISMATCH", "Google email does not match account email");
  }

  const existingByUid = await User.findOne({ firebaseUid: decoded.uid, _id: { $ne: user._id } });
  if (existingByUid) {
    throw new ApiError(409, "GOOGLE_ALREADY_LINKED", "This Google account is already linked to another user");
  }

  user.firebaseUid = decoded.uid;
  await user.save();

  return { googleLinked: true };
}

export async function unlinkGoogleAccount(userId: string): Promise<{ googleLinked: boolean }> {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (!user.passwordHash) {
    throw new ApiError(400, "CANNOT_UNLINK_NO_PASSWORD", "Cannot unlink Google without a password set");
  }

  user.firebaseUid = undefined;
  await user.save();

  return { googleLinked: false };
}
