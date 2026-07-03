import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import {
  loginUser,
  loginWithFirebase,
  refreshAccessToken,
  registerUser,
  revokeRefreshToken,
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

const router: Router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many auth attempts" } },
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

export default router;
