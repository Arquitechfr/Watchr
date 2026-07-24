import crypto from "crypto";
import { env } from "../config/env.js";

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export function verifyRevolutWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  timestampHeader: string | undefined,
): boolean {
  if (!signatureHeader || !timestampHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() - timestamp) > TIMESTAMP_TOLERANCE_MS) return false;

  const payloadToSign = `v1.${timestampHeader}.${rawBody}`;
  const expected =
    "v1=" +
    crypto
      .createHmac("sha256", env.REVOLUT_WEBHOOK_SIGNING_SECRET)
      .update(payloadToSign, "utf8")
      .digest("hex");

  const candidates = signatureHeader.split(",").map((s) => s.trim());
  const expectedBuf = Buffer.from(expected, "utf8");

  return candidates.some((candidate) => {
    const candidateBuf = Buffer.from(candidate, "utf8");
    if (candidateBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(candidateBuf, expectedBuf);
  });
}
