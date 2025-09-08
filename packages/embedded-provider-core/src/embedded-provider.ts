import { PhantomClient } from "@phantom/client";
import { base64urlEncode } from "@phantom/base64url";
import bs58 from "bs58";
import {
  parseMessage,
  parseTransactionToBase64Url,
  parseSignMessageResponse,
  parseTransactionResponse,
  type ParsedTransactionResult,
  type ParsedSignatureResult,
} from "@phantom/parsers";
import { AUTHENTICATOR_EXPIRATION_TIME_MS, AUTHENTICATOR_RENEWAL_WINDOW_MS } from "./constants";

import type {
  PlatformAdapter,
  Session,
  AuthResult,
  DebugLogger,
  EmbeddedStorage,
  AuthProvider,
  URLParamsAccessor,
  StamperInfo,
} from "./interfaces";
import type {
  EmbeddedProviderConfig,
  ConnectResult,
  SignMessageParams,
  SignTransactionParams,
  SignAndSendTransactionParams,
  WalletAddress,
  AuthOptions,
} from "./types";
import { JWTAuth } from "./auth/jwt-auth";
import { generateSessionId } from "./utils/session";
import { retryWithBackoff } from "./utils/retry";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import { EmbeddedSolanaChain, EmbeddedEthereumChain } from "./chains";
import type { ISolanaChain, IEthereumChain } from "@phantom/chains";

export type EmbeddedProviderEvent = "connect" | "connect_start" | "connect_error" | "disconnect" | "error";
export type EventCallback = (data?: any) => void;

interface StamperResponse {
  organizationId: string;
  stamperInfo: StamperInfo;
  expiresAtMs: number;
  username: string;
}

export class EmbeddedProvider {
  private config: EmbeddedProviderConfig;
  private platform: PlatformAdapter;
  private storage: EmbeddedStorage;
  private authProvider: AuthProvider;
  private urlParamsAccessor: URLParamsAccessor;
  private stamper: StamperWithKeyManagement;
  private logger: DebugLogger;
  private client: PhantomClient | null = null;
  private walletId: string | null = null;
  private addresses: WalletAddress[] = [];
  private jwtAuth: JWTAuth;

  // Built-in chain instances
  public readonly solana: ISolanaChain;
  public readonly ethereum: IEthereumChain;
  private eventListeners: Map<EmbeddedProviderEvent, Set<EventCallback>> = new Map();

  constructor(config: EmbeddedProviderConfig, platform: PlatformAdapter, logger: DebugLogger) {
    this.logger = logger;
    this.logger.log("EMBEDDED_PROVIDER", "Initializing EmbeddedProvider", { config });

    this.config = config;
    this.platform = platform;
    this.storage = platform.storage;
    this.authProvider = platform.authProvider;
    this.urlParamsAccessor = platform.urlParamsAccessor;
    this.stamper = platform.stamper;
    this.jwtAuth = new JWTAuth();

    // Store solana provider config (unused for now)
    config.solanaProvider;

    // Initialize chain instances
    this.solana = new EmbeddedSolanaChain(this);
    this.ethereum = new EmbeddedEthereumChain(this);

    this.logger.info("EMBEDDED_PROVIDER", "EmbeddedProvider initialized");

    // Auto-connect is now handled manually via autoConnect() method to avoid race conditions
  }

  /*
   * Event system methods for listening to provider state changes
   */
  on(event: EmbeddedProviderEvent, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    this.logger.log("EMBEDDED_PROVIDER", "Event listener added", { event });
  }

  off(event: EmbeddedProviderEvent, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      this.logger.log("EMBEDDED_PROVIDER", "Event listener removed", { event });
    }
  }

  private emit(event: EmbeddedProviderEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners && listeners.size > 0) {
      this.logger.log("EMBEDDED_PROVIDER", "Emitting event", { event, listenerCount: listeners.size, data });
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error("EMBEDDED_PROVIDER", "Event callback error", { event, error });
        }
      });
    }
  }

  private async getAndFilterWalletAddresses(walletId: string): Promise<WalletAddress[]> {
    // Get session to access derivation index
    const session = await this.storage.getSession();
    const derivationIndex = session?.accountDerivationIndex ?? 0;

    // Get wallet addresses with retry and auto-disconnect on failure
    const addresses = await retryWithBackoff(
      () => this.client!.getWalletAddresses(walletId, undefined, derivationIndex),
      "getWalletAddresses",
      this.logger,
    ).catch(async error => {
      this.logger.error("EMBEDDED_PROVIDER", "getWalletAddresses failed after retries, disconnecting", {
        walletId,
        error: error.message,
        derivationIndex: derivationIndex,
      });
      // Clear the session if getWalletAddresses fails after retries
      await this.storage.clearSession();
      this.client = null;
      this.walletId = null;
      this.addresses = [];
      throw error;
    });

    // Filter by enabled address types and return formatted addresses
    return addresses.filter(addr => this.config.addressTypes.some(type => type === addr.addressType));
  }

  /*
   * We use this method to make sure the session is not invalid, or there's a different session id in the url.
   * If there's a different one, we delete the current session and start from scratch.
   * This prevents issues where users have stale sessions or URL mismatches after redirects.
   */
  private async validateAndCleanSession(session: Session | null): Promise<Session | null> {
    if (!session) return null;

    this.logger.log("EMBEDDED_PROVIDER", "Found existing session, validating", {
      sessionId: session.sessionId,
      status: session.status,
      walletId: session.walletId,
    });

    // If session is not completed, check if we're in the right context
    if (session.status !== "completed") {
      const urlSessionId = this.urlParamsAccessor.getParam("session_id");

      // If we have a pending session but no sessionId in URL, this is a mismatch
      if (session.status === "pending" && !urlSessionId) {
        this.logger.warn("EMBEDDED_PROVIDER", "Session mismatch detected - pending session without redirect context", {
          sessionId: session.sessionId,
          status: session.status,
        });
        // Clear the invalid session and start fresh
        await this.storage.clearSession();
        return null;
      }
      // If sessionId in URL doesn't match stored session, clear invalid session
      else if (urlSessionId && urlSessionId !== session.sessionId) {
        this.logger.warn("EMBEDDED_PROVIDER", "Session ID mismatch detected", {
          storedSessionId: session.sessionId,
          urlSessionId: urlSessionId,
        });
        await this.storage.clearSession();
        return null;
      }
    }

    // For completed sessions, check if session is valid (only checks authenticator expiration)
    if (session.status === "completed" && !this.isSessionValid(session)) {
      this.logger.warn("EMBEDDED_PROVIDER", "Session invalid due to authenticator expiration", {
        sessionId: session.sessionId,
        authenticatorExpiresAt: session.authenticatorExpiresAt,
      });
      // Clear the invalid session
      await this.storage.clearSession();
      return null;
    }

    return session;
  }

  /*
   * Shared connection logic for both connect() and autoConnect().
   * Handles existing session validation, redirect resume, and session initialization.
   * Returns ConnectResult if connection succeeds, null if should continue with new auth flow.
   */
  private async tryExistingConnection(isAutoConnect: boolean): Promise<ConnectResult | null> {
    // Get and validate existing session
    this.logger.log("EMBEDDED_PROVIDER", "Getting existing session");
    let session = await this.storage.getSession();
    session = await this.validateAndCleanSession(session);

    // First priority: If we have a completed session, use it
    // This prevents unnecessary redirect resume when the session is already valid
    if (session && session.status === "completed") {
      this.logger.info("EMBEDDED_PROVIDER", "Using existing completed session", {
        sessionId: session.sessionId,
        walletId: session.walletId,
      });

      await this.initializeClientFromSession(session);

      // Update session timestamp
      session.lastUsed = Date.now();
      await this.storage.saveSession(session);

      this.logger.info("EMBEDDED_PROVIDER", "Connection from existing session successful", {
        walletId: this.walletId,
        addressCount: this.addresses.length,
      });

      // Ensure authenticator is valid after successful connection
      await this.ensureValidAuthenticator();

      const result: ConnectResult = {
        walletId: this.walletId!,
        addresses: this.addresses,
        status: "completed",
      };

      // Emit connect event for existing session success
      this.emit("connect", {
        walletId: this.walletId,
        addresses: this.addresses,
        source: "existing-session",
      });

      return result;
    }

    // Second priority: Check if we're resuming from a redirect
    // Only attempt redirect resume if there's no valid completed session
    this.logger.log("EMBEDDED_PROVIDER", "No completed session found, checking for redirect resume");
    if (this.authProvider.resumeAuthFromRedirect) {
      const authResult = this.authProvider.resumeAuthFromRedirect();
      if (authResult) {
        this.logger.info("EMBEDDED_PROVIDER", "Resuming from redirect", {
          walletId: authResult.walletId,
          provider: authResult.provider,
        });

        try {
          return await this.completeAuthConnection(authResult);
        } catch (error) {
          // Handle the edge case where session was wiped from DB but URL has session params
          // Only fall back gracefully when authOptions are provided (indicating intent to start fresh auth)
          if (error instanceof Error && error.message.includes("No session found after redirect") && !isAutoConnect) {
            this.logger.warn(
              "EMBEDDED_PROVIDER",
              "Session missing during redirect resume - will start fresh auth flow",
              {
                error: error.message,
                walletId: authResult.walletId,
              },
            );

            // Clear any potentially stale session data and continue to fresh auth flow
            await this.storage.clearSession();
            return null; // Let connect() method start a fresh auth flow
          }

          // Re-throw error if no authOptions (should fail) or if different error type
          throw error;
        }
      }
    }

    // No existing connection available
    return null;
  }

  /*
   * We use this method to validate authentication options before processing them.
   * This ensures only supported auth providers are used and required tokens are present.
   */
  private validateAuthOptions(authOptions?: AuthOptions): void {
    if (!authOptions) return;

    if (authOptions.provider && !["google", "apple", "jwt"].includes(authOptions.provider)) {
      throw new Error(`Invalid auth provider: ${authOptions.provider}. Must be "google", "apple", or "jwt"`);
    }

    if (authOptions.provider === "jwt" && !authOptions.jwtToken) {
      throw new Error("JWT token is required when using JWT authentication");
    }
  }

  /*
   * We use this method to validate if a session is still valid.
   * This checks session status, required fields, and authenticator expiration.
   * Sessions never expire by age - only authenticators expire.
   */
  private isSessionValid(session: Session | null): boolean {
    if (!session) {
      return false;
    }

    // Check required fields
    if (!session.walletId || !session.organizationId || !session.stamperInfo) {
      this.logger.log("EMBEDDED_PROVIDER", "Session missing required fields", {
        hasWalletId: !!session.walletId,
        hasOrganizationId: !!session.organizationId,
        hasStamperInfo: !!session.stamperInfo,
      });
      return false;
    }

    // Check session status
    if (session.status !== "completed") {
      this.logger.log("EMBEDDED_PROVIDER", "Session not completed", { status: session.status });
      return false;
    }

    // Sessions without authenticator timing are invalid
    if (!session.authenticatorExpiresAt) {
      this.logger.log("EMBEDDED_PROVIDER", "Session invalid - missing authenticator timing", {
        sessionId: session.sessionId,
      });
      return false;
    }

    // Check authenticator expiration - if expired, session is invalid
    if (Date.now() >= session.authenticatorExpiresAt) {
      this.logger.log("EMBEDDED_PROVIDER", "Authenticator expired, session invalid", {
        authenticatorExpiresAt: new Date(session.authenticatorExpiresAt).toISOString(),
        now: new Date().toISOString(),
      });
      return false;
    }

    this.logger.log("EMBEDDED_PROVIDER", "Session is valid", {
      sessionId: session.sessionId,
      walletId: session.walletId,
      authenticatorExpires: new Date(session.authenticatorExpiresAt).toISOString(),
    });
    return true;
  }

  /*
   * Public method to attempt auto-connection using an existing valid session.
   * This should be called after setting up event listeners to avoid race conditions.
   * Silently fails if no valid session exists, enabling seamless reconnection.
   */
  async autoConnect(): Promise<void> {
    try {
      this.logger.log("EMBEDDED_PROVIDER", "Starting auto-connect attempt");

      // Emit connect_start event for auto-connect
      this.emit("connect_start", { source: "auto-connect" });

      // Try to use existing connection (redirect resume or completed session)
      const result = await this.tryExistingConnection(true);

      if (result) {
        // Successfully connected using existing session or redirect
        this.logger.info("EMBEDDED_PROVIDER", "Auto-connect successful", {
          walletId: result.walletId,
          addressCount: result.addresses.length,
        });

        this.emit("connect", {
          walletId: result.walletId,
          addresses: result.addresses,
          source: "auto-connect",
        });
        return;
      }

      // No existing connection available - auto-connect should fail silently
      this.logger.log("EMBEDDED_PROVIDER", "Auto-connect failed: no valid session found");

      // Emit connect_error to reset isConnecting state
      this.emit("connect_error", {
        error: "No valid session found",
        source: "auto-connect",
      });
    } catch (error) {
      this.logger.error("EMBEDDED_PROVIDER", "Auto-connect failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Emit connect_error to reset isConnecting state
      this.emit("connect_error", {
        error: error instanceof Error ? error.message : "Auto-connect failed",
        source: "auto-connect",
      });
    }
  }

  /*
   * We use this method to initialize the stamper and create an organization for new sessions.
   * This is the first step when no existing session is found and we need to set up a new wallet.
   */

  private async createOrganizationAndStamper(): Promise<StamperResponse> {
    // Initialize stamper (generates keypair in IndexedDB)
    this.logger.log("EMBEDDED_PROVIDER", "Initializing stamper");
    const stamperInfo = await this.stamper.init();
    this.logger.log("EMBEDDED_PROVIDER", "Stamper initialized", {
      publicKey: stamperInfo.publicKey,
      keyId: stamperInfo.keyId,
      algorithm: this.stamper.algorithm,
    });

    // Create a temporary client with the stamper
    this.logger.log("EMBEDDED_PROVIDER", "Creating temporary PhantomClient");
    const tempClient = new PhantomClient(
      {
        apiBaseUrl: this.config.apiBaseUrl,
        headers: {
          ...(this.platform.analyticsHeaders || {})
        }
      },
      this.stamper,
    );

    // Create an organization
    // organization name is a combination of this organizationId and this userId, which will be a unique identifier
    const platformName = this.platform.name || "unknown";
    const shortPubKey = stamperInfo.publicKey.slice(0, 8);
    const organizationName = `${this.config.organizationId}-${platformName}-${shortPubKey}`;

    this.logger.log("EMBEDDED_PROVIDER", "Creating organization", {
      organizationName,
      publicKey: stamperInfo.publicKey,
      platform: platformName,
    });

    // Convert base58 public key to base64url format as required by the API
    const base64urlPublicKey = base64urlEncode(bs58.decode(stamperInfo.publicKey));
    const expiresAtMs = Date.now() + AUTHENTICATOR_EXPIRATION_TIME_MS;

    const username = `user-${shortPubKey}`;
    const { organizationId } = await tempClient.createOrganization(organizationName, [
      {
        username,
        role: "ADMIN",
        authenticators: [
          {
            authenticatorName: `auth-${shortPubKey}`,
            authenticatorKind: "keypair",
            publicKey: base64urlPublicKey,
            algorithm: "Ed25519",
            // Commented for now until KMS supports fully expirable organizations
            // expiresAtMs: expiresAtMs,
          } as any,
        ],
      },
    ]);
    this.logger.info("EMBEDDED_PROVIDER", "Organization created", { organizationId });

    return { organizationId, stamperInfo, expiresAtMs, username };
  }

  async connect(authOptions?: AuthOptions): Promise<ConnectResult> {
    try {
      this.logger.info("EMBEDDED_PROVIDER", "Starting embedded provider connect", {
        authOptions: authOptions
          ? {
              provider: authOptions.provider,
              hasJwtToken: !!authOptions.jwtToken,
            }
          : undefined,
      });

      // Emit connect_start event for manual connect
      this.emit("connect_start", {
        source: "manual-connect",
        authOptions: authOptions ? { provider: authOptions.provider } : undefined,
      });

      // Try to use existing connection (redirect resume or completed session)
      const existingResult = await this.tryExistingConnection(false);
      if (existingResult) {
        // Successfully connected using existing session or redirect
        this.logger.info("EMBEDDED_PROVIDER", "Manual connect using existing connection", {
          walletId: existingResult.walletId,
          addressCount: existingResult.addresses.length,
        });

        // Emit connect event for manual connect success with existing connection
        this.emit("connect", {
          walletId: existingResult.walletId,
          addresses: existingResult.addresses,
          source: "manual-existing",
        });

        return existingResult;
      }

      // Validate auth options before proceeding with new auth flow
      this.validateAuthOptions(authOptions);

      // No existing connection available, create new one
      this.logger.info("EMBEDDED_PROVIDER", "No existing connection, creating new auth flow");
      const { organizationId, stamperInfo, expiresAtMs, username } = await this.createOrganizationAndStamper();
      const session = await this.handleAuthFlow(organizationId, stamperInfo, authOptions, expiresAtMs, username);

      // If session is null here, it means we're doing a redirect
      if (!session) {
        // This should not return anything as redirect is happening
        return {
          addresses: [],
          status: "pending",
        } as ConnectResult;
      }

      // Update session last used timestamp (only for non-redirect flows)
      // For redirect flows, timestamp is updated before redirect to prevent race condition
      if (!authOptions || authOptions.provider === "jwt" || this.config.embeddedWalletType === "app-wallet") {
        session.lastUsed = Date.now();
        await this.storage.saveSession(session);
      }

      // Initialize client and get addresses
      await this.initializeClientFromSession(session);

      // Ensure authenticator is valid after successful connection
      await this.ensureValidAuthenticator();

      const result: ConnectResult = {
        walletId: this.walletId!,
        addresses: this.addresses,
        status: "completed",
      };

      // Emit connect event for manual connect success
      this.emit("connect", {
        walletId: this.walletId,
        addresses: this.addresses,
        source: "manual",
      });

      return result;
    } catch (error) {
      // Log the full error details for debugging
      this.logger.error("EMBEDDED_PROVIDER", "Connect failed with error", {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      });

      // Emit connect_error event for manual connect failure
      this.emit("connect_error", {
        error: error instanceof Error ? error.message : String(error),
        source: "manual-connect",
      });

      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        // Check for specific error types and provide better error messages
        if (error.message.includes("IndexedDB") || error.message.includes("storage")) {
          throw new Error(
            "Storage error: Unable to access browser storage. Please ensure storage is available and try again.",
          );
        }

        if (error.message.includes("network") || error.message.includes("fetch")) {
          throw new Error(
            "Network error: Unable to connect to authentication server. Please check your internet connection and try again.",
          );
        }

        if (error.message.includes("JWT") || error.message.includes("jwt")) {
          throw new Error(`JWT Authentication error: ${error.message}`);
        }

        if (error.message.includes("Authentication") || error.message.includes("auth")) {
          throw new Error(`Authentication error: ${error.message}`);
        }

        if (error.message.includes("organization") || error.message.includes("wallet")) {
          throw new Error(`Wallet creation error: ${error.message}`);
        }

        // Re-throw the original error if it's already well-formatted
        throw error;
      }

      // Handle unknown error types
      throw new Error(`Embedded wallet connection failed: ${String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    const wasConnected = this.client !== null;

    await this.storage.clearSession();

    this.client = null;
    this.walletId = null;
    this.addresses = [];
    this.logger.info("EMBEDDED_PROVIDER", "Disconnected from embedded wallet");

    // Emit disconnect event if we were previously connected
    if (wasConnected) {
      this.emit("disconnect", {
        source: "manual",
      });
    }
  }

  async signMessage(params: SignMessageParams): Promise<ParsedSignatureResult> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Check if authenticator needs renewal before performing the operation
    await this.ensureValidAuthenticator();

    this.logger.info("EMBEDDED_PROVIDER", "Signing message", {
      walletId: this.walletId,
      message: params.message,
    });

    // Parse message to base64url format for client
    const parsedMessage = parseMessage(params.message);

    // Get session to access derivation index
    const session = await this.storage.getSession();
    const derivationIndex = session?.accountDerivationIndex ?? 0;

    // Get raw response from client
    const rawResponse = await this.client.signMessage({
      walletId: this.walletId,
      message: parsedMessage.base64url,
      networkId: params.networkId,
      derivationIndex: derivationIndex,
    });

    this.logger.info("EMBEDDED_PROVIDER", "Message signed successfully", {
      walletId: this.walletId,
      message: params.message,
    });

    // Parse the response to get human-readable signature and explorer URL
    return parseSignMessageResponse(rawResponse, params.networkId);
  }

  async signTransaction(params: SignTransactionParams): Promise<ParsedTransactionResult> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Check if authenticator needs renewal before performing the operation
    await this.ensureValidAuthenticator();

    this.logger.info("EMBEDDED_PROVIDER", "Signing transaction", {
      walletId: this.walletId,
      networkId: params.networkId,
    });

    // Parse transaction to base64url format for client based on network
    const parsedTransaction = await parseTransactionToBase64Url(params.transaction, params.networkId);

    // Get session to access derivation index
    const session = await this.storage.getSession();
    const derivationIndex = session?.accountDerivationIndex ?? 0;

    this.logger.log("EMBEDDED_PROVIDER", "Parsed transaction for signing", {
      walletId: this.walletId,
      transaction: parsedTransaction,
      derivationIndex: derivationIndex,
    });

    // Get raw response from client
    const rawResponse = await this.client.signTransaction({
      walletId: this.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
      derivationIndex: derivationIndex,
    });

    this.logger.info("EMBEDDED_PROVIDER", "Transaction signed successfully", {
      walletId: this.walletId,
      networkId: params.networkId,
      rawTransaction: rawResponse.rawTransaction,
    });

    // Parse the response to get transaction result (without hash since it wasn't sent)
    return await parseTransactionResponse(rawResponse.rawTransaction, params.networkId);
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<ParsedTransactionResult> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Check if authenticator needs renewal before performing the operation
    await this.ensureValidAuthenticator();

    this.logger.info("EMBEDDED_PROVIDER", "Signing and sending transaction", {
      walletId: this.walletId,
      networkId: params.networkId,
    });

    // Parse transaction to base64url format for client based on network
    const parsedTransaction = await parseTransactionToBase64Url(params.transaction, params.networkId);

    // Get session to access derivation index
    const session = await this.storage.getSession();
    const derivationIndex = session?.accountDerivationIndex ?? 0;

    this.logger.log("EMBEDDED_PROVIDER", "Parsed transaction for signing", {
      walletId: this.walletId,
      transaction: parsedTransaction,
      derivationIndex: derivationIndex,
    });

    // Get raw response from client
    const rawResponse = await this.client.signAndSendTransaction({
      walletId: this.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
      derivationIndex: derivationIndex,
    });

    this.logger.info("EMBEDDED_PROVIDER", "Transaction signed and sent successfully", {
      walletId: this.walletId,
      networkId: params.networkId,
      hash: rawResponse.hash,
      rawTransaction: rawResponse.rawTransaction,
    });

    // Parse the response to get transaction hash and explorer URL
    return await parseTransactionResponse(rawResponse.rawTransaction, params.networkId, rawResponse.hash);
  }

  getAddresses(): WalletAddress[] {
    return this.addresses;
  }

  isConnected(): boolean {
    return this.client !== null && this.walletId !== null;
  }

  /*
   * We use this method to route between different authentication flows based on wallet type and auth options.
   * It handles app-wallet creation directly or routes to JWT/redirect authentication for user-wallets.
   * Returns null for redirect flows since they don't complete synchronously.
   */
  private async handleAuthFlow(
    organizationId: string,
    stamperInfo: StamperInfo,
    authOptions: AuthOptions | undefined,
    expiresAtMs: number,
    username: string,
  ): Promise<Session | null> {
    if (this.config.embeddedWalletType === "user-wallet") {
      this.logger.info("EMBEDDED_PROVIDER", "Creating user-wallet, routing authentication", {
        authProvider: authOptions?.provider || "phantom-connect",
      });

      // Route to appropriate authentication flow based on authOptions
      if (authOptions?.provider === "jwt") {
        return await this.handleJWTAuth(organizationId, stamperInfo, authOptions, expiresAtMs, username);
      } else {
        // This will redirect in browser, so we don't return a session
        // In react-native this will return an auth result
        this.logger.info("EMBEDDED_PROVIDER", "Starting redirect-based authentication flow", {
          organizationId,
          parentOrganizationId: this.config.organizationId,
          provider: authOptions?.provider,
        });
        return await this.handleRedirectAuth(organizationId, stamperInfo, authOptions, username);
      }
    } else {
      this.logger.info("EMBEDDED_PROVIDER", "Creating app-wallet", {
        organizationId,
      });
      // Create app-wallet directly
      const tempClient = new PhantomClient(
        {
          apiBaseUrl: this.config.apiBaseUrl,
          organizationId: organizationId,
          headers: {
          ...(this.platform.analyticsHeaders || {})
        }
        },
        this.stamper,
      );

      const wallet = await tempClient.createWallet(`Wallet ${Date.now()}`);
      const walletId = wallet.walletId;

      // Save session with app-wallet info
      const now = Date.now();
      const session = {
        sessionId: generateSessionId(),
        walletId: walletId,
        organizationId: organizationId,
        appId: this.config.appId,
        stamperInfo,
        authProvider: "app-wallet",
        userInfo: { embeddedWalletType: this.config.embeddedWalletType },
        accountDerivationIndex: 0, // App wallets default to index 0
        status: "completed" as const,
        createdAt: now,
        lastUsed: now,
        authenticatorCreatedAt: now,
        authenticatorExpiresAt: expiresAtMs,
        lastRenewalAttempt: undefined,
        username,
      };

      await this.storage.saveSession(session);

      this.logger.info("EMBEDDED_PROVIDER", "App-wallet created successfully", { walletId, organizationId });
      return session;
    }
  }

  /*
   * We use this method to handle JWT-based authentication for user-wallets.
   * It authenticates using the provided JWT token and creates a completed session.
   */
  private async handleJWTAuth(
    organizationId: string,
    stamperInfo: StamperInfo,
    authOptions: AuthOptions,
    expiresAtMs: number,
    username: string,
  ): Promise<Session> {
    this.logger.info("EMBEDDED_PROVIDER", "Using JWT authentication flow");

    // Use JWT authentication flow
    if (!authOptions.jwtToken) {
      this.logger.error("EMBEDDED_PROVIDER", "JWT token missing for JWT authentication");
      throw new Error("JWT token is required for JWT authentication");
    }

    this.logger.log("EMBEDDED_PROVIDER", "Starting JWT authentication");
    const authResult = await this.jwtAuth.authenticate({
      organizationId,
      appId: this.config.appId,
      parentOrganizationId: this.config.organizationId,
      jwtToken: authOptions.jwtToken,
      customAuthData: authOptions.customAuthData,
    });
    const walletId = authResult.walletId;
    this.logger.info("EMBEDDED_PROVIDER", "JWT authentication completed", { walletId });

    // Save session with auth info
    const now = Date.now();
    const session = {
      sessionId: generateSessionId(),
      walletId: walletId,
      organizationId: organizationId,
      appId: this.config.appId,
      stamperInfo,
      authProvider: authResult.provider,
      userInfo: authResult.userInfo,
      accountDerivationIndex: authResult.accountDerivationIndex,
      status: "completed" as const,
      createdAt: now,
      lastUsed: now,
      authenticatorCreatedAt: now,
      authenticatorExpiresAt: expiresAtMs,
      lastRenewalAttempt: undefined,
      username,
    };
    this.logger.log("EMBEDDED_PROVIDER", "Saving JWT session");
    await this.storage.saveSession(session);
    return session;
  }

  /*
   * We use this method to handle redirect-based authentication (Google/Apple OAuth).
   * It saves a temporary session before redirecting to prevent losing state during the redirect flow.
   * Session timestamp is updated before redirect to prevent race conditions.
   */
  private async handleRedirectAuth(
    organizationId: string,
    stamperInfo: StamperInfo,
    authOptions?: AuthOptions,
    username?: string,
  ): Promise<Session | null> {
    this.logger.info("EMBEDDED_PROVIDER", "Using Phantom Connect authentication flow (redirect-based)", {
      provider: authOptions?.provider,
      hasRedirectUrl: !!this.config.authOptions?.redirectUrl,
      authUrl: this.config.authOptions?.authUrl,
    });

    // Use Phantom Connect authentication flow (redirect-based)
    // Store session before redirect so we can restore it after redirect
    const now = Date.now();
    const sessionId = generateSessionId();
    const tempSession: Session = {
      sessionId: sessionId,
      walletId: `temp-${now}`, // Temporary ID, will be updated after redirect
      organizationId: organizationId,
      appId: this.config.appId,
      stamperInfo,
      authProvider: "phantom-connect",
      userInfo: { provider: authOptions?.provider },
      accountDerivationIndex: undefined, // Will be set when redirect completes
      status: "pending" as const,
      createdAt: now,
      lastUsed: now,
      authenticatorCreatedAt: now,
      authenticatorExpiresAt: now + AUTHENTICATOR_EXPIRATION_TIME_MS,
      lastRenewalAttempt: undefined,
      username: username || `user-${stamperInfo.keyId.substring(0, 8)}`,
    };
    this.logger.log("EMBEDDED_PROVIDER", "Saving temporary session before redirect", {
      sessionId: tempSession.sessionId,
      tempWalletId: tempSession.walletId,
    });

    // Update session timestamp before redirect (prevents race condition)
    tempSession.lastUsed = Date.now();
    await this.storage.saveSession(tempSession);

    this.logger.info("EMBEDDED_PROVIDER", "Starting Phantom Connect redirect", {
      organizationId,
      parentOrganizationId: this.config.organizationId,
      appId: this.config.appId,
      provider: authOptions?.provider,
      authUrl: this.config.authOptions?.authUrl,
    });

    // Start the authentication flow (this will redirect the user in the browser, or handle it in React Native)
    const authResult = await this.authProvider.authenticate({
      organizationId: organizationId,
      appId: this.config.appId,
      parentOrganizationId: this.config.organizationId,
      provider: authOptions?.provider as "google" | "apple" | undefined,
      redirectUrl: this.config.authOptions?.redirectUrl,
      customAuthData: authOptions?.customAuthData,
      authUrl: this.config.authOptions?.authUrl,
      sessionId: sessionId,
    });

    if (authResult && "walletId" in authResult) {
      // If we got an auth result, we need to update the session with actual wallet ID
      this.logger.info("EMBEDDED_PROVIDER", "Authentication completed after redirect", {
        walletId: authResult.walletId,
        provider: authResult.provider,
      });

      // Update the temporary session with actual wallet ID and auth info
      tempSession.walletId = authResult.walletId;
      tempSession.authProvider = authResult.provider || tempSession.authProvider;
      tempSession.accountDerivationIndex = authResult.accountDerivationIndex;
      tempSession.status = "completed";
      tempSession.lastUsed = Date.now();
      await this.storage.saveSession(tempSession);

      return tempSession; // Return the auth result for further processing
    }
    // If we don't have an auth result, it means we're in a redirect flow
    this.logger.info("EMBEDDED_PROVIDER", "Redirect authentication initiated, waiting for redirect completion");
    // In this case, we don't return anything as the redirect will handle the rest
    return null;
  }

  private async completeAuthConnection(authResult: AuthResult): Promise<ConnectResult> {
    // Check if we have an existing session
    const session = await this.storage.getSession();

    if (!session) {
      throw new Error("No session found after redirect - session may have expired");
    }

    // Update session with actual wallet ID and auth info from redirect
    session.walletId = authResult.walletId;
    session.authProvider = authResult.provider || session.authProvider;
    session.accountDerivationIndex = authResult.accountDerivationIndex;
    session.status = "completed";
    session.lastUsed = Date.now();
    await this.storage.saveSession(session);

    await this.initializeClientFromSession(session);

    // Ensure authenticator is valid after successful connection
    await this.ensureValidAuthenticator();

    return {
      walletId: this.walletId!,
      addresses: this.addresses,
      status: "completed",
    };
  }

  /*
   * Ensures the authenticator is valid and performs renewal if needed.
   * The renewal of the authenticator can only happen meanwhile the previous authenticator is still valid.
   */
  private async ensureValidAuthenticator(): Promise<void> {
    // Get current session to check authenticator timing
    const session = await this.storage.getSession();
    if (!session) {
      throw new Error("No active session found");
    }

    const now = Date.now();

    // Sessions without authenticator timing fields are invalid - clear them
    if (!session.authenticatorExpiresAt) {
      this.logger.warn("EMBEDDED_PROVIDER", "Session missing authenticator timing - treating as invalid session");
      await this.disconnect();
      throw new Error("Invalid session - missing authenticator timing");
    }

    const timeUntilExpiry = session.authenticatorExpiresAt - now;

    this.logger.log("EMBEDDED_PROVIDER", "Checking authenticator expiration", {
      expiresAt: new Date(session.authenticatorExpiresAt).toISOString(),
      timeUntilExpiry,
    });

    // Check if authenticator has expired
    if (timeUntilExpiry <= 0) {
      this.logger.error("EMBEDDED_PROVIDER", "Authenticator has expired, disconnecting");
      await this.disconnect();
      throw new Error("Authenticator expired");
    }

    // Check if authenticator needs renewal (within renewal window)
    const renewalWindow = AUTHENTICATOR_RENEWAL_WINDOW_MS;
    if (timeUntilExpiry <= renewalWindow) {
      this.logger.info("EMBEDDED_PROVIDER", "Authenticator needs renewal", {
        expiresAt: new Date(session.authenticatorExpiresAt).toISOString(),
        timeUntilExpiry,
        renewalWindow,
      });

      try {
        await this.renewAuthenticator(session);
        this.logger.info("EMBEDDED_PROVIDER", "Authenticator renewed successfully");
      } catch (error) {
        this.logger.error("EMBEDDED_PROVIDER", "Failed to renew authenticator", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Don't throw - renewal failure shouldn't break existing functionality
      }
    }
  }

  /*
   * We use this method to perform silent authenticator renewal.
   * It generates a new keypair, creates a new authenticator, and switches to it.
   */
  private async renewAuthenticator(session: Session): Promise<void> {
    if (!this.client) {
      throw new Error("Client not initialized");
    }

    this.logger.info("EMBEDDED_PROVIDER", "Starting authenticator renewal");

    try {
      // Step 1: Generate new keypair (but don't make it active yet)
      const newKeyInfo = await this.stamper.rotateKeyPair();
      this.logger.log("EMBEDDED_PROVIDER", "Generated new keypair for renewal", {
        newKeyId: newKeyInfo.keyId,
        newPublicKey: newKeyInfo.publicKey,
      });

      // Step 2: Convert public key and set expiration
      const base64urlPublicKey = base64urlEncode(bs58.decode(newKeyInfo.publicKey));
      const expiresAtMs = Date.now() + AUTHENTICATOR_EXPIRATION_TIME_MS;

      // Step 3: Create new authenticator with replaceExpirable=true
      let authenticatorResult;
      try {
        authenticatorResult = await this.client.createAuthenticator({
          organizationId: session.organizationId,
          username: session.username,
          authenticatorName: `auth-${newKeyInfo.keyId.substring(0, 8)}`,
          authenticator: {
            authenticatorName: `auth-${newKeyInfo.keyId.substring(0, 8)}`,
            authenticatorKind: "keypair",
            publicKey: base64urlPublicKey,
            algorithm: "Ed25519",
            // Commented for now until KMS supports fully expiring organizations
            // expiresAtMs: expiresAtMs,
          } as any,
          replaceExpirable: true,
        } as any);
      } catch (error) {
        this.logger.error("EMBEDDED_PROVIDER", "Failed to create new authenticator", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Rollback the rotation on server error
        await this.stamper.rollbackRotation();
        throw new Error(
          `Failed to create new authenticator: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      this.logger.info("EMBEDDED_PROVIDER", "Created new authenticator", {
        authenticatorId: (authenticatorResult as any).id,
      });

      // Step 4: Commit the rotation (switch stamper to use new keypair)
      await this.stamper.commitRotation((authenticatorResult as any).id || "unknown");

      // Step 5: Update session with new authenticator timing
      const now = Date.now();
      session.stamperInfo = newKeyInfo;
      session.authenticatorCreatedAt = now;
      session.authenticatorExpiresAt = expiresAtMs;
      session.lastRenewalAttempt = now;
      await this.storage.saveSession(session);

      this.logger.info("EMBEDDED_PROVIDER", "Authenticator renewal completed successfully", {
        newKeyId: newKeyInfo.keyId,
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    } catch (error) {
      // Rollback rotation on any failure
      await this.stamper.rollbackRotation();
      throw error;
    }
  }

  /*
   * We use this method to initialize the PhantomClient and fetch wallet addresses from a completed session.
   * This is the final step that sets up the provider's client state and retrieves available addresses.
   */
  private async initializeClientFromSession(session: Session): Promise<void> {
    // Create client from session
    this.logger.log("EMBEDDED_PROVIDER", "Initializing PhantomClient from session", {
      organizationId: session.organizationId,
      walletId: session.walletId,
      appId: session.appId,
    });

    // Ensure stamper is initialized with existing keys
    if (!this.stamper.getKeyInfo()) {
      await this.stamper.init();
    }

    this.client = new PhantomClient(
      {
        apiBaseUrl: this.config.apiBaseUrl,
        organizationId: session.organizationId,
        headers: {
          ...(this.platform.analyticsHeaders || {})
        }
      },
      this.stamper,
    );

    this.walletId = session.walletId;

    // Get wallet addresses and filter by enabled address types with retry
    this.addresses = await this.getAndFilterWalletAddresses(session.walletId);
  }
}
