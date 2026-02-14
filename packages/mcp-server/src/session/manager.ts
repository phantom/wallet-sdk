/**
 * SessionManager orchestrates the complete session lifecycle:
 * - Loads existing sessions from storage
 * - Handles authentication when needed
 * - Creates and manages PhantomClient instances
 * - Provides session data access
 */

import { PhantomClient } from "@phantom/client";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import { SessionStorage } from "./storage.js";
import { OAuthFlow } from "../auth/oauth.js";
import type { SessionData } from "./types.js";
import { Logger } from "../utils/logger.js";

/**
 * Configuration options for SessionManager
 */
export interface SessionManagerOptions {
  /** Base URL for OAuth authorization server (default: https://auth.phantom.app or PHANTOM_AUTH_BASE_URL env var) */
  authBaseUrl?: string;
  /** Base URL for Phantom Connect (default: https://connect.phantom.app or PHANTOM_CONNECT_BASE_URL env var) */
  connectBaseUrl?: string;
  /** Base URL for Phantom API (default: https://api.phantom.app or PHANTOM_API_BASE_URL env var) */
  apiBaseUrl?: string;
  /** Port for local OAuth callback server (default: 8080 or PHANTOM_CALLBACK_PORT env var) */
  callbackPort?: number;
  /** Path for OAuth callback (default: /callback or PHANTOM_CALLBACK_PATH env var) */
  callbackPath?: string;
  /** Application identifier prefix (default: phantom-mcp) */
  appId?: string;
  /** Directory to store session data (default: ~/.phantom-mcp) */
  sessionDir?: string;
}

/**
 * SessionManager handles session lifecycle, auto-authentication, and PhantomClient creation
 *
 * Usage:
 * ```typescript
 * const manager = new SessionManager();
 * await manager.initialize(); // Loads session or authenticates
 * const client = manager.getClient();
 * const session = manager.getSession();
 * ```
 */
export class SessionManager {
  private readonly authBaseUrl: string;
  private readonly connectBaseUrl?: string;
  private readonly apiBaseUrl: string;
  private readonly callbackPort: number;
  private readonly callbackPath: string;
  private readonly appId: string;
  private readonly storage: SessionStorage;
  private readonly logger: Logger;

  private session: SessionData | null = null;
  private client: PhantomClient | null = null;

  /**
   * Creates a new SessionManager
   *
   * @param options - Configuration options
   */
  constructor(options: SessionManagerOptions = {}) {
    this.logger = new Logger("SessionManager");
    this.authBaseUrl = options.authBaseUrl ?? process.env.PHANTOM_AUTH_BASE_URL ?? "https://auth.phantom.app";
    this.connectBaseUrl = options.connectBaseUrl;
    this.apiBaseUrl = options.apiBaseUrl ?? process.env.PHANTOM_API_BASE_URL ?? "https://api.phantom.app/v1/wallets";

    const defaultPort = 8080;
    const parseEnvPort = (value: string): number | null => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
        return null;
      }
      return parsed;
    };

    if (options.callbackPort !== undefined) {
      if (!Number.isInteger(options.callbackPort) || options.callbackPort <= 0 || options.callbackPort > 65535) {
        throw new Error(
          `Invalid callbackPort: "${options.callbackPort}". Must be a valid port number between 1 and 65535.`,
        );
      }
      this.callbackPort = options.callbackPort;
    } else {
      const envPort = process.env.PHANTOM_CALLBACK_PORT?.trim();
      const parsedEnvPort = envPort ? parseEnvPort(envPort) : null;
      if (envPort && parsedEnvPort === null) {
        this.logger.warn(`Invalid PHANTOM_CALLBACK_PORT "${envPort}". Falling back to ${defaultPort}.`);
        this.callbackPort = defaultPort;
      } else {
        this.callbackPort = parsedEnvPort ?? defaultPort;
      }
    }

    this.callbackPath = options.callbackPath ?? process.env.PHANTOM_CALLBACK_PATH ?? "/callback";
    this.appId = options.appId ?? "phantom-mcp";
    this.storage = new SessionStorage(options.sessionDir);
  }

  /**
   * Initializes the session manager
   * Loads existing session or authenticates if needed
   *
   * @throws Error if authentication fails
   */
  async initialize(): Promise<void> {
    this.logger.info("Initializing session manager");

    // Step 1: Try to load existing session
    const existingSession = this.storage.load();

    // Step 2: Check if session is valid
    if (existingSession && !this.storage.isExpired(existingSession)) {
      this.logger.info("Loaded valid session from storage");
      this.session = existingSession;
      this.createClient();
      return;
    }

    // Step 3: Session is missing or expired - authenticate
    if (existingSession) {
      this.logger.info("Session expired, re-authenticating");
    } else {
      this.logger.info("No session found, authenticating");
    }

    await this.authenticate();
  }

  /**
   * Returns the initialized PhantomClient
   *
   * @returns PhantomClient instance
   * @throws Error if not initialized
   */
  getClient(): PhantomClient {
    if (!this.client) {
      throw new Error("SessionManager not initialized. Call initialize() first.");
    }
    return this.client;
  }

  /**
   * Returns the current session data
   *
   * @returns Current session data
   * @throws Error if not initialized
   */
  getSession(): SessionData {
    if (!this.session) {
      throw new Error("SessionManager not initialized. Call initialize() first.");
    }
    return this.session;
  }

  /**
   * Resets the session by clearing stored data and re-authenticating
   *
   * @throws Error if authentication fails
   */
  async resetSession(): Promise<void> {
    this.logger.info("Resetting session");

    // Clear stored session
    this.storage.delete();
    this.session = null;
    this.client = null;

    // Re-authenticate
    await this.authenticate();
  }

  /**
   * Executes the SSO flow and creates a new session
   * Steps:
   * 1. Execute SSO flow to get wallet/org IDs and stamper keypair
   * 2. Create SessionData with SSO result and stamper keys
   * 3. Save to storage
   * 4. Create PhantomClient
   *
   * Note: Stamper keypair is generated during SSO flow and public key is sent to auth server
   *
   * @throws Error if SSO flow fails
   */
  private async authenticate(): Promise<void> {
    this.logger.info("Starting authentication");

    // Step 1: Execute SSO flow
    const oauthFlow = new OAuthFlow({
      authBaseUrl: this.authBaseUrl,
      connectBaseUrl: this.connectBaseUrl,
      callbackPort: this.callbackPort,
      callbackPath: this.callbackPath,
      appId: this.appId,
    });

    const oauthResult = await oauthFlow.authenticate();
    this.logger.info("SSO flow completed successfully");

    // Step 2: Create SessionData
    const now = Math.floor(Date.now() / 1000);
    this.session = {
      walletId: oauthResult.walletId,
      organizationId: oauthResult.organizationId,
      authUserId: oauthResult.authUserId,
      stamperKeys: oauthResult.stamperKeys,
      createdAt: now,
      updatedAt: now,
    };

    // Step 3: Save to storage
    this.storage.save(this.session);
    this.logger.info("Session saved to storage");

    // Step 4: Create PhantomClient
    this.createClient();
  }

  /**
   * Creates a PhantomClient instance from the current session
   * Steps:
   * 1. Create ApiKeyStamper with session keypair
   * 2. Create PhantomClient with stamper, organizationId, and app headers
   * 3. Set walletType to 'user-wallet'
   *
   * @throws Error if session is not available
   */
  private createClient(): void {
    if (!this.session) {
      throw new Error("Cannot create client without session");
    }

    this.logger.info("Creating PhantomClient");

    // Step 1: Create ApiKeyStamper with session keypair
    const stamper = new ApiKeyStamper({
      apiSecretKey: this.session.stamperKeys.secretKey,
    });

    // Step 2: Get client ID for X-App-Id header
    const appId = process.env.PHANTOM_APP_ID || process.env.PHANTOM_CLIENT_ID || this.appId;

    // Step 3: Create PhantomClient with stamper, organizationId, and headers
    this.client = new PhantomClient(
      {
        apiBaseUrl: this.apiBaseUrl,
        organizationId: this.session.organizationId,
        walletType: "user-wallet",
        headers: {
          "X-App-Id": appId,
        } as any, // Type assertion needed as X-App-Id is not in SdkAnalyticsHeaders
      },
      stamper,
    );

    this.logger.info("PhantomClient created successfully");
  }
}
