import { EmbeddedProvider } from "./embedded-provider";
import type { EmbeddedProviderConfig } from "./types";
import {  generateKeyPair } from "@phantom/client";
import type { PlatformAdapter, DebugLogger } from "./interfaces";

// Mock dependencies
jest.mock("@phantom/api-key-stamper");
jest.mock("@phantom/client");

// Cast mocked functions for type safety
const mockedGenerateKeyPair = jest.mocked(generateKeyPair);

// Set up generateKeyPair mock
mockedGenerateKeyPair.mockReturnValue({
  publicKey: "test-public-key",
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
      publicKey: "test-public-key",
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
    it("should use platform storage adapter", () => {
      expect(mockPlatform.storage).toBeDefined();
    });

    it("should use platform auth provider", () => {
      expect(mockPlatform.authProvider).toBeDefined();
    });

    it("should use platform URL params accessor", () => {
      expect(mockPlatform.urlParamsAccessor).toBeDefined();
    });

    it("should use provided logger", () => {
      expect(mockLogger).toBeDefined();
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
        'Invalid auth provider: invalid-provider. Must be "google", "apple", or "jwt"',
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
