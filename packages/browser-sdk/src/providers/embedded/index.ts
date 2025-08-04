import { PhantomClient, generateKeyPair } from "@phantom/client";
import type { AddressType } from "@phantom/client";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import type {
  Provider,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignedTransaction,
  WalletAddress,
  AuthOptions,
} from "../../types";
import { IndexedDBStorage } from "./storage";
import { PhantomConnectAuth, JWTAuth } from "./auth";
import { parseMessage, parseTransaction } from "@phantom/parsers";
import { debug, DebugCategory } from "../../debug";

export interface EmbeddedProviderConfig {
  apiBaseUrl: string;
  organizationId: string;
  authOptions?: {
    authUrl?: string;
    redirectUrl?: string;
  };
  embeddedWalletType: "app-wallet" | "user-wallet";
  addressTypes: AddressType[];
  solanaProvider: "web3js" | "kit";
}

export class EmbeddedProvider implements Provider {
  private config: EmbeddedProviderConfig;
  private storage: IndexedDBStorage;
  private client: PhantomClient | null = null;
  private walletId: string | null = null;
  private addresses: WalletAddress[] = [];

  constructor(config: EmbeddedProviderConfig) {
    debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Initializing EmbeddedProvider', { config });
    this.config = config;
    this.storage = new IndexedDBStorage();
    // Store solana provider config (unused for now)
    config.solanaProvider;
    debug.info(DebugCategory.EMBEDDED_PROVIDER, 'EmbeddedProvider initialized');
  }

  async connect(authOptions?: AuthOptions): Promise<ConnectResult> {
    try {
      debug.info(DebugCategory.EMBEDDED_PROVIDER, 'Starting embedded provider connect', { 
        authOptions: authOptions ? { 
          provider: authOptions.provider, 
          hasJwtToken: !!authOptions.jwtToken
        } : undefined 
      });

      // First, check if we're resuming from a redirect
      debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Checking for redirect resume');
      const authResult = PhantomConnectAuth.resumeAuthFromRedirect();
      if (authResult) {
        debug.info(DebugCategory.EMBEDDED_PROVIDER, 'Resuming from redirect', { 
          walletId: authResult.walletId,
          provider: authResult.provider 
        });
        return this.completeAuthConnection(authResult);
      }

      debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Getting existing session');
      let session = await this.storage.getSession();

      // Check for session status and URL mismatch
      if (session) {
        debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Found existing session, validating', {
          sessionId: session.sessionId,
          status: session.status,
          walletId: session.walletId
        });

        // If session is not completed, check if we're in the right context
        if (session.status !== "completed") {
          const urlParams = new URLSearchParams(window.location.search);
          const urlSessionId = urlParams.get("sessionId");
          
          // If we have a started session but no sessionId in URL, this is a mismatch
          if (session.status === "started" && !urlSessionId) {
            debug.warn(DebugCategory.EMBEDDED_PROVIDER, 'Session mismatch detected - started session without redirect context', {
              sessionId: session.sessionId,
              status: session.status
            });
            // Clear the invalid session and start fresh
            await this.storage.clearSession();
            session = null;
          }
          // If sessionId in URL doesn't match stored session, clear invalid session
          else if (urlSessionId && urlSessionId !== session.sessionId) {
            debug.warn(DebugCategory.EMBEDDED_PROVIDER, 'Session ID mismatch detected', {
              storedSessionId: session.sessionId,
              urlSessionId: urlSessionId
            });
            await this.storage.clearSession();
            session = null;
          }
        }
      }

      // Validate auth options if provided
      if (authOptions) {
        if (authOptions.provider && !["google", "apple", "jwt"].includes(authOptions.provider)) {
          throw new Error(`Invalid auth provider: ${authOptions.provider}. Must be "google", "apple", or "jwt"`);
        }

        if (authOptions.provider === "jwt" && !authOptions.jwtToken) {
          throw new Error("JWT token is required when using JWT authentication");
        }
      }

      // If no session exists, create new one
      if (!session) {
        debug.info(DebugCategory.EMBEDDED_PROVIDER, 'No existing session, creating new one');
        
        // Generate keypair using PhantomClient
        debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Generating keypair');
        const keypair = generateKeyPair();
        debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Keypair generated', { publicKey: keypair.publicKey });

        // Create a temporary client with the keypair
        debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Creating temporary PhantomClient');
        const stamper = new ApiKeyStamper({
          apiSecretKey: keypair.secretKey,
        });

        const tempClient = new PhantomClient(
          {
            apiBaseUrl: this.config.apiBaseUrl,
          },
          stamper,
        );

        // Create an organization
        // organization name is a combination of this organizationId and this userId, which will be a unique identifier
        const uid = Date.now(); // for now
        const organizationName = `${this.config.organizationId}-${uid}`;
        debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Creating organization', { organizationName });
         const { organizationId } = await tempClient.createOrganization(organizationName, keypair);
        debug.info(DebugCategory.EMBEDDED_PROVIDER, 'Organization created', { organizationId });

        let walletId: string;

        if (this.config.embeddedWalletType === "user-wallet") {
          debug.info(DebugCategory.EMBEDDED_PROVIDER, 'Creating user-wallet, routing authentication', {
            authProvider: authOptions?.provider || 'phantom-connect'
          });

          // Route to appropriate authentication flow based on authOptions
          if (authOptions?.provider === "jwt") {
            debug.info(DebugCategory.EMBEDDED_PROVIDER, 'Using JWT authentication flow');
            
            // Use JWT authentication flow
            if (!authOptions.jwtToken) {
              debug.error(DebugCategory.EMBEDDED_PROVIDER, 'JWT token missing for JWT authentication');
              throw new Error("JWT token is required for JWT authentication");
            }

            const jwtAuth = new JWTAuth();
            debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Starting JWT authentication');
            const authResult = await jwtAuth.authenticate({
              organizationId: organizationId,
              parentOrganizationId: this.config.organizationId,
              jwtToken: authOptions.jwtToken,
              customAuthData: authOptions.customAuthData,
            });
            walletId = authResult.walletId;
            debug.info(DebugCategory.EMBEDDED_PROVIDER, 'JWT authentication completed', { walletId });

            // Save session with auth info
            const now = Date.now();
            session = {
              sessionId: PhantomConnectAuth.generateSessionId(),
              walletId: walletId,
              organizationId: this.config.organizationId,
              keypair,
              authProvider: authResult.provider,
              userInfo: authResult.userInfo,
              status: "completed",
              createdAt: now,
              lastUsed: now,
            };
            debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Saving JWT session');
            await this.storage.saveSession(session);
          } else {
            debug.info(DebugCategory.EMBEDDED_PROVIDER, 'Using Phantom Connect authentication flow (redirect-based)', {
              provider: authOptions?.provider,
              hasRedirectUrl: !!this.config.authOptions?.redirectUrl,
              authUrl: this.config.authOptions?.authUrl
            });

            // Use Phantom Connect authentication flow (redirect-based)
            // Store session before redirect so we can restore it after redirect
            const now = Date.now();
            const sessionId = PhantomConnectAuth.generateSessionId();
            const tempSession = {
              sessionId: sessionId,
              walletId: `temp-${now}`, // Temporary ID, will be updated after redirect
              organizationId: organizationId,
              keypair,
              authProvider: "phantom-connect",
              userInfo: { provider: authOptions?.provider },
              status: "started" as const,
              createdAt: now,
              lastUsed: now,
            };
            debug.debug(DebugCategory.EMBEDDED_PROVIDER, 'Saving temporary session before redirect', { 
              sessionId: tempSession.sessionId,
              tempWalletId: tempSession.walletId 
            });
            await this.storage.saveSession(tempSession);

            const phantomConnectAuth = new PhantomConnectAuth();

            debug.info(DebugCategory.EMBEDDED_PROVIDER, 'Starting Phantom Connect redirect', {
              organizationId,
              parentOrganizationId: this.config.organizationId,
              provider: authOptions?.provider,
              authUrl: this.config.authOptions?.authUrl
            });

            // Start the authentication flow (this will redirect the user)
            phantomConnectAuth.authenticate({
              organizationId: organizationId,
              parentOrganizationId: this.config.organizationId,
              provider: authOptions?.provider as "google" | "apple" | undefined,
              redirectUrl: this.config.authOptions?.redirectUrl,
              customAuthData: authOptions?.customAuthData,
              authUrl: this.config.authOptions?.authUrl,
              sessionId: sessionId,
            });
            
          }
        } else {
          // Create app-wallet directly
          const wallet = await tempClient.createWallet(`Wallet ${Date.now()}`);
          walletId = wallet.walletId;

          // Save session with app-wallet info
          const now = Date.now();
          session = {
            sessionId: PhantomConnectAuth.generateSessionId(),
            walletId: walletId,
            organizationId: this.config.organizationId,
            keypair,
            authProvider: "app-wallet",
            userInfo: { embeddedWalletType: this.config.embeddedWalletType },
            status: "completed",
            createdAt: now,
            lastUsed: now,
          };
          await this.storage.saveSession(session);
        }
      }

      // Update session last used timestamp
      session!.lastUsed = Date.now();
      await this.storage.saveSession(session!);

      // Create client from session
      const stamper = new ApiKeyStamper({
        apiSecretKey: session!.keypair.secretKey,
      });

      this.client = new PhantomClient(
        {
          apiBaseUrl: this.config.apiBaseUrl,
          organizationId: session!.organizationId,
        },
        stamper,
      );

      this.walletId = session!.walletId;

      // Get wallet addresses and filter by enabled address types
      const addresses = await this.client.getWalletAddresses(session!.walletId);
      this.addresses = addresses
        .filter(addr => this.config.addressTypes.some(type => type === addr.addressType))
        .map(addr => ({
          addressType: addr.addressType as AddressType,
          address: addr.address,
        }));

      return {
        walletId: this.walletId,
        addresses: this.addresses,
      };
    } catch (error) {
      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        // Check for specific error types and provide better error messages
        if (error.message.includes("IndexedDB") || error.message.includes("storage")) {
          throw new Error("Storage error: Unable to access browser storage. Please ensure storage is available and try again.");
        }

        if (error.message.includes("network") || error.message.includes("fetch")) {
          throw new Error("Network error: Unable to connect to authentication server. Please check your internet connection and try again.");
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

  async signMessage(params: SignMessageParams): Promise<string> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Parse message to base64url format for client
    const parsedMessage = parseMessage(params.message);

    return await this.client.signMessage({
      walletId: this.walletId,
      message: parsedMessage.base64url,
      networkId: params.networkId,
    });
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Parse transaction to base64url format for client based on network
    const parsedTransaction = await parseTransaction(params.transaction, params.networkId);

    return await this.client.signAndSendTransaction({
      walletId: this.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
    });
  }

  getAddresses(): WalletAddress[] {
    return this.addresses;
  }

  isConnected(): boolean {
    return this.client !== null && this.walletId !== null;
  }

  private async completeAuthConnection(authResult: { walletId: string; provider?: string; userInfo?: Record<string, any> }): Promise<ConnectResult> {
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

    // Create client from existing session
    const stamper = new ApiKeyStamper({
      apiSecretKey: session.keypair.secretKey,
    });

    this.client = new PhantomClient(
      {
        apiBaseUrl: this.config.apiBaseUrl,
        organizationId: session.organizationId,
      },
      stamper,
    );

    this.walletId = authResult.walletId;

    // Get wallet addresses and filter by enabled address types
    const addresses = await this.client.getWalletAddresses(authResult.walletId);
    this.addresses = addresses
      .filter(addr => this.config.addressTypes.some(type => type === addr.addressType))
      .map(addr => ({
        addressType: addr.addressType as AddressType,
        address: addr.address,
      }));

    return {
      walletId: this.walletId,
      addresses: this.addresses,
    };
  }
}
