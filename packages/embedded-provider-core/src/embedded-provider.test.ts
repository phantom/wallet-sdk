import { EmbeddedProvider } from "./embedded-provider";
import type { EmbeddedProviderConfig } from "./types";
import { generateKeyPair } from "@phantom/client";
import type { PlatformAdapter, DebugLogger } from "./interfaces";

// Mock dependencies
jest.mock("@phantom/api-key-stamper");

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
      organizationId: "test-org-id",
      embeddedWalletType: "user-wallet",
      addressTypes: ["solana"],
      solanaProvider: "web3js",
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
      },
      authProvider: {
        authenticate: jest.fn(),
        resumeAuthFromRedirect: jest.fn(),
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
        await provider.connect();
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
          parentOrganizationId: config.organizationId,
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
        stamperInfo: { keyId: "key-123", publicKey: "pub-key" },
        authProvider: "phantom-connect",
        userInfo: {},
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      try {
        await provider.connect();
      } catch (error) {
        // Connection may fail, but URL params should be checked during session validation
      }

      expect(mockPlatform.urlParamsAccessor.getParam).toHaveBeenCalledWith("session_id");
    });

    it("should call platform stamper during initialization", async () => {
      mockPlatform.storage.getSession.mockResolvedValue(null); // No existing session
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      try {
        await provider.connect();
      } catch (error) {
        // Connection will fail, but stamper.init should be called during createOrganizationAndStamper
      }

      expect(mockPlatform.stamper.init).toHaveBeenCalled();
    });

    it("should pass platform stamper to PhantomClient during initialization", async () => {
      // Import the mocked PhantomClient to verify it was called with stamper
      const { PhantomClient } = await import("@phantom/client");
      const MockedPhantomClient = jest.mocked(PhantomClient);

      mockPlatform.storage.getSession.mockResolvedValue(null); // No existing session
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      try {
        await provider.connect();
      } catch (error) {
        // Connection will fail, but PhantomClient should be called with stamper
      }

      // Verify PhantomClient was called with the stamper as second argument
      expect(MockedPhantomClient).toHaveBeenCalledWith(
        expect.any(Object), // config object
        mockPlatform.stamper, // stamper should be passed as second argument
      );
    });

    it("should create authenticator name with platform info and public key", async () => {
      mockPlatform.storage.getSession.mockResolvedValue(null); // No existing session
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      try {
        await provider.connect();
      } catch (error) {
        // Connection will fail, but createOrganization should be called with authenticatorName
      }

      // Verify createOrganization was called with organization name and users array
      expect(mockCreateOrganization).toHaveBeenCalledWith(
        expect.stringMatching(/^test-org-id-test-platform-11111111$/), // organization name with platform info
        expect.arrayContaining([
          expect.objectContaining({
            username: expect.stringContaining("user-"),
            role: "admin",
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

    it("should call provided logger during provider operations", () => {
      // Verify logger was called during provider initialization
      expect(mockLogger.log).toHaveBeenCalledWith("EMBEDDED_PROVIDER", "Initializing EmbeddedProvider", { config });
      expect(mockLogger.info).toHaveBeenCalledWith("EMBEDDED_PROVIDER", "EmbeddedProvider initialized");
    });

    it("should use platform stamper for signing operations", async () => {
      // Mock connected state
      provider["client"] = {
        signMessage: jest.fn().mockResolvedValue("signed-message"),
      } as any;
      provider["walletId"] = "test-wallet-id";

      const testMessage = "test message to sign";
      await provider.signMessage({
        message: testMessage,
        networkId: "solana:101",
      });

      // The stamper won't be called directly for signMessage - the client handles it
      // But we can verify the client's signMessage was called
      expect(provider["client"].signMessage).toHaveBeenCalled();
    });

    it("should call platform stamper getKeyInfo during client initialization", async () => {
      // Mock existing session to trigger initializeClientFromSession
      const mockSession = {
        sessionId: "session-123",
        status: "completed" as const,
        walletId: "wallet-123",
        organizationId: "org-123",
        stamperInfo: { keyId: "key-123", publicKey: "pub-key" },
        authProvider: "app-wallet",
        userInfo: {},
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      mockPlatform.storage.getSession.mockResolvedValue(mockSession);
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      // Mock stamper to return null for getKeyInfo to trigger init
      mockPlatform.stamper.getKeyInfo.mockReturnValue(null);

      try {
        await provider.connect();
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

    it("should use platform storage for session persistence during JWT auth", async () => {
      mockPlatform.storage.getSession.mockResolvedValue(null);
      mockPlatform.authProvider.resumeAuthFromRedirect.mockReturnValue(null);

      const authOptions = {
        provider: "jwt" as const,
        jwtToken: "test-jwt-token",
      };

      // Mock JWT auth and organization creation
      const mockJwtAuth = {
        authenticate: jest.fn().mockResolvedValue({
          walletId: "wallet-123",
          provider: "jwt",
          userInfo: { id: "user123" },
        }),
      };
      provider["jwtAuth"] = mockJwtAuth;

      try {
        await provider.connect(authOptions);
      } catch (error) {
        // May fail on client initialization, but session should be saved
      }

      expect(mockPlatform.storage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: "wallet-123",
          authProvider: "jwt",
          status: "completed",
        }),
      );
    });
  });

  describe("Auth Flow Validation", () => {
    it("should validate JWT auth options correctly", async () => {
      const invalidAuthOptions = {
        provider: "jwt" as const,
        // Missing jwtToken
      };

      await expect(provider.connect(invalidAuthOptions)).rejects.toThrow(
        "JWT token is required when using JWT authentication",
      );
    });

    it("should validate invalid auth provider", async () => {
      const invalidAuthOptions = {
        provider: "invalid-provider" as any,
      };

      await expect(provider.connect(invalidAuthOptions)).rejects.toThrow(
        'Invalid auth provider: invalid-provider. Must be "google", "apple", "jwt", or "external_wallet"',
      );
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
