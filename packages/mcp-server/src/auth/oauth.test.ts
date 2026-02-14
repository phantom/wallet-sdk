/**
 * Tests for OAuth 2.0 flow with PKCE
 */

import axios from "axios";
import { OAuthFlow } from "./oauth";
import { DCRClient } from "./dcr";
import { CallbackServer } from "./callback-server";
import type { OAuthCallbackParams, DCRClientConfig } from "../session/types";

// Mock dependencies
jest.mock("axios");
jest.mock("./dcr");
jest.mock("./callback-server");

// Mock open as a default export function
jest.mock("open", () => jest.fn());
import open from "open";

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedDCRClient = DCRClient as jest.MockedClass<typeof DCRClient>;
const MockedCallbackServer = CallbackServer as jest.MockedClass<typeof CallbackServer>;
const mockedOpen = open as jest.MockedFunction<typeof open>;

describe("OAuthFlow", () => {
  let oauthFlow: OAuthFlow;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress stderr output during tests
    jest.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use default options when not provided", () => {
      oauthFlow = new OAuthFlow();
      expect(oauthFlow).toBeInstanceOf(OAuthFlow);
    });

    it("should accept custom options", () => {
      oauthFlow = new OAuthFlow({
        authBaseUrl: "https://custom-auth.example.com",
        callbackPort: 9090,
        appId: "custom-app",
      });
      expect(oauthFlow).toBeInstanceOf(OAuthFlow);
    });

    it("should use PHANTOM_AUTH_BASE_URL env var when set", () => {
      const originalEnv = process.env.PHANTOM_AUTH_BASE_URL;
      process.env.PHANTOM_AUTH_BASE_URL = "https://staging-auth.phantom.app";

      oauthFlow = new OAuthFlow();
      expect(oauthFlow).toBeInstanceOf(OAuthFlow);

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_AUTH_BASE_URL = originalEnv;
      } else {
        delete process.env.PHANTOM_AUTH_BASE_URL;
      }
    });

    it("should use PHANTOM_CONNECT_BASE_URL env var when set", () => {
      const originalEnv = process.env.PHANTOM_CONNECT_BASE_URL;
      process.env.PHANTOM_CONNECT_BASE_URL = "https://staging-connect.phantom.app";

      oauthFlow = new OAuthFlow();
      expect(oauthFlow).toBeInstanceOf(OAuthFlow);

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_CONNECT_BASE_URL = originalEnv;
      } else {
        delete process.env.PHANTOM_CONNECT_BASE_URL;
      }
    });

    it("should prioritize options parameter over env vars", () => {
      const originalAuthEnv = process.env.PHANTOM_AUTH_BASE_URL;
      const originalConnectEnv = process.env.PHANTOM_CONNECT_BASE_URL;
      process.env.PHANTOM_AUTH_BASE_URL = "https://staging-auth.phantom.app";
      process.env.PHANTOM_CONNECT_BASE_URL = "https://staging-connect.phantom.app";

      oauthFlow = new OAuthFlow({
        authBaseUrl: "https://custom-auth.example.com",
      });
      expect(oauthFlow).toBeInstanceOf(OAuthFlow);

      // Clean up
      if (originalAuthEnv !== undefined) {
        process.env.PHANTOM_AUTH_BASE_URL = originalAuthEnv;
      } else {
        delete process.env.PHANTOM_AUTH_BASE_URL;
      }
      if (originalConnectEnv !== undefined) {
        process.env.PHANTOM_CONNECT_BASE_URL = originalConnectEnv;
      } else {
        delete process.env.PHANTOM_CONNECT_BASE_URL;
      }
    });

    it("should use valid PHANTOM_CALLBACK_PORT env var when set", () => {
      const originalEnv = process.env.PHANTOM_CALLBACK_PORT;
      process.env.PHANTOM_CALLBACK_PORT = "9090";

      oauthFlow = new OAuthFlow();
      expect(oauthFlow).toBeInstanceOf(OAuthFlow);

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_CALLBACK_PORT = originalEnv;
      } else {
        delete process.env.PHANTOM_CALLBACK_PORT;
      }
    });

    it("should throw error for unsupported SSO provider", () => {
      expect(() => new OAuthFlow({ provider: "invalid" as any })).toThrow("Unsupported SSO provider: invalid");
    });

    it("should throw error for invalid PHANTOM_CALLBACK_PORT (NaN)", () => {
      const originalEnv = process.env.PHANTOM_CALLBACK_PORT;
      process.env.PHANTOM_CALLBACK_PORT = "invalid-port";

      expect(() => new OAuthFlow()).toThrow(
        'Invalid PHANTOM_CALLBACK_PORT: "invalid-port". Must be a valid port number between 1 and 65535.',
      );

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_CALLBACK_PORT = originalEnv;
      } else {
        delete process.env.PHANTOM_CALLBACK_PORT;
      }
    });

    it("should throw error for invalid PHANTOM_CALLBACK_PORT (negative)", () => {
      const originalEnv = process.env.PHANTOM_CALLBACK_PORT;
      process.env.PHANTOM_CALLBACK_PORT = "-1";

      expect(() => new OAuthFlow()).toThrow(
        'Invalid PHANTOM_CALLBACK_PORT: "-1". Must be a valid port number between 1 and 65535.',
      );

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_CALLBACK_PORT = originalEnv;
      } else {
        delete process.env.PHANTOM_CALLBACK_PORT;
      }
    });

    it("should throw error for invalid PHANTOM_CALLBACK_PORT (out of range)", () => {
      const originalEnv = process.env.PHANTOM_CALLBACK_PORT;
      process.env.PHANTOM_CALLBACK_PORT = "99999";

      expect(() => new OAuthFlow()).toThrow(
        'Invalid PHANTOM_CALLBACK_PORT: "99999". Must be a valid port number between 1 and 65535.',
      );

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_CALLBACK_PORT = originalEnv;
      } else {
        delete process.env.PHANTOM_CALLBACK_PORT;
      }
    });

    it("should prioritize options.callbackPort over PHANTOM_CALLBACK_PORT env var", () => {
      const originalEnv = process.env.PHANTOM_CALLBACK_PORT;
      process.env.PHANTOM_CALLBACK_PORT = "9090";

      oauthFlow = new OAuthFlow({ callbackPort: 7070 });
      expect(oauthFlow).toBeInstanceOf(OAuthFlow);

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_CALLBACK_PORT = originalEnv;
      } else {
        delete process.env.PHANTOM_CALLBACK_PORT;
      }
    });
  });

  // SSO authentication flow tests
  describe("authenticate (SSO)", () => {
    let mockDCRClient: jest.Mocked<DCRClient>;
    let mockCallbackServer: jest.Mocked<CallbackServer>;

    const mockClientConfig: DCRClientConfig = {
      client_id: "test-client-id",
      client_secret: "test-client-secret",
      client_id_issued_at: 1234567890,
    };

    const mockCallbackParams: OAuthCallbackParams = {
      session_id: "test-session-id",
      wallet_id: "test-wallet-id",
      organization_id: "test-org-id",
      auth_user_id: "test-user-id",
    };

    beforeEach(() => {
      // Setup DCRClient mock
      mockDCRClient = {
        register: jest.fn().mockResolvedValue(mockClientConfig),
      } as any;
      MockedDCRClient.mockImplementation(() => mockDCRClient);

      // Setup CallbackServer mock
      mockCallbackServer = {
        getCallbackUrl: jest.fn().mockReturnValue("http://localhost:8080/callback"),
        waitForListening: jest.fn().mockResolvedValue(undefined),
        waitForCallback: jest.fn().mockResolvedValue(mockCallbackParams),
      } as any;
      MockedCallbackServer.mockImplementation(() => mockCallbackServer);

      // Setup open mock
      mockedOpen.mockResolvedValue(undefined as any);

      oauthFlow = new OAuthFlow();
    });

    it("should successfully complete the SSO flow", async () => {
      const result = await oauthFlow.authenticate();

      expect(result).toEqual({
        walletId: "test-wallet-id",
        organizationId: "test-org-id",
        authUserId: "test-user-id",
        clientConfig: mockClientConfig,
        stamperKeys: {
          publicKey: expect.any(String),
          secretKey: expect.any(String),
        },
      });
    });

    it("should register OAuth client via DCR", async () => {
      await oauthFlow.authenticate();

      expect(MockedDCRClient).toHaveBeenCalledWith("https://auth.phantom.app", "phantom-mcp");
      expect(mockDCRClient.register).toHaveBeenCalledWith("http://localhost:8080/callback");
    });

    it("should open browser with SSO authorization URL", async () => {
      const result = await oauthFlow.authenticate();

      expect(mockedOpen).toHaveBeenCalledTimes(1);
      const authUrl = mockedOpen.mock.calls[0][0] as string;
      const url = new URL(authUrl);

      expect(url.origin).toBe("https://connect.phantom.app");
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("provider")).toBe("google");
      expect(url.searchParams.get("app_id")).toBe("test-client-id");
      expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:8080/callback");
      expect(url.searchParams.get("public_key")).toBe(result.stamperKeys.publicKey);
      const sessionId = mockCallbackServer.waitForCallback.mock.calls[0][0];
      expect(url.searchParams.get("session_id")).toBe(sessionId);
      expect(url.searchParams.get("sdk_type")).toBe("mcp-server");
      expect(url.searchParams.get("sdk_version")).toBe("1.0.0");
    });

    it("should start callback server before opening browser", async () => {
      await oauthFlow.authenticate();

      expect(mockCallbackServer.waitForListening).toHaveBeenCalledTimes(1);
      expect(mockedOpen).toHaveBeenCalledTimes(1);
      const waitOrder = mockCallbackServer.waitForListening.mock.invocationCallOrder[0];
      const openOrder = mockedOpen.mock.invocationCallOrder[0];
      expect(waitOrder).toBeLessThan(openOrder);
    });

    it("should wait for callback with correct session id", async () => {
      await oauthFlow.authenticate();

      expect(mockCallbackServer.waitForCallback).toHaveBeenCalledTimes(1);
      const sessionId = mockCallbackServer.waitForCallback.mock.calls[0][0];
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe("string");
    });

    it("should throw error if DCR registration fails", async () => {
      const error = new Error("DCR registration failed");
      mockDCRClient.register.mockRejectedValue(error);

      await expect(oauthFlow.authenticate()).rejects.toThrow("DCR registration failed");
    });

    it("should throw error if callback fails", async () => {
      const error = new Error("Callback timeout");
      mockCallbackServer.waitForCallback.mockRejectedValue(error);

      await expect(oauthFlow.authenticate()).rejects.toThrow("Callback timeout");
    });

    it("should work with custom authBaseUrl", async () => {
      const customFlow = new OAuthFlow({
        authBaseUrl: "https://custom-auth.example.com",
      });

      await customFlow.authenticate();

      expect(MockedDCRClient).toHaveBeenCalledWith("https://custom-auth.example.com", "phantom-mcp");
    });

    it("should work with custom connectBaseUrl", async () => {
      const customFlow = new OAuthFlow({
        connectBaseUrl: "https://custom-connect.example.com",
      });

      await customFlow.authenticate();

      const authUrl = mockedOpen.mock.calls[0][0] as string;
      const url = new URL(authUrl);
      expect(url.origin).toBe("https://custom-connect.example.com");
    });

    it("should work with custom callbackPort", async () => {
      const customFlow = new OAuthFlow({
        callbackPort: 9090,
      });

      await customFlow.authenticate();

      expect(MockedCallbackServer).toHaveBeenCalledWith({ port: 9090, path: "/callback" });
    });

    it("should work with custom appId", async () => {
      const customFlow = new OAuthFlow({
        appId: "custom-app",
      });

      await customFlow.authenticate();

      expect(MockedDCRClient).toHaveBeenCalledWith("https://auth.phantom.app", "custom-app");
    });

    it("should log flow progress to stderr", async () => {
      const stderrSpy = jest.spyOn(process.stderr, "write");

      await oauthFlow.authenticate();

      expect(stderrSpy).toHaveBeenCalled();
      const logOutput = stderrSpy.mock.calls.map(call => call[0]).join("");

      expect(logOutput).toContain("[INFO]");
      expect(logOutput).toContain("[OAuthFlow]");
      expect(logOutput).toContain("Starting SSO authentication flow");
      expect(logOutput).toContain("Callback received successfully");
    });

    it("should use PHANTOM_AUTH_BASE_URL env var for DCR", async () => {
      const originalEnv = process.env.PHANTOM_AUTH_BASE_URL;
      process.env.PHANTOM_AUTH_BASE_URL = "https://staging-auth.phantom.app";

      const stagingFlow = new OAuthFlow();
      await stagingFlow.authenticate();

      expect(MockedDCRClient).toHaveBeenCalledWith("https://staging-auth.phantom.app", "phantom-mcp");

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_AUTH_BASE_URL = originalEnv;
      } else {
        delete process.env.PHANTOM_AUTH_BASE_URL;
      }
    });

    it("should use PHANTOM_CONNECT_BASE_URL env var for authorization URL", async () => {
      const originalEnv = process.env.PHANTOM_CONNECT_BASE_URL;
      process.env.PHANTOM_CONNECT_BASE_URL = "https://staging-connect.phantom.app";

      const stagingFlow = new OAuthFlow();
      await stagingFlow.authenticate();

      const authUrl = mockedOpen.mock.calls[0][0] as string;
      const url = new URL(authUrl);
      expect(url.origin).toBe("https://staging-connect.phantom.app");

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_CONNECT_BASE_URL = originalEnv;
      } else {
        delete process.env.PHANTOM_CONNECT_BASE_URL;
      }
    });
  });

  // Refresh token tests removed - SSO uses stamper keys, not refresh tokens
  describe.skip("refreshToken (OAuth - deprecated)", () => {
    const mockClientConfig: DCRClientConfig = {
      client_id: "test-client-id",
      client_secret: "test-client-secret",
      client_id_issued_at: 1234567890,
    };

    const mockTokenResponse = {
      data: {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        token_type: "Bearer",
      },
    };

    beforeEach(() => {
      oauthFlow = new OAuthFlow();
      mockedAxios.post.mockResolvedValue(mockTokenResponse);
    });

    it("should successfully refresh tokens", async () => {
      const result = await oauthFlow.refreshToken("old-refresh-token", mockClientConfig);

      expect(result).toEqual({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      });
    });

    it("should call token endpoint with refresh_token grant", async () => {
      await oauthFlow.refreshToken("old-refresh-token", mockClientConfig);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://auth.phantom.app/oauth2/token",
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: expect.stringMatching(/^Basic /),
          }),
        }),
      );

      const callArgs = mockedAxios.post.mock.calls[0];
      const body = callArgs[1] as string;
      const params = new URLSearchParams(body);

      expect(params.get("grant_type")).toBe("refresh_token");
      expect(params.get("refresh_token")).toBe("old-refresh-token");
    });

    it("should use Basic Auth with correct credentials", async () => {
      await oauthFlow.refreshToken("old-refresh-token", mockClientConfig);

      const callArgs = mockedAxios.post.mock.calls[0];
      const config = callArgs[2] as any;
      const authHeader = config.headers.Authorization;

      // Decode Basic Auth header
      const base64Credentials = authHeader.replace("Basic ", "");
      const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");

      expect(credentials).toBe("test-client-id:test-client-secret");
    });

    it("should throw error if token refresh fails", async () => {
      const errorResponse = {
        error: "invalid_grant",
        error_description: "Invalid refresh token",
      };

      mockedAxios.post.mockRejectedValue({
        response: {
          data: errorResponse,
        },
        message: "Request failed with status code 400",
      });

      await expect(oauthFlow.refreshToken("old-refresh-token", mockClientConfig)).rejects.toThrow(
        "Token refresh failed",
      );
    });

    it("should work with custom authBaseUrl", async () => {
      const customFlow = new OAuthFlow({
        authBaseUrl: "https://custom-auth.example.com",
      });

      await customFlow.refreshToken("old-refresh-token", mockClientConfig);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://custom-auth.example.com/oauth2/token",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should log refresh progress to stderr", async () => {
      const stderrSpy = jest.spyOn(process.stderr, "write");

      await oauthFlow.refreshToken("old-refresh-token", mockClientConfig);

      expect(stderrSpy).toHaveBeenCalled();
      const logOutput = stderrSpy.mock.calls.map(call => call[0]).join("");

      expect(logOutput).toContain("[INFO]");
      expect(logOutput).toContain("[OAuthFlow]");
      expect(logOutput).toContain("Refreshing access token");
      expect(logOutput).toContain("Token refresh successful");
    });

    it("should use PHANTOM_AUTH_BASE_URL env var for token refresh", async () => {
      const originalEnv = process.env.PHANTOM_AUTH_BASE_URL;
      process.env.PHANTOM_AUTH_BASE_URL = "https://staging-auth.phantom.app";

      const stagingFlow = new OAuthFlow();
      await stagingFlow.refreshToken("old-refresh-token", mockClientConfig);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://staging-auth.phantom.app/oauth2/token",
        expect.any(String),
        expect.any(Object),
      );

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_AUTH_BASE_URL = originalEnv;
      } else {
        delete process.env.PHANTOM_AUTH_BASE_URL;
      }
    });
  });

  // PKCE tests removed - SSO flow doesn't use PKCE
  describe.skip("PKCE implementation (OAuth - deprecated)", () => {
    it("should generate different code verifiers on each call", async () => {
      // We can't directly test private methods, but we can verify the behavior
      // by checking that different authorize URLs have different code_challenges
      const mockDCRClient = {
        register: jest.fn().mockResolvedValue({
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        }),
      } as any;
      MockedDCRClient.mockImplementation(() => mockDCRClient);

      const mockCallbackServer = {
        getCallbackUrl: jest.fn().mockReturnValue("http://localhost:8080/callback"),
        waitForListening: jest.fn().mockResolvedValue(undefined),
        waitForCallback: jest.fn().mockResolvedValue({
          code: "test-code",
          state: "test-state",
          wallet_id: "test-wallet-id",
          organization_id: "test-org-id",
          auth_user_id: "test-user-id",
        }),
      } as any;
      MockedCallbackServer.mockImplementation(() => mockCallbackServer);

      mockedOpen.mockResolvedValue(undefined as any);
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
        },
      });

      const flow1 = new OAuthFlow();
      await flow1.authenticate();
      const url1 = mockedOpen.mock.calls[0][0] as string;
      const challenge1 = new URL(url1).searchParams.get("code_challenge");

      mockedOpen.mockClear();

      const flow2 = new OAuthFlow();
      await flow2.authenticate();
      const url2 = mockedOpen.mock.calls[0][0] as string;
      const challenge2 = new URL(url2).searchParams.get("code_challenge");

      expect(challenge1).not.toBe(challenge2);
    });

    it("should generate base64url encoded code challenge", async () => {
      const mockDCRClient = {
        register: jest.fn().mockResolvedValue({
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        }),
      } as any;
      MockedDCRClient.mockImplementation(() => mockDCRClient);

      const mockCallbackServer = {
        getCallbackUrl: jest.fn().mockReturnValue("http://localhost:8080/callback"),
        waitForListening: jest.fn().mockResolvedValue(undefined),
        waitForCallback: jest.fn().mockResolvedValue({
          code: "test-code",
          state: "test-state",
          wallet_id: "test-wallet-id",
          organization_id: "test-org-id",
          auth_user_id: "test-user-id",
        }),
      } as any;
      MockedCallbackServer.mockImplementation(() => mockCallbackServer);

      mockedOpen.mockResolvedValue(undefined as any);
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
        },
      });

      const flow = new OAuthFlow();
      await flow.authenticate();

      const authUrl = mockedOpen.mock.calls[0][0] as string;
      const url = new URL(authUrl);
      const codeChallenge = url.searchParams.get("code_challenge");

      // Base64url should not contain +, /, or =
      expect(codeChallenge).toBeTruthy();
      expect(codeChallenge).not.toMatch(/[+/=]/);
      // Should only contain base64url characters
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
