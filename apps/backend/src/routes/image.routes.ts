import { Router, Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ApiError } from "../middleware/error.middleware.js";
import { proxyImage, ImageType, getDefaultSize } from "../services/image.service.js";

const ALLOWED_TYPES = new Set<ImageType>(["poster", "still", "backdrop", "profile"]);

function isImageType(value: string): value is ImageType {
  return ALLOWED_TYPES.has(value as ImageType);
}

const router: Router = Router();

router.get(
  "/:type/:size/*",
  asyncHandler(async (req: Request, res: Response) => {
    const { type, size } = req.params;
    const imagePath = req.params[0] as string;

    if (!type || !isImageType(type)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid image type");
    }
    if (!size || size.length > 10) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid image size");
    }
    if (!imagePath) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid image path");
    }

    try {
      const { buffer, contentType } = await proxyImage(type, size, imagePath);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      res.send(buffer);
    } catch (err) {
      // Return transparent placeholder for missing images (404)
      if (err instanceof ApiError && err.status === 404) {
        const transparentPng = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64",
        );
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        res.send(transparentPng);
        return;
      }
      throw err;
    }
  }),
);

export default router;
export { getDefaultSize };
