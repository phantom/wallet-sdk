/**
 * Tests for SessionManager
 */

// Mock all external dependencies FIRST before any imports
jest.mock("./storage");
jest.mock("../auth/oauth");
jest.mock("@phantom/client", () => ({
  PhantomClient: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@phantom/api-key-stamper", () => ({
  ApiKeyStamper: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@phantom/crypto", () => ({
  generateKeyPair: jest.fn(),
}));

import { SessionManager } from "./manager";
import { SessionStorage } from "./storage";
import { OAuthFlow } from "../auth/oauth";
import { PhantomClient } from "@phantom/client";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import { generateKeyPair } from "@phantom/crypto";
import type { SessionData } from "./types";
import type { OAuthFlowResult } from "../auth/oauth";

describe("SessionManager", () => {
  let mockStorage: jest.Mocked<SessionStorage>;
  let mockOAuthFlow: jest.Mocked<OAuthFlow>;

  // Helper to create a valid session
  const createValidSession = (): SessionData => ({
    walletId: "test-wallet-id",
    organizationId: "test-org-id",
    authUserId: "test-user-id",
    stamperKeys: {
      publicKey: "test-public-key",
      secretKey: "test-secret-key",
    },
    createdAt: Math.floor(Date.now() / 1000) - 1000,
    updatedAt: Math.floor(Date.now() / 1000) - 1000,
  });

  // Helper to create an expired session (SSO sessions don't expire, but kept for test structure)
  const createExpiredSession = (): SessionData => ({
    ...createValidSession(),
  });

  // Helper to create OAuth flow result (SSO pattern)
  const createOAuthResult = (): OAuthFlowResult => ({
    walletId: "new-wallet-id",
    organizationId: "new-org-id",
    authUserId: "new-user-id",
    stamperKeys: {
      publicKey: "new-public-key",
      secretKey: "new-secret-key",
    },
    clientConfig: {
      client_id: "test-client-id",
      client_secret: "test-client-secret",
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock storage
    mockStorage = new SessionStorage() as jest.Mocked<SessionStorage>;
    (SessionStorage as jest.Mock).mockImplementation(() => mockStorage);

    // Setup mock OAuth flow
    mockOAuthFlow = new OAuthFlow() as jest.Mocked<OAuthFlow>;
    (OAuthFlow as jest.Mock).mockImplementation(() => mockOAuthFlow);

    // Mock generateKeyPair
    (generateKeyPair as jest.Mock).mockReturnValue({
      publicKey: "generated-public-key",
      secretKey: "generated-secret-key",
    });
  });

  describe("constructor", () => {
    it("should create SessionManager with default options", () => {
      const manager = new SessionManager();
      expect(manager).toBeDefined();
      expect(SessionStorage).toHaveBeenCalledWith(undefined);
    });

    it("should create SessionManager with custom options", () => {
      const options = {
        authBaseUrl: "https://custom-auth.example.com",
        connectBaseUrl: "https://custom-connect.example.com",
        apiBaseUrl: "https://custom-api.example.com",
        callbackPort: 9090,
        appId: "custom-app",
        sessionDir: "/custom/path",
      };

      const manager = new SessionManager(options);
      expect(manager).toBeDefined();
      expect(SessionStorage).toHaveBeenCalledWith("/custom/path");
    });

    it("should use environment variables for URLs", () => {
      process.env.PHANTOM_AUTH_BASE_URL = "https://env-auth.example.com";
      process.env.PHANTOM_CONNECT_BASE_URL = "https://env-connect.example.com";
      process.env.PHANTOM_API_BASE_URL = "https://env-api.example.com";

      const manager = new SessionManager();
      expect(manager).toBeDefined();

      // Clean up
      delete process.env.PHANTOM_AUTH_BASE_URL;
      delete process.env.PHANTOM_CONNECT_BASE_URL;
      delete process.env.PHANTOM_API_BASE_URL;
    });
  });

  describe("initialize", () => {
    it("should load and use existing valid session", async () => {
      const validSession = createValidSession();
      mockStorage.load.mockReturnValue(validSession);
      mockStorage.isExpired.mockReturnValue(false);

      const manager = new SessionManager();
      await manager.initialize();

      expect(mockStorage.load).toHaveBeenCalled();
      expect(mockStorage.isExpired).toHaveBeenCalledWith(validSession);
      expect(mockOAuthFlow.authenticate).not.toHaveBeenCalled();
      expect(ApiKeyStamper).toHaveBeenCalledWith({
        apiSecretKey: validSession.stamperKeys.secretKey,
      });
      expect(PhantomClient).toHaveBeenCalledWith(
        {
          apiBaseUrl: "https://api.phantom.app/v1/wallets",
          organizationId: validSession.organizationId,
          walletType: "user-wallet",
          headers: expect.objectContaining({
            "x-phantom-platform": "ext-sdk",
            "x-phantom-sdk-type": "server",
            "x-phantom-client": "mcp",
            "x-phantom-sdk-version": expect.any(String),
            "x-app-id": "phantom-mcp",
          }),
        },
        expect.anything(),
      );
    });

    it("should authenticate when no session exists", async () => {
      mockStorage.load.mockReturnValue(null);
      mockOAuthFlow.authenticate.mockResolvedValue(createOAuthResult());

      const manager = new SessionManager();
      await manager.initialize();

      expect(mockStorage.load).toHaveBeenCalled();
      expect(mockOAuthFlow.authenticate).toHaveBeenCalled();
      // SSO: stamper keys generated inside OAuthFlow, not by SessionManager
      expect(mockStorage.save).toHaveBeenCalled();
    });

    // SSO sessions don't expire, so this test is no longer applicable
    it.skip("should re-authenticate when session is expired (OAuth - deprecated)", async () => {
      const expiredSession = createExpiredSession();
      mockStorage.load.mockReturnValue(expiredSession);
      mockStorage.isExpired.mockReturnValue(true);
      mockOAuthFlow.authenticate.mockResolvedValue(createOAuthResult());

      const manager = new SessionManager();
      await manager.initialize();

      expect(mockStorage.load).toHaveBeenCalled();
      expect(mockStorage.isExpired).toHaveBeenCalledWith(expiredSession);
      expect(mockOAuthFlow.authenticate).toHaveBeenCalled();
      expect(mockStorage.save).toHaveBeenCalled();
    });

    it("should create session with correct data structure", async () => {
      mockStorage.load.mockReturnValue(null);
      const oauthResult = createOAuthResult();
      mockOAuthFlow.authenticate.mockResolvedValue(oauthResult);

      const manager = new SessionManager();
      await manager.initialize();

      expect(mockStorage.save).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: oauthResult.walletId,
          organizationId: oauthResult.organizationId,
          authUserId: oauthResult.authUserId,
          appId: oauthResult.clientConfig.client_id,
          // SSO: stamper keys come from OAuthResult, not generated separately
          stamperKeys: oauthResult.stamperKeys,
        }),
      );
    });

    it("should handle authentication errors", async () => {
      mockStorage.load.mockReturnValue(null);
      mockOAuthFlow.authenticate.mockRejectedValue(new Error("OAuth failed"));

      const manager = new SessionManager();
      await expect(manager.initialize()).rejects.toThrow("OAuth failed");
    });

    it("should pass custom options to OAuthFlow", async () => {
      mockStorage.load.mockReturnValue(null);
      mockOAuthFlow.authenticate.mockResolvedValue(createOAuthResult());

      const manager = new SessionManager({
        authBaseUrl: "https://custom-auth.example.com",
        connectBaseUrl: "https://custom-connect.example.com",
        callbackPort: 9090,
        appId: "custom-app",
      });

      await manager.initialize();

      expect(OAuthFlow).toHaveBeenCalledWith({
        authBaseUrl: "https://custom-auth.example.com",
        connectBaseUrl: "https://custom-connect.example.com",
        callbackPort: 9090,
        callbackPath: "/callback",
        appId: "custom-app",
      });
    });
  });

  describe("getClient", () => {
    it("should return PhantomClient after initialization", async () => {
      const validSession = createValidSession();
      mockStorage.load.mockReturnValue(validSession);
      mockStorage.isExpired.mockReturnValue(false);

      const manager = new SessionManager();
      await manager.initialize();

      const client = manager.getClient();
      expect(client).toBeDefined();
      expect(PhantomClient).toHaveBeenCalled();
    });

    it("should throw error if not initialized", () => {
      const manager = new SessionManager();
      expect(() => manager.getClient()).toThrow("SessionManager not initialized. Call initialize() first.");
    });
  });

  describe("getSession", () => {
    it("should return session data after initialization", async () => {
      const validSession = createValidSession();
      mockStorage.load.mockReturnValue(validSession);
      mockStorage.isExpired.mockReturnValue(false);

      const manager = new SessionManager();
      await manager.initialize();

      const session = manager.getSession();
      expect(session).toEqual(validSession);
    });

    it("should throw error if not initialized", () => {
      const manager = new SessionManager();
      expect(() => manager.getSession()).toThrow("SessionManager not initialized. Call initialize() first.");
    });
  });

  describe("resetSession", () => {
    it("should clear existing session and re-authenticate", async () => {
      // First, initialize with a valid session
      const validSession = createValidSession();
      mockStorage.load.mockReturnValue(validSession);
      mockStorage.isExpired.mockReturnValue(false);

      const manager = new SessionManager();
      await manager.initialize();

      // Verify client exists
      expect(() => manager.getClient()).not.toThrow();

      // Reset session
      mockOAuthFlow.authenticate.mockResolvedValue(createOAuthResult());
      await manager.resetSession();

      // Verify storage was cleared and new session created
      expect(mockStorage.delete).toHaveBeenCalled();
      expect(mockOAuthFlow.authenticate).toHaveBeenCalled();
      expect(mockStorage.save).toHaveBeenCalled();
    });

    it("should handle authentication errors during reset", async () => {
      const validSession = createValidSession();
      mockStorage.load.mockReturnValue(validSession);
      mockStorage.isExpired.mockReturnValue(false);

      const manager = new SessionManager();
      await manager.initialize();

      mockOAuthFlow.authenticate.mockRejectedValue(new Error("OAuth failed"));

      await expect(manager.resetSession()).rejects.toThrow("OAuth failed");
      expect(mockStorage.delete).toHaveBeenCalled();
    });
  });

  describe("client creation", () => {
    it("should create ApiKeyStamper with correct secret key", async () => {
      const validSession = createValidSession();
      mockStorage.load.mockReturnValue(validSession);
      mockStorage.isExpired.mockReturnValue(false);

      const manager = new SessionManager();
      await manager.initialize();

      expect(ApiKeyStamper).toHaveBeenCalledWith({
        apiSecretKey: validSession.stamperKeys.secretKey,
      });
    });

    it("should create PhantomClient with correct config", async () => {
      const validSession = createValidSession();
      mockStorage.load.mockReturnValue(validSession);
      mockStorage.isExpired.mockReturnValue(false);

      const manager = new SessionManager({
        apiBaseUrl: "https://custom-api.example.com",
      });
      await manager.initialize();

      expect(PhantomClient).toHaveBeenCalledWith(
        {
          apiBaseUrl: "https://custom-api.example.com",
          organizationId: validSession.organizationId,
          walletType: "user-wallet",
          headers: expect.objectContaining({
            "x-phantom-platform": "ext-sdk",
            "x-phantom-sdk-type": "server",
            "x-phantom-client": "mcp",
            "x-phantom-sdk-version": expect.any(String),
            "x-app-id": "phantom-mcp",
          }),
        },
        expect.anything(),
      );
    });

    it("should set walletType to user-wallet", async () => {
      const validSession = createValidSession();
      mockStorage.load.mockReturnValue(validSession);
      mockStorage.isExpired.mockReturnValue(false);

      const manager = new SessionManager();
      await manager.initialize();

      expect(PhantomClient).toHaveBeenCalledWith(
        expect.objectContaining({
          walletType: "user-wallet",
        }),
        expect.anything(),
      );
    });
  });

  describe("error handling", () => {
    it("should handle corrupted session file", async () => {
      mockStorage.load.mockReturnValue(null); // Storage returns null for corrupted files
      mockOAuthFlow.authenticate.mockResolvedValue(createOAuthResult());

      const manager = new SessionManager();
      await manager.initialize();

      // Should authenticate successfully even with corrupted session
      expect(mockOAuthFlow.authenticate).toHaveBeenCalled();
    });

    it("should handle missing session directory", async () => {
      mockStorage.load.mockReturnValue(null);
      mockOAuthFlow.authenticate.mockResolvedValue(createOAuthResult());

      const manager = new SessionManager();
      await manager.initialize();

      // Should create session successfully
      expect(mockStorage.save).toHaveBeenCalled();
    });

    it("should propagate OAuth flow errors", async () => {
      mockStorage.load.mockReturnValue(null);
      const oauthError = new Error("Failed to open browser");
      mockOAuthFlow.authenticate.mockRejectedValue(oauthError);

      const manager = new SessionManager();
      await expect(manager.initialize()).rejects.toThrow("Failed to open browser");
    });

    it("should propagate storage errors", async () => {
      mockStorage.load.mockImplementation(() => {
        throw new Error("Disk read error");
      });

      const manager = new SessionManager();
      await expect(manager.initialize()).rejects.toThrow("Disk read error");
    });
  });

  describe("timestamp handling", () => {
    it("should set createdAt and updatedAt timestamps", async () => {
      mockStorage.load.mockReturnValue(null);
      mockOAuthFlow.authenticate.mockResolvedValue(createOAuthResult());

      const beforeTimestamp = Math.floor(Date.now() / 1000);
      const manager = new SessionManager();
      await manager.initialize();
      const afterTimestamp = Math.floor(Date.now() / 1000);

      const savedSession = (mockStorage.save as jest.Mock).mock.calls[0][0] as SessionData;
      expect(savedSession.createdAt).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(savedSession.createdAt).toBeLessThanOrEqual(afterTimestamp);
      expect(savedSession.updatedAt).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(savedSession.updatedAt).toBeLessThanOrEqual(afterTimestamp);
    });
  });
});
