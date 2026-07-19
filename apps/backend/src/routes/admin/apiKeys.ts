import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.middleware.js";
import { validateRequest } from "../../validators/validateRequest.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { ApiKey } from "../../models/ApiKey.js";
import { generateApiKey } from "../../models/ApiKey.js";
import { log } from "../../lib/logger.js";
import {
  createApiKeySchema,
  listApiKeysQuerySchema,
  apiKeyIdParamSchema,
  updateApiKeySchema,
} from "../../validators/admin/adminApiKey.validator.js";

const router: Router = Router();

router.use(requireAdmin);

router.get(
  "/",
  validateRequest(undefined, listApiKeysQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, userId } = req.query as unknown as {
      page: number;
      limit: number;
      userId?: string;
    };
    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;

    const skip = (page - 1) * limit;
    const [keys, total] = await Promise.all([
      ApiKey.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ApiKey.countDocuments(filter),
    ]);

    res.json({
      data: keys.map((k) => ({
        id: k._id.toString(),
        userId: k.userId.toString(),
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        revokedAt: k.revokedAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

router.post(
  "/",
  validateRequest(createApiKeySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, scopes } = req.body as { name: string; scopes: string[] };
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
      userId: key.userId.toString(),
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      token,
      createdAt: key.createdAt,
    });
  }),
);

router.patch(
  "/:id",
  validateRequest(updateApiKeySchema, undefined, apiKeyIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await ApiKey.findById(id).select("userId").lean();
    if (!existing) {
      throw new ApiError(404, "API_KEY_NOT_FOUND", "API key not found");
    }
    const targetUserId = existing.userId.toString();

    const updates: Record<string, unknown> = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.scopes) updates.scopes = req.body.scopes;

    const key = await ApiKey.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!key) {
      throw new ApiError(404, "API_KEY_NOT_FOUND", "API key not found");
    }
    log("AdminApiKey", "update", { adminUserId: req.userId, action: "update", targetApiKeyId: id, targetUserId });
    res.json({
      id: key._id.toString(),
      userId: key.userId.toString(),
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    });
  }),
);

router.post(
  "/:id/revoke",
  validateRequest(undefined, undefined, apiKeyIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await ApiKey.findById(id).select("userId").lean();
    if (!existing) {
      throw new ApiError(404, "API_KEY_NOT_FOUND", "API key not found");
    }
    const targetUserId = existing.userId.toString();

    const key = await ApiKey.findByIdAndUpdate(
      id,
      { $set: { revokedAt: new Date() } },
      { new: true },
    ).lean();
    if (!key) {
      throw new ApiError(404, "API_KEY_NOT_FOUND", "API key not found");
    }
    log("AdminApiKey", "revoke", { adminUserId: req.userId, action: "revoke", targetApiKeyId: id, targetUserId });
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
    const existing = await ApiKey.findById(id).select("userId").lean();
    if (!existing) {
      throw new ApiError(404, "API_KEY_NOT_FOUND", "API key not found");
    }
    const targetUserId = existing.userId.toString();

    const result = await ApiKey.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new ApiError(404, "API_KEY_NOT_FOUND", "API key not found");
    }
    log("AdminApiKey", "delete", { adminUserId: req.userId, action: "delete", targetApiKeyId: id, targetUserId });
    res.status(204).send();
  }),
);

export default router;
