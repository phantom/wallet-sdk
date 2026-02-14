/**
 * Dynamic Client Registration (DCR) client implementation
 * Implements RFC 7591: OAuth 2.0 Dynamic Client Registration Protocol
 */

import axios, { type AxiosError } from "axios";
import { Logger } from "../utils/logger";
import type { DCRClientConfig } from "../session/types";

/**
 * RFC 7591 Dynamic Client Registration request payload
 */
interface DCRRegistrationRequest {
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  application_type: string;
  token_endpoint_auth_method: string;
}

/**
 * RFC 7591 Dynamic Client Registration response
 */
interface DCRRegistrationResponse {
  client_id: string;
  client_secret: string;
  client_id_issued_at: number;
  client_secret_expires_at?: number;
}

/**
 * Dynamic Client Registration (DCR) client for registering OAuth clients
 * with the Phantom authorization server.
 */
export class DCRClient {
  private readonly authBaseUrl: string;
  private readonly appId: string;
  private readonly logger: Logger;

  /**
   * Creates a new DCR client
   *
   * @param authBaseUrl - Base URL of the authorization server (default: https://auth.phantom.app or PHANTOM_AUTH_BASE_URL env var)
   * @param appId - Application identifier prefix (default: phantom-mcp)
   */
  constructor(
    authBaseUrl: string = process.env.PHANTOM_AUTH_BASE_URL ?? "https://auth.phantom.app",
    appId: string = "phantom-mcp",
  ) {
    this.authBaseUrl = authBaseUrl;
    this.appId = appId;
    this.logger = new Logger("DCR");
  }

  /**
   * Registers a new OAuth client dynamically with the authorization server
   *
   * @param redirectUri - The redirect URI where the authorization server will send callbacks
   * @returns Promise resolving to the client configuration (client_id, client_secret, etc.)
   * @throws Error if registration fails
   */
  async register(redirectUri: string): Promise<DCRClientConfig> {
    const registrationEndpoint = `${this.authBaseUrl}/oauth/register`;
    const clientName = `${this.appId}-${Date.now()}`;

    const payload: DCRRegistrationRequest = {
      client_name: clientName,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "native",
      token_endpoint_auth_method: "client_secret_basic",
    };

    this.logger.info(`Registering OAuth client: ${clientName}`);
    this.logger.debug(`Registration endpoint: ${registrationEndpoint}`);
    this.logger.debug(`Redirect URI: ${redirectUri}`);

    try {
      const response = await axios.post<DCRRegistrationResponse>(registrationEndpoint, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      this.logger.info(`Successfully registered client: ${response.data.client_id}`);

      return {
        client_id: response.data.client_id,
        client_secret: response.data.client_secret,
        client_id_issued_at: response.data.client_id_issued_at,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data ? JSON.stringify(axiosError.response.data) : axiosError.message;

      this.logger.error(`Failed to register OAuth client: ${errorMessage}`);

      throw new Error(`Dynamic Client Registration failed: ${errorMessage}`);
    }
  }
}
