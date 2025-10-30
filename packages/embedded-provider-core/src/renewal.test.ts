import { EmbeddedProvider } from "./embedded-provider";
import type { EmbeddedProviderConfig, PlatformAdapter, Session } from "./interfaces";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import type { PhantomClient } from "@phantom/client";

// Mock dependencies
jest.mock("@phantom/client");
jest.mock("@phantom/parsers", () => ({
  parseToKmsTransaction: jest.fn().mockResolvedValue({ base64url: "mock-base64url", originalFormat: "mock" }),
  parseSignMessageResponse: jest.fn().mockReturnValue({ signature: "mock-signature", rawSignature: "mock-raw" }),
  parseTransactionResponse: jest.fn().mockReturnValue({ rawTransaction: "mock-raw-tx" }),
  parseSolanaTransactionSignature: jest.fn().mockReturnValue({ signature: "mock-signature", fallback: false }),
}));

// Mock bs58 and base64url dependencies
jest.mock("bs58", () => ({
  decode: jest.fn((_input: string) => new Uint8Array(32).fill(1)), // Mock public key decode
}));

jest.mock("@phantom/base64url", () => ({
  base64urlEncode: jest.fn((_input: Uint8Array) => "mock-base64url-encoded"),
}));

describe.skip("EmbeddedProvider Renewal Tests", () => {
  let provider: EmbeddedProvider;
  let mockStamper: jest.Mocked<StamperWithKeyManagement>;
  let mockClient: jest.Mocked<PhantomClient>;
  let mockStorage: { [key: string]: any };
  let originalDate: typeof Date;

  beforeEach(() => {
    // Mock Date.now() for consistent test results
    originalDate = global.Date;
    const mockDate = new Date("2024-01-01T00:00:00Z");
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.now = jest.fn(() => mockDate.getTime());
    Object.setPrototypeOf(global.Date, originalDate);

    // Mock storage
    mockStorage = {};
    const mockEmbeddedStorage = {
      getSession: jest.fn().mockImplementation(() => Promise.resolve(mockStorage.session || null)),
      saveSession: jest.fn().mockImplementation((session: Session) => {
        mockStorage.session = session;
        return Promise.resolve();
      }),
      clearSession: jest.fn().mockImplementation(() => {
        delete mockStorage.session;
        return Promise.resolve();
      }),
      getShouldClearPreviousSession: jest.fn().mockResolvedValue(false),
      setShouldClearPreviousSession: jest.fn().mockResolvedValue(undefined),
    };

    // Mock stamper with rotation support
    mockStamper = {
      init: jest.fn().mockResolvedValue({
        keyId: "test-key-id",
        publicKey: "test-public-key",
        createdAt: Date.now(),
      }),
      getKeyInfo: jest.fn().mockReturnValue({
        keyId: "test-key-id",
        publicKey: "test-public-key",
        createdAt: Date.now(),
      }),
      stamp: jest.fn().mockResolvedValue("mock-stamp"),
      algorithm: "Ed25519" as any,
      type: "PKI" as const,
      rotateKeyPair: jest.fn().mockResolvedValue({
        keyId: "new-key-id",
        publicKey: "new-public-key",
        createdAt: Date.now(),
      }),
      commitRotation: jest.fn().mockResolvedValue(undefined),
      rollbackRotation: jest.fn().mockResolvedValue(undefined),
    };

    // Mock client
    mockClient = {
      createAuthenticator: jest.fn().mockResolvedValue({
        id: "new-authenticator-id",
        authenticatorName: "test-auth",
      }),
    } as any;

    // Mock platform adapter
    const mockPlatform: PlatformAdapter = {
      storage: mockEmbeddedStorage,
      authProvider: {} as any,
      urlParamsAccessor: {} as any,
      stamper: mockStamper,
      name: "test-platform",
    };

    const mockLogger = {
      log: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };

    const config: EmbeddedProviderConfig = {
      organizationId: "test-org",
      appId: "test-app",
      apiBaseUrl: "https://api.test.com",
      embeddedWalletType: "app-wallet",
      addressTypes: ["solana"],
    };

    provider = new EmbeddedProvider(config, mockPlatform, mockLogger);

    // Mock the client property
    (provider as any).client = mockClient;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  test("should not renew when authenticator is new", async () => {
    const session: Session = {
      sessionId: "test-session",
      walletId: "test-wallet",
      organizationId: "test-org",
      appId: "test-app",
      stamperInfo: {
        keyId: "test-key-id",
        publicKey: "test-public-key",
      },
      status: "completed",
      createdAt: Date.now(),
      lastUsed: Date.now(),
      authenticatorCreatedAt: Date.now(),
      authenticatorExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      lastRenewalAttempt: undefined,
      username: "test-user",
    };
    mockStorage.session = session;

    await (provider as any).ensureValidAuthenticator();

    expect(mockStamper.rotateKeyPair).not.toHaveBeenCalled();
    expect(mockClient.createAuthenticator).not.toHaveBeenCalled();
  });

  test("should renew authenticator when close to expiration", async () => {
    const now = Date.now();
    const session: Session = {
      sessionId: "test-session",
      walletId: "test-wallet",
      organizationId: "test-org",
      appId: "test-app",
      stamperInfo: {
        keyId: "test-key-id",
        publicKey: "test-public-key",
      },
      status: "completed",
      createdAt: now,
      lastUsed: now,
      authenticatorCreatedAt: now,
      authenticatorExpiresAt: now + 1 * 60 * 1000, // 1 minute left (within renewal window)
      lastRenewalAttempt: undefined,
      username: "test-user",
    };
    mockStorage.session = session;

    // Ensure client is set before calling renewal
    expect((provider as any).client).toBe(mockClient);

    await (provider as any).ensureValidAuthenticator();

    expect(mockStamper.rotateKeyPair).toHaveBeenCalled();
    expect(mockClient.createAuthenticator).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "test-org",
        replaceExpirable: true,
        authenticator: expect.objectContaining({
          authenticatorKind: "keypair",
          algorithm: "Ed25519",
        }),
      }),
    );
    expect(mockStamper.commitRotation).toHaveBeenCalledWith("new-authenticator-id");
  });

  test("should throw when authenticator has expired", async () => {
    const now = Date.now();
    const session: Session = {
      sessionId: "test-session",
      walletId: "test-wallet",
      organizationId: "test-org",
      appId: "test-app",
      stamperInfo: {
        keyId: "test-key-id",
        publicKey: "test-public-key",
      },
      status: "completed",
      createdAt: now,
      lastUsed: now,
      authenticatorCreatedAt: now - 2 * 24 * 60 * 60 * 1000,
      authenticatorExpiresAt: now - 1 * 24 * 60 * 60 * 1000, // Expired 1 day ago
      lastRenewalAttempt: undefined,
      username: "test-user",
    };
    mockStorage.session = session;

    // Should throw for expired authenticators and disconnect
    await expect((provider as any).ensureValidAuthenticator()).rejects.toThrow("Authenticator expired");

    // No renewal should be attempted for expired authenticators
    expect(mockStamper.rotateKeyPair).not.toHaveBeenCalled();
  });

  test("should handle renewal failure gracefully", async () => {
    const now = Date.now();
    const session: Session = {
      sessionId: "test-session",
      walletId: "test-wallet",
      organizationId: "test-org",
      appId: "test-app",
      stamperInfo: {
        keyId: "test-key-id",
        publicKey: "test-public-key",
      },
      status: "completed",
      createdAt: now,
      lastUsed: now,
      authenticatorCreatedAt: now,
      authenticatorExpiresAt: now + 1 * 60 * 1000, // 1 minute left (within renewal window)
      lastRenewalAttempt: undefined,
      username: "test-user",
    };
    mockStorage.session = session;

    // Mock renewal failure
    mockClient.createAuthenticator.mockRejectedValue(new Error("Network error"));

    // Should not throw - renewal failure should be handled gracefully
    await expect((provider as any).ensureValidAuthenticator()).resolves.not.toThrow();

    expect(mockStamper.rotateKeyPair).toHaveBeenCalled();
    expect(mockStamper.commitRotation).not.toHaveBeenCalled(); // Should not commit on failure
    expect(mockStamper.rollbackRotation).toHaveBeenCalled(); // Should rollback on failure
  });

  test("should update session with new expiration after successful renewal", async () => {
    const now = Date.now();
    const session: Session = {
      sessionId: "test-session",
      walletId: "test-wallet",
      organizationId: "test-org",
      appId: "test-app",
      stamperInfo: {
        keyId: "old-key-id",
        publicKey: "old-public-key",
      },
      status: "completed",
      createdAt: now,
      lastUsed: now,
      authenticatorCreatedAt: now,
      authenticatorExpiresAt: now + 1 * 60 * 1000, // 1 minute left (within renewal window)
      lastRenewalAttempt: undefined,
      username: "test-user",
    };
    mockStorage.session = session;

    await (provider as any).ensureValidAuthenticator();

    // Check that session was updated with new key info
    expect(mockStorage.session.stamperInfo.keyId).toBe("new-key-id");
    expect(mockStorage.session.stamperInfo.publicKey).toBe("new-public-key");
    expect(mockStorage.session.authenticatorExpiresAt).toBeDefined();
    expect(mockStorage.session.lastRenewalAttempt).toBeDefined();
  });

  test("should validate session with expired authenticator", () => {
    const now = Date.now();
    const session: Session = {
      sessionId: "test-session",
      walletId: "test-wallet",
      organizationId: "test-org",
      appId: "test-app",
      stamperInfo: {
        keyId: "test-key-id",
        publicKey: "test-public-key",
      },
      status: "completed",
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
      lastUsed: now,
      authenticatorCreatedAt: now - 2 * 24 * 60 * 60 * 1000,
      authenticatorExpiresAt: now - 1 * 24 * 60 * 60 * 1000, // Expired
      lastRenewalAttempt: undefined,
      username: "test-user",
    };

    const isValid = (provider as any).isSessionValid(session);
    expect(isValid).toBe(false);
  });

  test("should validate session with valid authenticator", () => {
    const now = Date.now();
    const session: Session = {
      sessionId: "test-session",
      walletId: "test-wallet",
      organizationId: "test-org",
      appId: "test-app",
      stamperInfo: {
        keyId: "test-key-id",
        publicKey: "test-public-key",
      },
      status: "completed",
      createdAt: now,
      lastUsed: now,
      authenticatorCreatedAt: now,
      authenticatorExpiresAt: now + 5 * 24 * 60 * 60 * 1000, // Valid
      lastRenewalAttempt: undefined,
      username: "test-user",
    };

    const isValid = (provider as any).isSessionValid(session);
    expect(isValid).toBe(true);
  });
});
