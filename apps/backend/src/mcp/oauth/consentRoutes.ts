import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { mcpOAuthProvider } from "./provider.js";
import { McpOAuthClient } from "../../models/McpOAuthClient.js";
import { loginUser } from "../../services/auth.service.js";
import { verifyAccessToken } from "../../services/auth.service.js";
import {
  renderLoginPage,
  renderConsentPage,
  renderErrorPage,
} from "./consentPage.js";
import {
  buildMcpGoogleAuthUrl,
  createMcpGoogleState,
  handleMcpGoogleCallback,
} from "./googleCallback.js";
import type { AuthCodeData } from "./tokenUtils.js";
import { log, logError } from "../../lib/logger.js";

const CONSENT_SESSION_COOKIE = "mcp_consent_session";
const CONSENT_SESSION_TTL_SECONDS = 300;

interface ConsentSession {
  userId: string;
  consentParams: string;
}

function signConsentSession(payload: ConsentSession): string {
  return jwt.sign(payload, env.MCP_CONSENT_SESSION_SECRET, {
    expiresIn: CONSENT_SESSION_TTL_SECONDS,
  });
}

function verifyConsentSession(token: string): ConsentSession | null {
  try {
    return jwt.verify(token, env.MCP_CONSENT_SESSION_SECRET) as ConsentSession;
  } catch {
    return null;
  }
}

export const consentRouter = Router();

consentRouter.get("/consent", async (req: Request, res: Response) => {
  const consentParams = req.query.consent_params as string | undefined;
  if (!consentParams) {
    res.status(400).send(renderErrorPage("Missing consent parameters"));
    return;
  }

  const sessionCookie = req.cookies?.[CONSENT_SESSION_COOKIE] as string | undefined;
  const session = sessionCookie ? verifyConsentSession(sessionCookie) : null;

  if (session && session.consentParams === consentParams) {
    const params = new URLSearchParams(consentParams);
    const clientId = params.get("client_id") ?? "";
    const client = await McpOAuthClient.findOne({ clientId }).lean();

    if (!client) {
      res.status(400).send(renderErrorPage("Invalid client"));
      return;
    }

    const scopes = (params.get("scope") ?? "read").split(" ");
    res.send(
      renderConsentPage(
        client.clientName ?? client.clientId,
        client.clientUri,
        scopes,
        consentParams,
      ),
    );
    return;
  }

  res.send(renderLoginPage(consentParams));
});

consentRouter.post("/consent/login", async (req: Request, res: Response) => {
  const { email, password, consent_params } = req.body as {
    email: string;
    password: string;
    consent_params: string;
  };

  if (!email || !password || !consent_params) {
    res.status(400).send(renderErrorPage("Missing required fields"));
    return;
  }

  try {
    const tokens = await loginUser(email, password);
    const decoded = verifyAccessToken(tokens.accessToken);

    const sessionToken = signConsentSession({
      userId: decoded.sub,
      consentParams: consent_params,
    });

    res.cookie(CONSENT_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: CONSENT_SESSION_TTL_SECONDS * 1000,
    });

    const params = new URLSearchParams(consent_params);
    const clientId = params.get("client_id") ?? "";
    const client = await McpOAuthClient.findOne({ clientId }).lean();

    if (!client) {
      res.status(400).send(renderErrorPage("Invalid client"));
      return;
    }

    const scopes = (params.get("scope") ?? "read").split(" ");
    res.send(
      renderConsentPage(
        client.clientName ?? client.clientId,
        client.clientUri,
        scopes,
        consent_params,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.send(renderLoginPage(consent_params, message));
  }
});

consentRouter.get("/google/init", async (req: Request, res: Response) => {
  const consentParams = req.query.consent_params as string | undefined;
  if (!consentParams) {
    res.status(400).send(renderErrorPage("Missing consent parameters"));
    return;
  }

  const returnUrl = `/mcp/auth/consent?consent_params=${encodeURIComponent(consentParams)}`;
  const state = await createMcpGoogleState(returnUrl);
  const authUrl = buildMcpGoogleAuthUrl(state);
  res.redirect(302, authUrl);
});

consentRouter.get("/google/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    res.send(renderErrorPage(`Google authentication failed: ${error}`));
    return;
  }

  if (!code || !state) {
    res.status(400).send(renderErrorPage("Missing code or state from Google"));
    return;
  }

  try {
    const result = await handleMcpGoogleCallback(code, state);

    const consentParams = new URL(result.consentReturnUrl).searchParams.get("consent_params");
    if (!consentParams) {
      res.status(400).send(renderErrorPage("Missing consent parameters"));
      return;
    }

    const sessionToken = signConsentSession({
      userId: result.userId,
      consentParams,
    });

    res.cookie(CONSENT_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: CONSENT_SESSION_TTL_SECONDS * 1000,
    });

    res.redirect(302, result.consentReturnUrl);
  } catch (err) {
    logError("McpOAuth", "google callback failed", err);
    res.send(renderErrorPage("Google authentication failed"));
  }
});

const ALLOWED_CONSENT_SCOPES = ["read", "write"];

consentRouter.post("/consent/approve", async (req: Request, res: Response) => {
  const { consent_params, scopes: rawScopes } = req.body as {
    consent_params: string;
    scopes?: string | string[];
  };
  if (!consent_params) {
    res.status(400).send(renderErrorPage("Missing consent parameters"));
    return;
  }

  const sessionCookie = req.cookies?.[CONSENT_SESSION_COOKIE] as string | undefined;
  const session = sessionCookie ? verifyConsentSession(sessionCookie) : null;

  if (!session || session.consentParams !== consent_params) {
    res.send(renderLoginPage(consent_params, "Your session has expired. Please sign in again."));
    return;
  }

  // Scopes actually granted are the ones the user checked on the consent screen,
  // not blindly re-derived from the client's original OAuth request. This lets the
  // user grant broader access (e.g. "write") even when the client only requested "read".
  const grantedScopes = (Array.isArray(rawScopes) ? rawScopes : rawScopes ? [rawScopes] : []).filter(
    (s) => ALLOWED_CONSENT_SCOPES.includes(s),
  );

  if (grantedScopes.length === 0) {
    res.status(400).send(renderErrorPage("You must grant at least one permission to continue"));
    return;
  }

  const params = new URLSearchParams(consent_params);
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const state = params.get("state") ?? undefined;
  const resource = params.get("resource") ?? undefined;
  const scopes = grantedScopes;

  const authCodeData: AuthCodeData = {
    clientId,
    userId: session.userId,
    redirectUri,
    scopes,
    codeChallenge,
    codeChallengeMethod: "S256",
    resource: resource,
    expiresAt: Date.now() + 600_000,
  };

  const code = await mcpOAuthProvider.createAuthCode(authCodeData);

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  res.clearCookie(CONSENT_SESSION_COOKIE);
  res.redirect(302, redirectUrl.href);
  log("McpOAuth", "consent approved", { clientId, userId: session.userId });
});

consentRouter.post("/consent/deny", async (req: Request, res: Response) => {
  const { consent_params } = req.body as { consent_params: string };
  if (!consent_params) {
    res.status(400).send(renderErrorPage("Missing consent parameters"));
    return;
  }

  const params = new URLSearchParams(consent_params);
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? undefined;

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("error", "access_denied");
  redirectUrl.searchParams.set("error_description", "The user denied the authorization request");
  if (state) redirectUrl.searchParams.set("state", state);

  res.clearCookie(CONSENT_SESSION_COOKIE);
  res.redirect(302, redirectUrl.href);
  log("McpOAuth", "consent denied", { clientId: params.get("client_id") });
});
