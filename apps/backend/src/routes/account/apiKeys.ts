import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/requireAuth.middleware.js";
import { validateRequest } from "../../validators/validateRequest.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { ApiKey, generateApiKey } from "../../models/ApiKey.js";
import { createApiKeySchema, apiKeyIdParamSchema } from "../../validators/apiKey.validator.js";

const MAX_ACTIVE_KEYS = 10;

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const keys = await ApiKey.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("-keyHash")
      .lean();

    res.json({
      data: keys.map((k) => ({
        id: k._id.toString(),
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        revokedAt: k.revokedAt,
      })),
    });
  }),
);

router.post(
  "/",
  validateRequest(createApiKeySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, scopes } = req.body as { name: string; scopes: ("read" | "write")[] };

    const activeCount = await ApiKey.countDocuments({
      userId: req.userId,
      revokedAt: null,
    });
    if (activeCount >= MAX_ACTIVE_KEYS) {
      throw new ApiError(400, "API_KEY_LIMIT_REACHED", `Maximum of ${MAX_ACTIVE_KEYS} active API keys allowed`);
    }

    const { token, hash, prefix } = generateApiKey();

    const key = await ApiKey.create({
      userId: req.userId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
    });

    res.status(201).json({
      id: key._id.toString(),
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      token,
      createdAt: key.createdAt,
    });
  }),
);

router.post(
  "/:id/revoke",
  validateRequest(undefined, undefined, apiKeyIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const key = await ApiKey.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { $set: { revokedAt: new Date() } },
      { new: true },
    ).lean();

    if (!key) {
      throw new ApiError(404, "API_KEY_NOT_FOUND", "API key not found");
    }

    res.json({
      id: key._id.toString(),
      revokedAt: key.revokedAt,
    });
  }),
);

router.delete(
  "/:id",
  validateRequest(undefined, undefined, apiKeyIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await ApiKey.deleteOne({ _id: id, userId: req.userId });
    if (result.deletedCount === 0) {
      throw new ApiError(404, "API_KEY_NOT_FOUND", "API key not found");
    }

    res.status(204).send();
  }),
);

export default router;
