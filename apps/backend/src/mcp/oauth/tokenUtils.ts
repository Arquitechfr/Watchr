import crypto from "crypto";

const REDIS_AUTH_CODE_PREFIX = "mcp:authcode:";
const AUTH_CODE_TTL_SECONDS = 600; // 10 minutes

export { AUTH_CODE_TTL_SECONDS, REDIS_AUTH_CODE_PREFIX };

export function generateAuthCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function authCodeRedisKey(code: string): string {
  return `${REDIS_AUTH_CODE_PREFIX}${code}`;
}

export interface AuthCodeData {
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: string;
  resource?: string;
  expiresAt: number;
}
