import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { McpOAuthClient, hashClientSecret } from "../../models/McpOAuthClient.js";
import { log, logError } from "../../lib/logger.js";

function toFullClientInfo(doc: any): OAuthClientInformationFull {
  return {
    redirect_uris: doc.redirectUris,
    token_endpoint_auth_method: doc.tokenEndpointAuthMethod,
    grant_types: doc.grantTypes,
    response_types: doc.responseTypes,
    client_name: doc.clientName,
    client_uri: doc.clientUri,
    logo_uri: doc.logoUri,
    scope: doc.scope,
    contacts: doc.contacts,
    tos_uri: doc.tosUri,
    policy_uri: doc.policyUri,
    software_id: doc.softwareId,
    software_version: doc.softwareVersion,
    client_id: doc.clientId,
    client_secret: doc.clientSecretHash ?? undefined,
    client_id_issued_at: doc.createdAt ? Math.floor(doc.createdAt.getTime() / 1000) : undefined,
    client_secret_expires_at: doc.clientSecretExpiresAt
      ? Math.floor(doc.clientSecretExpiresAt.getTime() / 1000)
      : 0,
  };
}

export class McpOAuthClientsStore implements OAuthRegisteredClientsStore {
  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    try {
      const doc = await McpOAuthClient.findOne({ clientId }).lean();
      if (!doc) return undefined;

      if (doc.clientSecretExpiresAt && doc.clientSecretExpiresAt < new Date()) {
        logError("McpOAuth", "client secret expired", null, { clientId });
      }

      return toFullClientInfo(doc);
    } catch (err) {
      logError("McpOAuth", "getClient failed", err);
      return undefined;
    }
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
  ): Promise<OAuthClientInformationFull> {
    const clientId = (client as OAuthClientInformationFull).client_id;
    const clientSecret = (client as OAuthClientInformationFull).client_secret;
    const clientSecretExpiresAt = (client as OAuthClientInformationFull).client_secret_expires_at;

    const secretHash = clientSecret ? hashClientSecret(clientSecret) : null;
    const secretExpiryDate =
      clientSecretExpiresAt && clientSecretExpiresAt > 0
        ? new Date(clientSecretExpiresAt * 1000)
        : null;

    const doc = await McpOAuthClient.create({
      clientId,
      clientSecretHash: secretHash,
      clientSecretExpiresAt: secretExpiryDate,
      redirectUris: client.redirect_uris,
      clientName: client.client_name,
      clientUri: client.client_uri,
      logoUri: client.logo_uri,
      scope: client.scope,
      contacts: client.contacts,
      tosUri: client.tos_uri,
      policyUri: client.policy_uri,
      tokenEndpointAuthMethod: client.token_endpoint_auth_method ?? "none",
      grantTypes: client.grant_types ?? ["authorization_code", "refresh_token"],
      responseTypes: client.response_types ?? ["code"],
      softwareId: client.software_id,
      softwareVersion: client.software_version,
    });

    log("McpOAuth", "client registered", { clientId: doc.clientId });

    return toFullClientInfo(doc);
  }
}
