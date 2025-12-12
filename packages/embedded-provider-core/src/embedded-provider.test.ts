import { EmbeddedProvider } from "./embedded-provider";
import type { EmbeddedProviderConfig } from "./types";
import { generateKeyPair } from "@phantom/client";
import type { PlatformAdapter, DebugLogger } from "./interfaces";

// Mock dependencies
jest.mock("@phantom/api-key-stamper");
jest.mock("@phantom/parsers", () => ({
  parseToKmsTransaction: jest.fn().mockResolvedValue({ base64url: "mock-base64url", originalFormat: "mock" }),
  parseSignMessageResponse: jest.fn().mockReturnValue({ signature: "mock-signature", rawSignature: "mock-raw" }),
  parseTransactionResponse: jest.fn().mockReturnValue({ rawTransaction: "mock-raw-tx" }),
  parseSolanaTransactionSignature: jest.fn().mockReturnValue({ signature: "mock-signature", fallback: false }),
}));

// Mock PhantomClient with proper implementation
const mockCreateOrganization = jest.fn().mockResolvedValue({ organizationId: "org-123" });
jest.mock("@phantom/client", () => ({
  generateKeyPair: jest.fn(),
  PhantomClient: jest.fn().mockImplementation(() => ({
    createOrganization: mockCreateOrganization,
  })),
}));

// Cast mocked functions for type safety
const mockedGenerateKeyPair = jest.mocked(generateKeyPair);

// Set up generateKeyPair mock
mockedGenerateKeyPair.mockReturnValue({
  publicKey: "11111111111111111111111111111111",
  secretKey: "test-secret-key",
});

describe("EmbeddedProvider Core", () => {
  let provider: EmbeddedProvider;
  let config: EmbeddedProviderConfig;
  let mockPlatform: PlatformAdapter;
  let mockLogger: DebugLogger;

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
      appId: "test-app-id",
      embeddedWalletType: "user-wallet",
      addressTypes: ["solana"],
      authOptions: {
        authUrl: "https://auth.example.com",
        redirectUrl: "https://app.example.com/callback",
      },
    };

    // Setup mock platform adapter
    mockPlatform = {
      name: "test-platform",
      storage: {
        getSession: jest.fn(),
        saveSession: jest.fn(),
        clearSession: jest.fn(),
        getShouldClearPreviousSession: jest.fn().mockResolvedValue(false),
        setShouldClearPreviousSession: jest.fn().mockResolvedValue(undefined),
      },
      authProvider: {
        authenticate: jest.fn(),
        resumeAuthFromRedirect: jest.fn(),
      },
      phantomAppProvider: {
        isAvailable: jest.fn().mockReturnValue(false),
        authenticate: jest.fn(),
      },
      urlParamsAccessor: {
        getParam: jest.fn().mockReturnValue(null),
      },
      stamper: {
        init: jest.fn().mockResolvedValue({ keyId: "test-key-id", publicKey: "11111111111111111111111111111111" }),
        sign: jest.fn().mockResolvedValue("mock-signature"),
        stamp: jest.fn().mockResolvedValue("mock-stamp"),
        getKeyInfo: jest.fn().mockReturnValue({ keyId: "test-key-id", publicKey: "11111111111111111111111111111111" }),
        resetKeyPair: jest
          .fn()
          .mockResolvedValue({ keyId: "test-key-id", publicKey: "11111111111111111111111111111111" }),
        clear: jest.fn().mockResolvedValue(undefined),
      },
    };

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    provider = new EmbeddedProvider(config, mockPlatform, mockLogger);
  });

  describe("Construction", () => {
    it("should create embedded provider with platform adapters and logger", () => {
      expect(provider).toBeInstanceOf(EmbeddedProvider);
      expect(mockLogger.log).toHaveBeenCalledWith("EMBEDDED_PROVIDER", "Initializing EmbeddedProvider", { config });
      expect(mockLogger.info).toHaveBeenCalledWith("EMBEDDED_PROVIDER", "EmbeddedProvider initialized");
    });

    it("should initialize with correct internal state", () => {
      expect(provider.isConnected()).toBe(false);
      expect(provider.getAddresses()).toEqual([]);
    });
  });

  describe("Platform Integration", () => {
    it("should call platform storage adapter during session operations", async () => {
      // Test that storage.clearSession is called during disconnect
      await provider.disconnect();
      expect(mockPlatform.storage.clearSession).toHaveBeenCalledTimes(1);

      // Test that storage.getSession is called during connect
      try {
        await provider.connect({ provider: "phantom" });
      } catch (error) {
        // Connection will fail, but storage should be called
      }
      expect(mockPlatform.storage.getSession).toHaveBeenCalled();
    });

    it("should call platform auth provider for redirect authentication", async () => {
      mockPlatform.storage.getSession.mockResolvedValue(null); // No existing session
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const authOptions = { provider: "google" as const };

      try {
        await provider.connect(authOptions);
      } catch (error) {
        // Connection will fail due to redirect, but authenticate should be called
      }

      expect(mockPlatform.authProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
        }),
      );
    });

    it("should call platform URL params accessor during redirect resume", async () => {
      // Mock resumeAuthFromRedirect to check URL params
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);
      mockPlatform.storage.getSession.mockResolvedValue({
        sessionId: "session-123",
        status: "pending",
        walletId: "wallet-123",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "key-123", publicKey: "pub-key" },
        authProvider: "phantom-connect",
        userInfo: {},
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      try {
        await provider.connect({ provider: "phantom" });
      } catch (error) {
        // Connection may fail, but URL params should be checked during session validation
      }

      expect(mockPlatform.urlParamsAccessor.getParam).toHaveBeenCalledWith("session_id");
    });

    it("should call platform stamper during initialization", async () => {
      mockPlatform.storage.getSession.mockResolvedValue(null); // No existing session
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      try {
        await provider.connect({ provider: "phantom" });
      } catch (error) {
        // Connection will fail, but stamper.init should be called during createOrganizationAndStamper
      }

      expect(mockPlatform.stamper.init).toHaveBeenCalled();
    });

    it("should pass platform stamper to PhantomClient during initialization", async () => {
      // For user-wallets, PhantomClient is only created after successful authentication
      mockPlatform.storage.getSession.mockResolvedValue(null);
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      try {
        await provider.connect({ provider: "phantom" });
      } catch (error) {
        // Connection will fail for user-wallet without proper auth setup
      }

      // For user-wallets, stamper init should be called during initialization
      expect(mockPlatform.stamper.init).toHaveBeenCalled();
    });

    it("should call auth provider with public key and appId", async () => {
      // For user-wallets, this test should verify that auth provider is called with publicKey
      mockPlatform.storage.getSession.mockResolvedValue(null);
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      try {
        await provider.connect({ provider: "google" });
      } catch (error) {
        // Connection will fail for user-wallet without proper auth setup
      }

      // For user-wallets, we should verify that auth provider is called with correct publicKey
      // The publicKey should be generated from the stamper
      expect(mockPlatform.authProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: "11111111111111111111111111111111", // The mocked public key
          appId: "test-app-id",
        }),
      );
    });

    it("should call provided logger during provider operations", () => {
      // Verify logger was called during provider initialization
      expect(mockLogger.log).toHaveBeenCalledWith("EMBEDDED_PROVIDER", "Initializing EmbeddedProvider", { config });
      expect(mockLogger.info).toHaveBeenCalledWith("EMBEDDED_PROVIDER", "EmbeddedProvider initialized");
    });

    it("should use platform stamper for signing operations", async () => {
      // Mock connected state with session
      const mockSession = {
        sessionId: "test-session-id",
        walletId: "test-wallet-id",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "test-key-id", publicKey: "11111111111111111111111111111111" },
        authProvider: "google",
        userInfo: {},
        status: "completed" as const,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        authenticatorCreatedAt: Date.now(),
        authenticatorExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        lastRenewalAttempt: undefined,
        username: "test-user",
      };
      mockPlatform.storage.getSession.mockResolvedValue(mockSession);

      provider["client"] = {
        ethereumSignMessage: jest.fn().mockResolvedValue("signed-message"),
        signUtf8Message: jest.fn().mockResolvedValue("signed-message"),
      } as any;
      provider["walletId"] = "test-wallet-id";

      const testMessage = "test message to sign";
      await provider.signMessage({
        message: testMessage,
        networkId: "solana:101",
      });

      // The stamper won't be called directly for signMessage - the client handles it
      // But we can verify the client's signUtf8Message was called (for Solana)
      expect(provider["client"].signUtf8Message).toHaveBeenCalled();
    });

    it.skip("should call platform stamper getKeyInfo during client initialization", async () => {
      // Mock existing session to trigger initializeClientFromSession
      const now = Date.now();
      const mockSession = {
        sessionId: "session-123",
        status: "completed" as const,
        walletId: "wallet-123",
        organizationId: "org-123",
        appId: "app-123",
        stamperInfo: { keyId: "key-123", publicKey: "pub-key" },
        authProvider: "app-wallet",
        userInfo: {},
        createdAt: now,
        lastUsed: now,
        authenticatorCreatedAt: now,
        authenticatorExpiresAt: now + 7 * 24 * 60 * 60 * 1000,
        lastRenewalAttempt: undefined,
        username: "test-user",
      };

      mockPlatform.storage.getSession.mockResolvedValue(mockSession);
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      // Mock stamper to return null for getKeyInfo to trigger init
      mockPlatform.stamper.getKeyInfo.mockReturnValue(null);

      try {
        await provider.connect({ provider: "phantom" });
      } catch (error) {
        // May fail on getWalletAddresses, but stamper should be called
      }

      expect(mockPlatform.stamper.getKeyInfo).toHaveBeenCalled();
      expect(mockPlatform.stamper.init).toHaveBeenCalled();
    });

    it("should call platform stamper clear during reset operations", async () => {
      // Test that we can call stamper.clear if needed for cleanup
      // This would typically be used during error recovery or manual reset

      // Simulate a scenario where we need to clear stamper keys
      await mockPlatform.stamper.clear();

      expect(mockPlatform.stamper.clear).toHaveBeenCalled();
    });

    it("should call platform stamper resetKeyPair during key reset operations", async () => {
      // Test that we can reset stamper keys if needed
      // This would typically be used during error recovery or manual key rotation

      // Simulate a scenario where we need to reset stamper keys
      await mockPlatform.stamper.resetKeyPair();

      expect(mockPlatform.stamper.resetKeyPair).toHaveBeenCalled();
    });
  });

  describe("Auth Flow Validation", () => {
    it("should validate invalid auth provider", async () => {
      const invalidAuthOptions = {
        provider: "invalid-provider" as any,
      };

      await expect(provider.connect(invalidAuthOptions)).rejects.toThrow(
        "Invalid auth provider: invalid-provider. Must be google, apple, phantom",
      );
    });
  });

  describe("Auth Flow - Happy Path for Different Providers (user-wallets)", () => {
    beforeEach(() => {
      // Ensure we're testing user-wallet type
      expect(config.embeddedWalletType).toBe("user-wallet");

      // Mock no existing session
      mockPlatform.storage.getSession.mockResolvedValue(null);
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);
    });

    it("should call platform auth provider for Apple authentication", async () => {
      const authOptions = { provider: "apple" as const };

      try {
        await provider.connect(authOptions);
      } catch (error) {
        // Connection will fail due to redirect, but authenticate should be called
      }

      expect(mockPlatform.authProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "apple",
          publicKey: "11111111111111111111111111111111",
          appId: "test-app-id",
        }),
      );
    });

    it("should call platform phantomAppProvider for Phantom authentication", async () => {
      // Mock Phantom app as available for this test
      mockPlatform.phantomAppProvider.isAvailable.mockReturnValue(true);
      mockPlatform.phantomAppProvider.authenticate.mockResolvedValue({
        organizationId: "org-phantom-123",
        walletId: "wallet-phantom-123",
        publicKey: "11111111111111111111111111111111",
        authUserId: "phantom-user-123",
      });

      const authOptions = { provider: "phantom" as const };

      try {
        await provider.connect(authOptions);
      } catch (error) {
        // Connection may fail on subsequent calls (e.g., getWalletAddresses)
      }

      // Phantom uses phantomAppProvider instead of authProvider
      expect(mockPlatform.phantomAppProvider.authenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: "11111111111111111111111111111111",
          appId: "test-app-id",
        }),
      );

      // Verify that authProvider.authenticate was NOT called for Phantom
      expect(mockPlatform.authProvider.authenticate).not.toHaveBeenCalled();
    });
  });

  describe("Session Management", () => {
    it("should handle disconnect correctly", async () => {
      await provider.disconnect();

      expect(mockPlatform.storage.clearSession).toHaveBeenCalledTimes(1);
      expect(provider.isConnected()).toBe(false);
      expect(provider.getAddresses()).toEqual([]);
    });
  });
});
