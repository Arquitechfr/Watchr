import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { uploadCommentImage } from "../services/upload.service.js";

const router: Router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(requireAuth);

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  errorCode: "TOO_MANY_UPLOAD_REQUESTS",
});

router.post(
  "/comment-image",
  uploadRateLimiter,
  imageUpload.single("image"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: { code: "NO_FILE", message: "No file uploaded" } });
      return;
    }
    const url = await uploadCommentImage(req.userId!, req.file.buffer, req.file.mimetype);
    res.json({ url });
  }),
);

export default router;
