import { Router, Request, Response } from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, buildPublicUrl } from "../lib/s3.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router: Router = Router();

const MAX_APK_SIZE = 500 * 1024 * 1024;

const apkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_APK_SIZE },
});

const ALLOWED_EXTENSIONS = new Set([".apk", ".aab"]);

function validateCiToken(req: Request, res: Response): boolean {
  if (!env.CI_UPLOAD_TOKEN) {
    res.status(503).json({
      error: { code: "CI_UPLOAD_DISABLED", message: "CI upload is not configured" },
    });
    return false;
  }
  const token = req.headers["x-ci-token"];
  if (token !== env.CI_UPLOAD_TOKEN) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid CI token" },
    });
    return false;
  }
  return true;
}

router.post(
  "/upload-apk",
  apkUpload.single("apk"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateCiToken(req, res)) return;

    if (!req.file) {
      res.status(400).json({ error: { code: "NO_FILE", message: "No file uploaded" } });
      return;
    }

    const profile = (req.body.profile as string) || "unknown";
    const runNumber = (req.body.runNumber as string) || "0";
    const filename = req.file.originalname;
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      res.status(400).json({
        error: { code: "INVALID_FILE_TYPE", message: "Only .apk and .aab files are allowed" },
      });
      return;
    }

    const key = `builds/${profile}/${runNumber}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: env.MINIO_S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3Client.send(command);
    const url = buildPublicUrl(key);

    res.status(201).json({ url, key });
  }),
);

export default router;
