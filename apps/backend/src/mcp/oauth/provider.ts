import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthClientInformationFull, OAuthTokens, OAuthTokenRevocationRequest } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Response } from "express";
import type { AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";

import { McpOAuthClientsStore } from "./clientsStore.js";
import {
  generateMcpAccessToken,
  generateMcpRefreshToken,
  hashToken,
} from "../../models/McpOAuthToken.js";
import { McpOAuthToken } from "../../models/McpOAuthToken.js";
import {
  generateAuthCode,
  authCodeRedisKey,
  AUTH_CODE_TTL_SECONDS,
  type AuthCodeData,
} from "./tokenUtils.js";
import { setRedisValue, getRedisValue, deleteRedisKey } from "../../lib/redis.js";
import { env } from "../../config/env.js";
import { log } from "../../lib/logger.js";

const CONSENT_REDIRECT_PATH = "/mcp/auth/consent";

export class McpOAuthProvider implements OAuthServerProvider {
  public clientsStore: McpOAuthClientsStore;

  constructor() {
    this.clientsStore = new McpOAuthClientsStore();
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const consentParams = new URLSearchParams();
    consentParams.set("client_id", client.client_id);
    consentParams.set("redirect_uri", params.redirectUri);
    consentParams.set("code_challenge", params.codeChallenge);
    consentParams.set("code_challenge_method", "S256");
    if (params.state) consentParams.set("state", params.state);
    if (params.scopes && params.scopes.length > 0) {
      consentParams.set("scope", params.scopes.join(" "));
    }
    if (params.resource) consentParams.set("resource", params.resource.href);

    const consentUrl = `${CONSENT_REDIRECT_PATH}?consent_params=${encodeURIComponent(consentParams.toString())}`;
    res.redirect(302, consentUrl);
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const raw = await getRedisValue(authCodeRedisKey(authorizationCode));
    if (!raw) {
      throw new Error("Authorization code not found or expired");
    }
    const data: AuthCodeData = JSON.parse(raw);
    return data.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const raw = await getRedisValue(authCodeRedisKey(authorizationCode));
    if (!raw) {
      throw new Error("Authorization code not found or expired");
    }

    const data: AuthCodeData = JSON.parse(raw);
    await deleteRedisKey(authCodeRedisKey(authorizationCode));

    if (data.clientId !== client.client_id) {
      throw new Error("Authorization code was issued to a different client");
    }

    return this.issueTokens(data.userId, client.client_id, data.scopes, resource?.href);
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const refreshTokenHash = hashToken(refreshToken);
    const existingToken = await McpOAuthToken.findOne({ refreshTokenHash }).lean();

    if (!existingToken) {
      throw new Error("Invalid refresh token");
    }

    if (existingToken.revokedAt) {
      throw new Error("Refresh token has been revoked");
    }

    if (existingToken.clientId !== client.client_id) {
      throw new Error("Refresh token was issued to a different client");
    }

    if (
      existingToken.refreshTokenExpiresAt &&
      existingToken.refreshTokenExpiresAt < new Date()
    ) {
      throw new Error("Refresh token has expired");
    }

    const newScopes = scopes ?? existingToken.scopes;

    await McpOAuthToken.updateOne(
      { _id: existingToken._id },
      {
        $set: {
          revokedAt: new Date(),
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
        },
      },
    );

    return this.issueTokens(
      existingToken.userId.toString(),
      client.client_id,
      newScopes,
      resource?.href ?? existingToken.resource,
    );
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const tokenHash = hashToken(token);
    const tokenDoc = await McpOAuthToken.findOne({ tokenHash }).lean();

    if (!tokenDoc) {
      throw new Error("Invalid access token");
    }

    if (tokenDoc.revokedAt) {
      throw new Error("Access token has been revoked");
    }

    if (tokenDoc.expiresAt < new Date()) {
      throw new Error("Access token has expired");
    }

    return {
      token,
      clientId: tokenDoc.clientId,
      scopes: tokenDoc.scopes,
      expiresAt: Math.floor(tokenDoc.expiresAt.getTime() / 1000),
      resource: tokenDoc.resource ? new URL(tokenDoc.resource) : undefined,
      extra: {
        userId: tokenDoc.userId.toString(),
      },
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const tokenHash = hashToken(request.token);
    await McpOAuthToken.updateOne(
      { tokenHash },
      {
        $set: {
          revokedAt: new Date(),
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
        },
      },
    );
    log("McpOAuth", "token revoked", { tokenHash: tokenHash.slice(0, 10) });
  }

  async createAuthCode(data: AuthCodeData): Promise<string> {
    const code = generateAuthCode();
    await setRedisValue(
      authCodeRedisKey(code),
      JSON.stringify(data),
      AUTH_CODE_TTL_SECONDS,
    );
    return code;
  }

  private async issueTokens(
    userId: string,
    clientId: string,
    scopes: string[],
    resource?: string,
  ): Promise<OAuthTokens> {
    const accessGen = generateMcpAccessToken();
    const refreshGen = generateMcpRefreshToken();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + env.MCP_OAUTH_TOKEN_TTL_SECONDS);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + env.MCP_OAUTH_REFRESH_TOKEN_TTL_DAYS);

    const resourceUrl = resource ?? `${env.PUBLIC_URL}/mcp/oauth`;

    await McpOAuthToken.create({
      tokenHash: accessGen.hash,
      tokenPrefix: accessGen.prefix,
      userId,
      clientId,
      scopes,
      resource: resourceUrl,
      expiresAt,
      refreshTokenHash: refreshGen.hash,
      refreshTokenExpiresAt: refreshExpiresAt,
      revokedAt: null,
    });

    log("McpOAuth", "tokens issued", { userId, clientId, scopes });

    return {
      access_token: accessGen.token,
      token_type: "bearer",
      expires_in: env.MCP_OAUTH_TOKEN_TTL_SECONDS,
      scope: scopes.join(" "),
      refresh_token: refreshGen.token,
    };
  }
}

export const mcpOAuthProvider = new McpOAuthProvider();
