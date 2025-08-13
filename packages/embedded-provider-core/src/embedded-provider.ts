import { PhantomClient } from "@phantom/client";
import type { AddressType } from "@phantom/client";
import { parseMessage, parseTransaction, parseSignMessageResponse, parseTransactionResponse,type ParsedTransactionResult, type ParsedSignatureResult } from "@phantom/parsers";

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
  SignAndSendTransactionParams,
  WalletAddress,
  AuthOptions,
} from "./types";
import { JWTAuth } from "./auth/jwt-auth";
import { generateSessionId } from "./utils/session";
import { retryWithBackoff } from "./utils/retry";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";
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
    this.logger.info("EMBEDDED_PROVIDER", "EmbeddedProvider initialized");
  }

  private async getAndFilterWalletAddresses(walletId: string): Promise<WalletAddress[]> {
    // Get wallet addresses with retry and auto-disconnect on failure
    const addresses = await retryWithBackoff(
      () => this.client!.getWalletAddresses(walletId),
      "getWalletAddresses",
      this.logger,
    ).catch(async error => {
      this.logger.error("EMBEDDED_PROVIDER", "getWalletAddresses failed after retries, disconnecting", {
        walletId,
        error: error.message,
      });
      // Clear the session if getWalletAddresses fails after retries
      await this.storage.clearSession();
      this.client = null;
      this.walletId = null;
      this.addresses = [];
      throw error;
    });

    // Filter by enabled address types and return formatted addresses
    return addresses
      .filter(addr => this.config.addressTypes.some(type => type === addr.addressType))
      .map(addr => ({
        addressType: addr.addressType as AddressType,
        address: addr.address,
      }));
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

    return session;
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
   * We use this method to initialize the stamper and create an organization for new sessions.
   * This is the first step when no existing session is found and we need to set up a new wallet.
   */
  private async createOrganizationAndStamper(): Promise<{ organizationId: string; stamperInfo: StamperInfo }> {
    // Initialize stamper (generates keypair in IndexedDB)
    this.logger.log("EMBEDDED_PROVIDER", "Initializing stamper");
    const stamperInfo = await this.stamper.init();
    this.logger.log("EMBEDDED_PROVIDER", "Stamper initialized", { publicKey: stamperInfo.publicKey, keyId: stamperInfo.keyId, algorithm: this.stamper.algorithm });

    // Create a temporary client with the stamper
    this.logger.log("EMBEDDED_PROVIDER", "Creating temporary PhantomClient");
    const tempClient = new PhantomClient(
      {
        apiBaseUrl: this.config.apiBaseUrl,
      },
      this.stamper,
    );

    // Create an organization
    // organization name is a combination of this organizationId and this userId, which will be a unique identifier
    const uid = Date.now(); // for now
    const organizationName = `${this.config.organizationId}-${uid}`;
    
    // Create authenticator name with platform info and public key for identification
    const platformName = this.platform.name || "unknown";
    const shortPubKey = stamperInfo.publicKey.slice(0, 8); // First 8 chars of public key
    const authenticatorName = `${platformName}-${shortPubKey}-${uid}`;
    
    this.logger.log("EMBEDDED_PROVIDER", "Creating organization", { 
      organizationName, 
      authenticatorName, 
      platform: platformName 
    });
   
    const { organizationId } = await tempClient.createOrganization(organizationName, stamperInfo.publicKey, authenticatorName);
    this.logger.info("EMBEDDED_PROVIDER", "Organization created", { organizationId, authenticatorName });

    return { organizationId, stamperInfo };
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

      // Get and validate existing session
      this.logger.log("EMBEDDED_PROVIDER", "Getting existing session");
      let session = await this.storage.getSession();
      session = await this.validateAndCleanSession(session);

      // First, check if we're resuming from a redirect
      this.logger.log("EMBEDDED_PROVIDER", "Checking for redirect resume");
      if (this.authProvider.resumeAuthFromRedirect) {
        const authResult = this.authProvider.resumeAuthFromRedirect();
        if (authResult) {
          this.logger.info("EMBEDDED_PROVIDER", "Resuming from redirect", {
            walletId: authResult.walletId,
            provider: authResult.provider,
          });
          return this.completeAuthConnection(authResult);
        }
      }

      // Validate auth options
      this.validateAuthOptions(authOptions);

      // If no session exists, create new one
      if (!session) {
        this.logger.info("EMBEDDED_PROVIDER", "No existing session, creating new one");
        const { organizationId, stamperInfo } = await this.createOrganizationAndStamper();
        session = await this.handleAuthFlow(organizationId, stamperInfo, authOptions);
      }

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

      return {
        walletId: this.walletId!,
        addresses: this.addresses,
        status: "completed",
      };
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
    await this.storage.clearSession();
    this.client = null;
    this.walletId = null;
    this.addresses = [];
  }

  async signMessage(params: SignMessageParams): Promise<ParsedSignatureResult> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Parse message to base64url format for client
    const parsedMessage = parseMessage(params.message);

    // Get raw response from client
    const rawResponse = await this.client.signMessage({
      walletId: this.walletId,
      message: parsedMessage.base64url,
      networkId: params.networkId,
    });

    // Parse the response to get human-readable signature and explorer URL
    return parseSignMessageResponse(rawResponse, params.networkId);
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<ParsedTransactionResult> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Parse transaction to base64url format for client based on network
    const parsedTransaction = await parseTransaction(params.transaction, params.networkId);

    // Get raw response from client
    const rawResponse = await this.client.signAndSendTransaction({
      walletId: this.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
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
    authOptions?: AuthOptions,
  ): Promise<Session | null> {
    if (this.config.embeddedWalletType === "user-wallet") {
      this.logger.info("EMBEDDED_PROVIDER", "Creating user-wallet, routing authentication", {
        authProvider: authOptions?.provider || "phantom-connect",
      });

      // Route to appropriate authentication flow based on authOptions
      if (authOptions?.provider === "jwt") {
        return await this.handleJWTAuth(organizationId, stamperInfo, authOptions);
      } else {
        // This will redirect, so we don't return a session
        await this.handleRedirectAuth(organizationId, stamperInfo, authOptions);
        return null;
      }
    } else {
      // Create app-wallet directly
      const tempClient = new PhantomClient(
        {
          apiBaseUrl: this.config.apiBaseUrl,
          organizationId: organizationId,
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
        stamperInfo,
        authProvider: "app-wallet",
        userInfo: { embeddedWalletType: this.config.embeddedWalletType },
        status: "completed" as const,
        createdAt: now,
        lastUsed: now,
      };
      await this.storage.saveSession(session);
      return session;
    }
  }

  /*
   * We use this method to handle JWT-based authentication for user-wallets.
   * It authenticates using the provided JWT token and creates a completed session.
   */
  private async handleJWTAuth(organizationId: string, stamperInfo: StamperInfo, authOptions: AuthOptions): Promise<Session> {
    this.logger.info("EMBEDDED_PROVIDER", "Using JWT authentication flow");

    // Use JWT authentication flow
    if (!authOptions.jwtToken) {
      this.logger.error("EMBEDDED_PROVIDER", "JWT token missing for JWT authentication");
      throw new Error("JWT token is required for JWT authentication");
    }

    this.logger.log("EMBEDDED_PROVIDER", "Starting JWT authentication");
    const authResult = await this.jwtAuth.authenticate({
      organizationId: organizationId,
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
      stamperInfo,
      authProvider: authResult.provider,
      userInfo: authResult.userInfo,
      status: "completed" as const,
      createdAt: now,
      lastUsed: now,
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
  private async handleRedirectAuth(organizationId: string, stamperInfo: StamperInfo, authOptions?: AuthOptions): Promise<void> {
    this.logger.info("EMBEDDED_PROVIDER", "Using Phantom Connect authentication flow (redirect-based)", {
      provider: authOptions?.provider,
      hasRedirectUrl: !!this.config.authOptions?.redirectUrl,
      authUrl: this.config.authOptions?.authUrl,
    });

    // Use Phantom Connect authentication flow (redirect-based)
    // Store session before redirect so we can restore it after redirect
    const now = Date.now();
    const sessionId = generateSessionId();
    const tempSession = {
      sessionId: sessionId,
      walletId: `temp-${now}`, // Temporary ID, will be updated after redirect
      organizationId: organizationId,
      stamperInfo,
      authProvider: "phantom-connect",
      userInfo: { provider: authOptions?.provider },
      status: "pending" as const,
      createdAt: now,
      lastUsed: now,
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
      provider: authOptions?.provider,
      authUrl: this.config.authOptions?.authUrl,
    });

    // Start the authentication flow (this will redirect the user)
    await this.authProvider.authenticate({
      organizationId: organizationId,
      parentOrganizationId: this.config.organizationId,
      provider: authOptions?.provider as "google" | "apple" | undefined,
      redirectUrl: this.config.authOptions?.redirectUrl,
      customAuthData: authOptions?.customAuthData,
      authUrl: this.config.authOptions?.authUrl,
      sessionId: sessionId,
    });
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
    session.userInfo = { ...session.userInfo, ...authResult.userInfo };
    session.status = "completed";
    session.lastUsed = Date.now();
    await this.storage.saveSession(session);

    await this.initializeClientFromSession(session);

    return {
      walletId: this.walletId!,
      addresses: this.addresses,
      status: "completed",
    };
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
    });

    // Ensure stamper is initialized with existing keys
    if (!this.stamper.getKeyInfo()) {
      await this.stamper.init();
    }

    this.client = new PhantomClient(
      {
        apiBaseUrl: this.config.apiBaseUrl,
        organizationId: session.organizationId,
      },
      this.stamper,
    );

    this.walletId = session.walletId;

    // Get wallet addresses and filter by enabled address types with retry
    this.addresses = await this.getAndFilterWalletAddresses(session.walletId);
  }
}
