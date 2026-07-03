import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import {
  loginUser,
  loginWithFirebase,
  refreshAccessToken,
  registerUser,
  revokeRefreshToken,
  getMe,
  updateLanguage,
} from "../services/auth.service.js";
import {
  firebaseLoginSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from "../validators/auth.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { translate } from "../i18n/index.js";

const updateLanguageSchema = z.object({
  language: z.string().min(2).max(5),
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

router.use("/me", requireAuth);

router.get(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    const me = await getMe(req.userId!);
    res.json(me);
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

export default router;
