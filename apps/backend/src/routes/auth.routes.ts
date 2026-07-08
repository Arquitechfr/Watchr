import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import {
  loginUser,
  loginWithFirebase,
  refreshAccessToken,
  registerUser,
  revokeRefreshToken,
  getMe,
  updateLanguage,
  updateAvatar,
  updateUsername,
  requestPasswordReset,
  resetPassword,
  registerPushToken,
  unregisterPushToken,
  updateNotificationPreferences,
  getNotificationPreferences,
  updateThemePreference,
  completeOnboarding,
} from "../services/auth.service.js";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  handleGoogleCallback,
} from "../services/googleOAuth.service.js";
import {
  firebaseLoginSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  pushTokenSchema,
  notificationPreferencesSchema,
  themePreferenceSchema,
  onboardingCompleteSchema,
} from "../validators/auth.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { translate } from "../i18n/index.js";
import { getUserStats } from "../services/stats.service.js";

const updateLanguageSchema = z.object({
  language: z.string().min(2).max(5),
});

const updateUsernameSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router: Router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = req.language;
    res.status(429).json({
      error: { code: "TOO_MANY_AUTH_ATTEMPTS", message: translate("TOO_MANY_AUTH_ATTEMPTS", lang) ?? "Too many auth attempts" },
    });
  },
});

router.post(
  "/register",
  authRateLimiter,
  validateRequest(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const tokens = await registerUser(email, password);
    res.status(201).json(tokens);
  }),
);

router.post(
  "/login",
  authRateLimiter,
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const tokens = await loginUser(email, password);
    res.json(tokens);
  }),
);

router.post(
  "/firebase",
  authRateLimiter,
  validateRequest(firebaseLoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { idToken } = req.body;
    const tokens = await loginWithFirebase(idToken);
    res.json(tokens);
  }),
);

const googleInitSchema = z.object({
  appRedirect: z.string().min(1),
});

router.post(
  "/google/init",
  authRateLimiter,
  validateRequest(googleInitSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { appRedirect } = req.body as { appRedirect: string };
    const state = await createOAuthState(appRedirect);
    const authUrl = buildGoogleAuthUrl(state);
    res.json({ authUrl });
  }),
);

router.get(
  "/google/callback",
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (error) {
      res.status(400).json({
        error: { code: "GOOGLE_OAUTH_ERROR", message: String(error) },
      });
      return;
    }

    if (!code || !state) {
      res.status(400).json({
        error: { code: "MISSING_PARAMS", message: "Missing code or state" },
      });
      return;
    }

    const result = await handleGoogleCallback(code, state);

    const redirectUrl = new URL(result.appRedirect);
    redirectUrl.searchParams.set("accessToken", result.accessToken);
    redirectUrl.searchParams.set("refreshToken", result.refreshToken);

    res.redirect(302, redirectUrl.toString());
  }),
);

router.post(
  "/refresh",
  authRateLimiter,
  validateRequest(refreshSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await refreshAccessToken(refreshToken);
    res.json(tokens);
  }),
);

router.post(
  "/logout",
  authRateLimiter,
  validateRequest(logoutSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await revokeRefreshToken(refreshToken);
    res.json({ success: true });
  }),
);

router.post(
  "/forgot-password",
  authRateLimiter,
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    await requestPasswordReset(email);
    res.json({ success: true });
  }),
);

router.post(
  "/reset-password",
  authRateLimiter,
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    await resetPassword(token, newPassword);
    res.json({ success: true });
  }),
);

router.use("/me", requireAuth);

router.get(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    const me = await getMe(req.userId!);
    res.json(me);
  }),
);

router.get(
  "/me/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await getUserStats(req.userId!, req.language);
    res.json(stats);
  }),
);

router.patch(
  "/me/language",
  validateRequest(updateLanguageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { language } = req.body as { language: string };
    const result = await updateLanguage(req.userId!, language);
    res.json(result);
  }),
);

router.patch(
  "/me/username",
  validateRequest(updateUsernameSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body as { username: string };
    const result = await updateUsername(req.userId!, username);
    res.json(result);
  }),
);

router.post(
  "/me/avatar",
  avatarUpload.single("avatar"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: { code: "NO_FILE", message: "No file uploaded" } });
      return;
    }
    const url = await updateAvatar(req.userId!, req.file.buffer, req.file.mimetype);
    res.json({ avatarUrl: url });
  }),
);

router.post(
  "/me/push-token",
  validateRequest(pushTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    await registerPushToken(req.userId!, token);
    res.json({ success: true });
  }),
);

router.delete(
  "/me/push-token",
  asyncHandler(async (req: Request, res: Response) => {
    await unregisterPushToken(req.userId!);
    res.json({ success: true });
  }),
);

router.patch(
  "/me/theme-preference",
  validateRequest(themePreferenceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { themePreference } = req.body as { themePreference: "system" | "light" | "dark" };
    const result = await updateThemePreference(req.userId!, themePreference);
    res.json(result);
  }),
);

router.get(
  "/me/notification-preferences",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getNotificationPreferences(req.userId!);
    res.json(result);
  }),
);

router.patch(
  "/me/notification-preferences",
  validateRequest(notificationPreferencesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await updateNotificationPreferences(req.userId!, req.body);
    res.json(result);
  }),
);

router.patch(
  "/me/onboarding",
  validateRequest(onboardingCompleteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await completeOnboarding(req.userId!);
    res.json(result);
  }),
);

export default router;
