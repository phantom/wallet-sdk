import { EmbeddedProvider } from "./embedded-provider";
import type { EmbeddedProviderConfig } from "./types";
import type {
  PlatformAdapter,
  DebugLogger,
  Session,
  AuthResult,
  EmbeddedStorage,
  AuthProvider,
  URLParamsAccessor,
} from "./interfaces";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import { PhantomClient, generateKeyPair } from "@phantom/client";
import { NetworkId } from "@phantom/constants";

// Mock dependencies
jest.mock("@phantom/api-key-stamper");
jest.mock("@phantom/client");
jest.mock("@phantom/parsers", () => ({
  parseToKmsTransaction: jest.fn().mockResolvedValue({ parsed: "mock-base64url", originalFormat: "mock" }),
  parseSignMessageResponse: jest.fn().mockReturnValue({ signature: "mock-signature", rawSignature: "mock-raw" }),
  parseTransactionResponse: jest.fn().mockReturnValue({
    hash: "mock-transaction-hash",
    rawTransaction: "mock-raw-tx",
    blockExplorer: "https://explorer.com/tx/mock-transaction-hash"
  }),
  parseSolanaTransactionSignature: jest.fn().mockReturnValue({ signature: "mock-signature", fallback: false }),
}));

// Cast mocked functions for type safety
const mockedGenerateKeyPair = jest.mocked(generateKeyPair);
const mockedPhantomClient = jest.mocked(PhantomClient);

// Set up generateKeyPair mock
mockedGenerateKeyPair.mockReturnValue({
  publicKey: "11111111111111111111111111111111",
  secretKey: "test-secret-key",
});

// Helper function to create completed sessions with required timing fields
function createCompletedSession(overrides: Partial<Session> = {}): Session {
  const now = Date.now();
  return {
    sessionId: "test-session-id",
    walletId: "wallet-123",
    organizationId: "org-123",
    appId: "app-123",
    stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
    authProvider: "jwt",
    status: "completed",
    createdAt: now,
    lastUsed: now,
    authenticatorCreatedAt: now,
    authenticatorExpiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    lastRenewalAttempt: undefined,
    username: "test-user",
    ...overrides,
  };
}

// Helper function to create pending sessions with required timing fields
function createPendingSession(overrides: Partial<Session> = {}): Session {
  const now = Date.now();
  return {
    sessionId: "test-session-id",
    walletId: "temp-wallet",
    organizationId: "org-123",
    appId: "app-123",
    stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
    authProvider: "phantom-connect",
    status: "pending",
    createdAt: now,
    lastUsed: now,
    authenticatorCreatedAt: now,
    authenticatorExpiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    lastRenewalAttempt: undefined,
    username: "test-user",
    ...overrides,
  };
}

describe("EmbeddedProvider Auth Flows", () => {
  let provider: EmbeddedProvider;
  let config: EmbeddedProviderConfig;
  let mockPlatform: PlatformAdapter;
  let mockLogger: DebugLogger;
  let mockStorage: jest.Mocked<EmbeddedStorage>;
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockURLParamsAccessor: jest.Mocked<URLParamsAccessor>;
  let mockStamper: jest.Mocked<StamperWithKeyManagement>;
  let mockClient: jest.Mocked<PhantomClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset generateKeyPair mock
    mockedGenerateKeyPair.mockReturnValue({
      publicKey: "11111111111111111111111111111111",
      secretKey: "test-secret-key",
    });

    // Setup config
    config = {
      apiBaseUrl: "https://api.example.com",
      organizationId: "test-org-id",
      appId: "test-app-id",
      embeddedWalletType: "user-wallet",
      addressTypes: ["solana"],
      authOptions: {
        authUrl: "https://auth.example.com",
        redirectUrl: "https://app.example.com/callback",
      },
    };

    // Mock storage
    mockStorage = {
      getSession: jest.fn(),
      saveSession: jest.fn(),
      clearSession: jest.fn(),
      getShouldClearPreviousSession: jest.fn().mockResolvedValue(false),
      setShouldClearPreviousSession: jest.fn().mockResolvedValue(undefined),
    };

    // Mock auth provider
    mockAuthProvider = {
      authenticate: jest.fn(),
      resumeAuthFromRedirect: jest.fn(),
    };

    // Mock URL params accessor
    mockURLParamsAccessor = {
      getParam: jest.fn().mockReturnValue(null),
    };

    // Mock stamper
    mockStamper = {
      init: jest.fn().mockResolvedValue({ keyId: "test-key-id", publicKey: "11111111111111111111111111111111" }),
      sign: jest.fn().mockResolvedValue("mock-signature"),
      stamp: jest.fn().mockResolvedValue("mock-stamp"),
      getKeyInfo: jest.fn().mockReturnValue({ keyId: "test-key-id", publicKey: "11111111111111111111111111111111" }),
      resetKeyPair: jest
        .fn()
        .mockResolvedValue({ keyId: "test-key-id", publicKey: "11111111111111111111111111111111" }),
      clear: jest.fn().mockResolvedValue(undefined),
    };

    // Setup mock platform adapter
    mockPlatform = {
      name: "test-platform",
      storage: mockStorage,
      authProvider: mockAuthProvider,
      urlParamsAccessor: mockURLParamsAccessor,
      stamper: mockStamper,
    };

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    // Mock PhantomClient
    mockClient = {
      createOrganization: jest.fn(),
      createWallet: jest.fn(),
      getWalletAddresses: jest.fn(),
      ethereumSignMessage: jest.fn(),
      signRawPayload: jest.fn(),
      signAndSendTransaction: jest.fn(),
    } as any;
    mockedPhantomClient.mockImplementation(() => mockClient);

    provider = new EmbeddedProvider(config, mockPlatform, mockLogger);
  });

  describe("Google OAuth Flow", () => {
    it("should initiate redirect when connecting with provider google", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "google" });

      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          redirectUrl: config.authOptions?.redirectUrl,
        }),
      );
    });

    it("should save temporary session before google redirect", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "google" });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          authProvider: "google",
        }),
      );
    });

    it("should update session timestamp before google redirect to prevent race condition", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      const saveSpy = jest.spyOn(mockStorage, "saveSession");
      await provider.connect({ provider: "google" });

      // Should be called once for redirect flow (includes timestamp update before redirect)
      expect(saveSpy).toHaveBeenCalledTimes(1);
      const calls = saveSpy.mock.calls;
      expect(calls[0][0]).toMatchObject({
        lastUsed: expect.any(Number),
        status: "pending",
      });
    });
  });

  describe("Resume from Redirect Flow", () => {
    it("should resume connect from redirect with valid auth result", async () => {
      const authResult: AuthResult = {
        walletId: "wallet-123",
        provider: "google",
        accountDerivationIndex: 1,
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);

      const existingSession = createPendingSession();
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      const result = await provider.connect({ provider: "phantom" });

      expect(result.walletId).toBe("wallet-123");
      expect(result.addresses).toHaveLength(1);
    });

    it("should complete auth connection and update session with wallet ID from redirect", async () => {
      const authResult: AuthResult = {
        walletId: "wallet-123",
        provider: "google",
        accountDerivationIndex: 2,
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);

      const existingSession = createPendingSession();
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect({ provider: "google" });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: "wallet-123",
          status: "completed",
          authProvider: "google",
        }),
      );
    });

    it("should initialize client and fetch addresses after successful redirect resume", async () => {
      const authResult: AuthResult = {
        walletId: "wallet-123",
        organizationId: "org-123",
        provider: "google",
        accountDerivationIndex: 3,
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);

      const existingSession = createPendingSession();
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      await provider.connect({ provider: "google" });

      expect(PhantomClient).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-123",
        }),
        expect.any(Object),
      );
      expect(mockClient.getWalletAddresses).toHaveBeenCalledWith("wallet-123", undefined, 3);
    });
  });

  describe("Resume from Redirect - Invalid Session ID", () => {
    it("should handle resume connect from redirect but with invalid session id in URL", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      // Mock URL params accessor to return different session ID
      mockURLParamsAccessor.getParam.mockReturnValue("different-session-id");

      const existingSession: Session = {
        sessionId: "test-session-id",
        walletId: "temp-wallet",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
        authProvider: "google",
        status: "pending",
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "google" });

      expect(mockStorage.clearSession).toHaveBeenCalled();
    });

    it("should clear invalid session when URL session ID does not match stored session", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      // Mock URL params accessor to return different session ID
      mockURLParamsAccessor.getParam.mockReturnValue("different-session-id");

      const existingSession: Session = {
        sessionId: "test-session-id",
        walletId: "temp-wallet",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
        authProvider: "google",
        status: "pending",
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "google" });

      expect(mockStorage.clearSession).toHaveBeenCalled();
      // For user wallets, no organization is created locally (only for app wallets it should happen)
      expect(mockClient.createOrganization).not.toHaveBeenCalled();
    });

    it("should start fresh authentication flow when session ID mismatch detected", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      // Mock URL params accessor to return different session ID
      mockURLParamsAccessor.getParam.mockReturnValue("different-session-id");

      const existingSession: Session = {
        sessionId: "test-session-id",
        walletId: "temp-wallet",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
        authProvider: "google",
        status: "pending",
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "google" });

      // Should start fresh flow
      // For user wallets, no organization is created locally
      expect(mockClient.createOrganization).not.toHaveBeenCalled();
      expect(mockAuthProvider.authenticate).toHaveBeenCalled();
    });
  });

  describe("Resume from Redirect - Missing Local Session", () => {
    it("should handle resume connect from redirect but we do not have a local session stored", async () => {
      const authResult: AuthResult = {
        walletId: "wallet-123",
        organizationId: "server-org-id",
        provider: "google",
        accountDerivationIndex: 4,
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);
      mockStorage.getSession.mockResolvedValue(null);

      // This should fall back to fresh authentication instead of throwing
      const result = await provider.connect({ provider: "google" });
      expect(result.status).toBe("pending"); // Should successfully start fresh auth flow
    });

    it("should fall back to fresh authentication when no session found after redirect during manual connect", async () => {
      const authResult: AuthResult = {
        walletId: "wallet-123",
        organizationId: "server-org-id",
        provider: "google",
        accountDerivationIndex: 5,
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);
      mockStorage.getSession.mockResolvedValue(null);

      // Setup fresh auth flow to succeed after fallback
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      // Should NOT throw an error, instead it should fall back to fresh auth
      await provider.connect({ provider: "google" });

      // Should have attempted to resume auth from redirect (and failed silently due to missing session)
      expect(mockAuthProvider.resumeAuthFromRedirect).toHaveBeenCalled();

      // Should have cleared session after the redirect resume failure
      expect(mockStorage.clearSession).toHaveBeenCalled();

      // Should fall back to fresh auth flow when redirect resume fails
      // For user wallets, we don't create organization anymore - auth returns organizationId
      expect(mockClient.createOrganization).not.toHaveBeenCalled();
      expect(mockAuthProvider.authenticate).toHaveBeenCalled();
    });

   

    it("should fall back to fresh authentication when session is missing from database but URL has session_id", async () => {
      // Setup: URL contains session_id parameter (session was wiped from DB)
      mockURLParamsAccessor.getParam.mockReturnValue("wiped-session-123");

      // Setup: resumeAuthFromRedirect returns auth result (detects parameters)
      const authResult: AuthResult = {
        walletId: "wallet-from-url-123",
        provider: "google",
        accountDerivationIndex: 0,
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);

      // Setup: No session exists in storage (was wiped from database)
      // This affects both tryExistingConnection AND completeAuthConnection
      mockStorage.getSession.mockResolvedValue(null);

      // Setup: Fresh auth flow should succeed after fallback
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      // This should NOT throw an error, instead it should fall back to fresh auth
      // The tryExistingConnection should catch the error from completeAuthConnection and return null
      // Then connect() should proceed with fresh auth flow
      await provider.connect({ provider: "google" });

      // Should have attempted to resume auth from redirect (and failed silently due to missing session)
      expect(mockAuthProvider.resumeAuthFromRedirect).toHaveBeenCalled();

      // Should have cleared session after the redirect resume failure
      expect(mockStorage.clearSession).toHaveBeenCalled();

      // Should fall back to fresh auth flow when redirect resume fails
      // For user wallets, we don't create organization anymore - auth returns organizationId
      expect(mockClient.createOrganization).not.toHaveBeenCalled();
      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          publicKey: "11111111111111111111111111111111",
          appId: "test-app-id",
        }),
      );

      // Should save new session with pending status for redirect flow
      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          authProvider: "google",
        }),
      );
    });
  });

  describe.skip("App Wallet Flow", () => {
    beforeEach(() => {
      config.embeddedWalletType = "app-wallet";
      provider = new EmbeddedProvider(config, mockPlatform, mockLogger);
    });

    it("should create app wallet directly without authentication", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });
      mockClient.createWallet.mockResolvedValue({ walletId: "app-wallet-123" });
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      // Set up storage mock to return null initially, then return the saved session
      let savedSession: Session | null = null;
      mockStorage.getSession.mockImplementation(() => Promise.resolve(savedSession));
      mockStorage.saveSession.mockImplementation((session: Session) => {
        savedSession = session;
        return Promise.resolve();
      });

      const result = await provider.connect({ provider: "phantom" });

      expect(mockClient.createWallet).toHaveBeenCalled();
      expect(result.walletId).toBe("app-wallet-123");
      // Should not call authentication methods
      expect(mockAuthProvider.authenticate).not.toHaveBeenCalled();
    });

    it("should generate keypair and organization for app wallet", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });
      mockClient.createWallet.mockResolvedValue({ walletId: "app-wallet-123" });
      mockClient.getWalletAddresses.mockResolvedValue([]);

      // Set up storage mock to return null initially, then return the saved session
      let savedSession: Session | null = null;
      mockStorage.getSession.mockImplementation(() => Promise.resolve(savedSession));
      mockStorage.saveSession.mockImplementation((session: Session) => {
        savedSession = session;
        return Promise.resolve();
      });

      await provider.connect({ provider: "google" });

      expect(mockClient.createOrganization).toHaveBeenCalledWith(
        expect.stringContaining("test-org-id-"),
        expect.arrayContaining([
          expect.objectContaining({
            username: expect.stringContaining("user-"),
            role: "ADMIN",
            authenticators: expect.arrayContaining([
              expect.objectContaining({
                authenticatorName: expect.stringContaining("auth-"),
                authenticatorKind: "keypair",
                publicKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                algorithm: "Ed25519",
              }),
            ]),
          }),
        ]),
      );
    });

    it("should save completed session immediately for app wallet", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });
      mockClient.createWallet.mockResolvedValue({ walletId: "app-wallet-123" });
      mockClient.getWalletAddresses.mockResolvedValue([]);

      // Set up storage mock to return null initially, then return the saved session
      let savedSession: Session | null = null;
      mockStorage.getSession.mockImplementation(() => Promise.resolve(savedSession));
      mockStorage.saveSession.mockImplementation((session: Session) => {
        savedSession = session;
        return Promise.resolve();
      });

      await provider.connect({ provider: "google" });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: "app-wallet-123",
          status: "completed",
          authProvider: "app-wallet",
        }),
      );
    });

    it("should fetch wallet addresses after app wallet creation", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });
      mockClient.createWallet.mockResolvedValue({ walletId: "app-wallet-123" });
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      // Set up storage mock to return null initially, then return the saved session
      let savedSession: Session | null = null;
      mockStorage.getSession.mockImplementation(() => Promise.resolve(savedSession));
      mockStorage.saveSession.mockImplementation((session: Session) => {
        savedSession = session;
        return Promise.resolve();
      });

      const result = await provider.connect({ provider: "phantom" });

      expect(mockClient.getWalletAddresses).toHaveBeenCalledWith("app-wallet-123", undefined, 0);
      expect(result.addresses).toHaveLength(1);
    });
  });

  describe("JWT Authentication Flow", () => {
    it("should authenticate with valid JWT token", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      // Set up storage mock to return null initially, then return the saved session
      let savedSession: Session | null = null;
      mockStorage.getSession.mockImplementation(() => Promise.resolve(savedSession));
      mockStorage.saveSession.mockImplementation((session: Session) => {
        savedSession = session;
        return Promise.resolve();
      });

      // Mock the core provider's JWT auth by directly mocking the jwtAuth.authenticate call
      const mockJWTAuth = {
        authenticate: jest.fn().mockResolvedValue({
          walletId: "jwt-wallet-123",
          organizationId: "server-org-id", // JWT auth returns organizationId from server
          provider: "jwt",
        }),
      };

      // Replace the jwtAuth instance in the provider
      (provider as any).jwtAuth = mockJWTAuth;

      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      const result = await provider.connect({
        provider: "jwt",
        jwtToken: "valid-jwt-token",
      });

      expect(mockJWTAuth.authenticate).toHaveBeenCalledWith({
        publicKey: "11111111111111111111111111111111", // JWT auth now gets publicKey
        appId: "test-app-id",
        jwtToken: "valid-jwt-token",
      });
      expect(result.walletId).toBe("jwt-wallet-123");
    });

    it("should create completed session after successful JWT auth", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      // Set up storage mock to return null initially, then return the saved session
      let savedSession: Session | null = null;
      mockStorage.getSession.mockImplementation(() => Promise.resolve(savedSession));
      mockStorage.saveSession.mockImplementation((session: Session) => {
        savedSession = session;
        return Promise.resolve();
      });

      // Mock JWT auth
      const mockJWTAuth = {
        authenticate: jest.fn().mockResolvedValue({
          walletId: "jwt-wallet-123",
          organizationId: "server-org-id",
          provider: "jwt",
        }),
      };
      (provider as any).jwtAuth = mockJWTAuth;

      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect({
        provider: "jwt",
        jwtToken: "valid-jwt-token",
      });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: "jwt-wallet-123",
          status: "completed",
          authProvider: "jwt",
        }),
      );
    });

    it("should validate JWT token is present before attempting auth", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);

      await expect(
        provider.connect({
          provider: "jwt",
          // Missing jwtToken
        }),
      ).rejects.toThrow("JWT token is required when using JWT authentication");
    });

    it("should throw error when JWT token is missing for JWT provider", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);

      await expect(
        provider.connect({
          provider: "jwt",
        }),
      ).rejects.toThrow("JWT token is required when using JWT authentication");
    });

    it("should handle JWT authentication failure gracefully", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      // Mock JWT auth to throw error
      const mockJWTAuth = {
        authenticate: jest.fn().mockRejectedValue(new Error("Invalid JWT token")),
      };
      (provider as any).jwtAuth = mockJWTAuth;

      await expect(
        provider.connect({
          provider: "jwt",
          jwtToken: "invalid-jwt-token",
        }),
      ).rejects.toThrow("JWT Authentication error: Invalid JWT token");
    });
  });

  describe("Apple OAuth Flow", () => {
    it("should initiate redirect when connecting with provider apple", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "apple" });

      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "apple",
          redirectUrl: config.authOptions?.redirectUrl,
        }),
      );
    });

    it("should save temporary session before apple redirect", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "apple" });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          authProvider: "apple",
        }),
      );
    });

    it("should update session timestamp before apple redirect to prevent race condition", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      const saveSpy = jest.spyOn(mockStorage, "saveSession");
      await provider.connect({ provider: "apple" });

      // Should be called once for redirect flow (includes timestamp update before redirect)
      expect(saveSpy).toHaveBeenCalledTimes(1);
      const calls = saveSpy.mock.calls;
      expect(calls[0][0]).toMatchObject({
        lastUsed: expect.any(Number),
        status: "pending",
      });
    });
  });

  describe("Default Phantom Connect Flow", () => {
    it("should initiate phantom connect redirect when no specific provider given", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "google" });

      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          redirectUrl: config.authOptions?.redirectUrl,
        }),
      );
    });

    it("should save temporary session before phantom connect redirect", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "google" });

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          authProvider: "google",
        }),
      );
    });

    it("should handle phantom connect authentication flow", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      await provider.connect({ provider: "google" });

      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: "11111111111111111111111111111111",
          appId: "test-app-id",
          sessionId: expect.any(String),
        }),
      );

      // For user wallets, we don't create organization - auth provider should handle that
      expect(mockClient.createOrganization).not.toHaveBeenCalled();
    });
  });

  describe("Session Validation Edge Cases", () => {
    it("should clear session when status is pending but no sessionId in URL", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      // Mock URL params accessor to return null (no sessionId in URL)
      mockURLParamsAccessor.getParam.mockReturnValue(null);

      const existingSession: Session = {
        sessionId: "test-session-id",
        walletId: "temp-wallet",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
        authProvider: "google",
        status: "pending", // Started but no URL sessionId
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      await provider.connect({ provider: "google" });

      expect(mockStorage.clearSession).toHaveBeenCalled();
    });

    it("should validate existing completed sessions without modification", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const completedSession = createCompletedSession();
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      const result = await provider.connect({ provider: "phantom" });

      expect(mockStorage.clearSession).not.toHaveBeenCalled();
      expect(result.walletId).toBe("wallet-123");
    });

    it("should handle concurrent session operations safely", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const completedSession = createCompletedSession();
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockClient.getWalletAddresses.mockResolvedValue([]);

      // Simulate concurrent calls
      const promise1 = provider.connect({ provider: "phantom" });
      const promise2 = provider.connect({ provider: "phantom" });

      const results = await Promise.all([promise1, promise2]);

      expect(results[0].walletId).toBe("wallet-123");
      expect(results[1].walletId).toBe("wallet-123");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors during authentication gracefully", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.authenticate.mockRejectedValue(new Error("network timeout"));

      await expect(provider.connect({ provider: "google" })).rejects.toThrow(/network/i);
    });

    it("should provide specific error messages for different failure types", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.authenticate.mockRejectedValue(new Error("IndexedDB access denied"));

      await expect(provider.connect({ provider: "google" })).rejects.toThrow("Storage error: Unable to access browser storage. Please ensure storage is available and try again.");
    });

    it("should clean up state on authentication failures", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockStorage.getSession.mockResolvedValue(null);
      mockClient.createOrganization.mockResolvedValue({ organizationId: "new-org-id" });

      // Mock JWT auth to succeed but getWalletAddresses to fail
      const mockJWTAuth = {
        authenticate: jest.fn().mockResolvedValue({
          walletId: "jwt-wallet-123",
          provider: "jwt",
        }),
      };
      (provider as any).jwtAuth = mockJWTAuth;

      // Make getWalletAddresses fail consistently to trigger cleanup
      mockClient.getWalletAddresses
        .mockRejectedValueOnce(new Error("Wallet not found"))
        .mockRejectedValueOnce(new Error("Wallet not found"))
        .mockRejectedValueOnce(new Error("Wallet not found"));

      try {
        await provider.connect({ provider: "jwt", jwtToken: "test-token" });
      } catch (error) {
        // Expected to fail after retries
      }

      // Should have attempted to clear session during cleanup in getAndFilterWalletAddresses
      expect(mockStorage.clearSession).toHaveBeenCalled();
    });
  });

  describe("Provider State Management", () => {
    it("should return correct connection status", () => {
      expect(provider.isConnected()).toBe(false);

      // Mock connected state
      (provider as any).client = mockClient;
      (provider as any).walletId = "test-wallet-id";

      expect(provider.isConnected()).toBe(true);
    });

    it("should return addresses when connected", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const completedSession = createCompletedSession();
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      await provider.connect({ provider: "google" });

      const addresses = provider.getAddresses();
      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toBe("test-address");
    });

    it("should clear state on disconnect", async () => {
      // Connect first
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      const completedSession = createCompletedSession();
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.connect({ provider: "google" });
      expect(provider.isConnected()).toBe(true);

      // Disconnect
      await provider.disconnect();

      expect(mockStorage.clearSession).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
      expect(provider.getAddresses()).toHaveLength(0);
    });
  });

  describe("AutoConnect Flow", () => {
    it("should silently fail when no session exists", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      // autoConnect should not throw errors, it should fail silently
      await expect(provider.autoConnect()).resolves.toBeUndefined();
    });

    it("should connect using existing completed session", async () => {
      const completedSession = createCompletedSession();
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      await provider.autoConnect();

      expect(provider.isConnected()).toBe(true);
      expect(mockClient.getWalletAddresses).toHaveBeenCalledWith("wallet-123", undefined, 0);
    });

    it("should resume from redirect during autoConnect", async () => {
      const authResult: AuthResult = {
        walletId: "wallet-from-redirect-123",
        provider: "google",
        accountDerivationIndex: 7,
      };
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(authResult);

      const existingSession = createPendingSession();
      mockStorage.getSession.mockResolvedValue(existingSession);
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      await provider.autoConnect();

      expect(provider.isConnected()).toBe(true);
      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: "wallet-from-redirect-123",
          status: "completed",
          authProvider: "google",
        }),
      );
    });

    it("should clear invalid pending session without redirect context", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockURLParamsAccessor.getParam.mockReturnValue(null);

      const pendingSession: Session = {
        sessionId: "test-session-id",
        walletId: "temp-wallet",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
        authProvider: "google",
        status: "pending",
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(pendingSession);

      await provider.autoConnect();

      expect(mockStorage.clearSession).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
    });

    it("should handle session ID mismatch during autoConnect", async () => {
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockURLParamsAccessor.getParam.mockReturnValue("different-session-id");

      const pendingSession: Session = {
        sessionId: "original-session-id",
        walletId: "temp-wallet",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
        authProvider: "google",
        status: "pending",
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      mockStorage.getSession.mockResolvedValue(pendingSession);

      await provider.autoConnect();

      expect(mockStorage.clearSession).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
    });

    it("should update session timestamp on successful autoConnect", async () => {
      const originalTimestamp = Date.now() - 60000; // 1 minute ago
      const completedSession = createCompletedSession({
        createdAt: originalTimestamp,
        lastUsed: originalTimestamp,
      });
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.getWalletAddresses.mockResolvedValue([]);

      await provider.autoConnect();

      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUsed: expect.any(Number),
          walletId: "wallet-123",
          status: "completed",
        }),
      );

      // Verify the timestamp was updated (should be more recent than original)
      const savedSession = mockStorage.saveSession.mock.calls[0][0];
      expect(savedSession.lastUsed).toBeGreaterThan(originalTimestamp);
    });

    it("should emit connect_start event at beginning of autoConnect", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const connectStartSpy = jest.fn();
      provider.on("connect_start", connectStartSpy);

      await provider.autoConnect();

      expect(connectStartSpy).toHaveBeenCalledWith({ source: "auto-connect" });
    });

    it("should emit connect event on successful autoConnect with existing session", async () => {
      const completedSession = createCompletedSession();
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      const connectSpy = jest.fn();
      provider.on("connect", connectSpy);

      await provider.autoConnect();

      expect(connectSpy).toHaveBeenCalledWith({
        walletId: "wallet-123",
        addresses: [{ addressType: "solana", address: "test-address" }],
        status: "completed",
        providerType: "embedded",
        source: "existing-session",
      });
    });

    it("should emit connect_error event when autoConnect fails silently", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const connectErrorSpy = jest.fn();
      provider.on("connect_error", connectErrorSpy);

      await provider.autoConnect();

      expect(connectErrorSpy).toHaveBeenCalledWith({
        error: "No valid session found",
        source: "auto-connect",
      });
    });

    it("should handle errors during autoConnect gracefully", async () => {
      const completedSession = createCompletedSession();
      mockStorage.getSession.mockResolvedValue(completedSession);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      // Mock getWalletAddresses to fail consistently
      mockClient.getWalletAddresses
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      const connectErrorSpy = jest.fn();
      provider.on("connect_error", connectErrorSpy);

      await provider.autoConnect();

      expect(connectErrorSpy).toHaveBeenCalledWith({
        error: "Network error",
        source: "auto-connect",
      });
      expect(provider.isConnected()).toBe(false);
    });

    it("should not call authProvider.authenticate during autoConnect", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      await provider.autoConnect();

      // autoConnect should never try to start new authentication flows
      expect(mockAuthProvider.authenticate).not.toHaveBeenCalled();
    });

    it("should handle missing resumeAuthFromRedirect method gracefully", async () => {
      mockStorage.getSession.mockResolvedValue(null);
      // Remove resumeAuthFromRedirect from authProvider
      delete (mockAuthProvider as any).resumeAuthFromRedirect;

      await expect(provider.autoConnect()).resolves.toBeUndefined();
    });

    it.skip("should work with app-wallet sessions during autoConnect", async () => {
      config.embeddedWalletType = "app-wallet";
      provider = new EmbeddedProvider(config, mockPlatform, mockLogger);

      const appWalletSession = createCompletedSession({
        walletId: "app-wallet-123",
        authProvider: "app-wallet",
        userInfo: { embeddedWalletType: "app-wallet" },
      });
      mockStorage.getSession.mockResolvedValue(appWalletSession);
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      await provider.autoConnect();

      expect(provider.isConnected()).toBe(true);
      expect(mockClient.getWalletAddresses).toHaveBeenCalledWith("app-wallet-123", undefined, 0);
    });

    it("should use completed session during autoConnect even when session_id parameters exist in URL", async () => {
      // Setup: completed session exists in storage
      const completedSession = createCompletedSession({
        sessionId: "existing-session-123",
        walletId: "wallet-existing-123",
      });
      mockStorage.getSession.mockResolvedValue(completedSession);

      // Setup: URL contains session_id parameter (from old redirect)
      mockURLParamsAccessor.getParam.mockReturnValue("old-session-456");

      // Setup: resumeAuthFromRedirect returns null (no active redirect)
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);

      mockClient.getWalletAddresses.mockResolvedValue([{ addressType: "solana", address: "test-address" }]);

      await provider.autoConnect();

      // Should use the existing completed session, not attempt redirect resume
      expect(provider.isConnected()).toBe(true);
      expect(mockClient.getWalletAddresses).toHaveBeenCalledWith("wallet-existing-123", undefined, 0);

      // Should not clear or modify the existing completed session
      expect(mockStorage.clearSession).not.toHaveBeenCalled();

      // Should update session timestamp but keep same walletId
      expect(mockStorage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "existing-session-123",
          walletId: "wallet-existing-123",
          status: "completed",
          lastUsed: expect.any(Number),
        }),
      );
    });
  });

  describe("Message and Transaction Signing", () => {
    beforeEach(async () => {
      // Set up a connected state
      mockAuthProvider.resumeAuthFromRedirect.mockReturnValue(null);
      const completedSession = createCompletedSession();

      // Set up storage mock to track the session properly
      let savedSession: Session | null = completedSession;
      mockStorage.getSession.mockImplementation(() => Promise.resolve(savedSession));
      mockStorage.saveSession.mockImplementation((session: Session) => {
        savedSession = session;
        return Promise.resolve();
      });

      mockClient.getWalletAddresses.mockResolvedValue([]);
      await provider.connect({ provider: "google" });
    });

    it("should sign messages when connected", async () => {
      mockClient.signRawPayload.mockResolvedValue("signed-message-signature");

      const result = await provider.signMessage({
        message: "test message",
        networkId: NetworkId.SOLANA_MAINNET,
      });

      expect(mockClient.signRawPayload).toHaveBeenCalledWith({
        walletId: "wallet-123",
        message: expect.any(String),
        networkId: NetworkId.SOLANA_MAINNET,
        derivationIndex: 0,
      });
      expect(result.signature).toBeDefined();
      expect(typeof result.blockExplorer === "string" || result.blockExplorer === undefined).toBe(true);
    });

    it("should throw error when signing message while not connected", async () => {
      await provider.disconnect();

      await expect(
        provider.signMessage({
          message: "test message",
          networkId: NetworkId.SOLANA_MAINNET,
        }),
      ).rejects.toThrow("Not connected");
    });

    it("should sign and send transactions when connected", async () => {
      mockClient.signAndSendTransaction.mockResolvedValue({
        rawTransaction: "base64url-raw-transaction-data",
        hash: "transaction-hash",
      });

      const result = await provider.signAndSendTransaction({
        transaction: "base64-encoded-transaction",
        networkId: NetworkId.SOLANA_MAINNET,
      });

      expect(mockClient.signAndSendTransaction).toHaveBeenCalledWith({
        walletId: "wallet-123",
        transaction: expect.any(String),
        networkId: NetworkId.SOLANA_MAINNET,
        derivationIndex: 0,
      });
      expect(result.hash).toBeDefined();
      expect(typeof result.blockExplorer === "string" || result.blockExplorer === undefined).toBe(true);
    });

    it("should throw error when signing transaction while not connected", async () => {
      await provider.disconnect();

      await expect(
        provider.signAndSendTransaction({
          transaction: "base64-encoded-transaction",
          networkId: NetworkId.SOLANA_MAINNET,
        }),
      ).rejects.toThrow("Not connected");
    });
  });
});
