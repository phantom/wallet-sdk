/**
 * Tests for Dynamic Client Registration (DCR) client
 */

import axios from "axios";
import { DCRClient } from "./dcr";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("DCRClient", () => {
  let dcrClient: DCRClient;
  const testRedirectUri = "http://localhost:8080/callback";

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress stderr output during tests
    jest.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use default authBaseUrl and appId when not provided", () => {
      dcrClient = new DCRClient();
      expect(dcrClient).toBeInstanceOf(DCRClient);
    });

    it("should accept custom authBaseUrl and appId", () => {
      dcrClient = new DCRClient("https://custom-auth.example.com", "custom-app");
      expect(dcrClient).toBeInstanceOf(DCRClient);
    });

    it("should use PHANTOM_AUTH_BASE_URL env var when set", () => {
      const originalEnv = process.env.PHANTOM_AUTH_BASE_URL;
      process.env.PHANTOM_AUTH_BASE_URL = "https://staging-auth.phantom.app";

      dcrClient = new DCRClient();
      expect(dcrClient).toBeInstanceOf(DCRClient);

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_AUTH_BASE_URL = originalEnv;
      } else {
        delete process.env.PHANTOM_AUTH_BASE_URL;
      }
    });

    it("should prioritize constructor parameter over env var", () => {
      const originalEnv = process.env.PHANTOM_AUTH_BASE_URL;
      process.env.PHANTOM_AUTH_BASE_URL = "https://staging-auth.phantom.app";

      dcrClient = new DCRClient("https://custom-auth.example.com");
      expect(dcrClient).toBeInstanceOf(DCRClient);

      // Clean up
      if (originalEnv !== undefined) {
        process.env.PHANTOM_AUTH_BASE_URL = originalEnv;
      } else {
        delete process.env.PHANTOM_AUTH_BASE_URL;
      }
    });
  });

  describe("register", () => {
    beforeEach(() => {
      dcrClient = new DCRClient("https://auth.phantom.app", "phantom-mcp");
    });

    it("should successfully register an OAuth client", async () => {
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await dcrClient.register(testRedirectUri);

      expect(result).toEqual({
        client_id: "test-client-id",
        client_secret: "test-client-secret",
        client_id_issued_at: 1234567890,
      });
    });

    it("should call the correct registration endpoint", async () => {
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await dcrClient.register(testRedirectUri);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://auth.phantom.app/oauth/register",
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("should send correct payload structure per RFC 7591", async () => {
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await dcrClient.register(testRedirectUri);

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1];

      expect(payload).toMatchObject({
        client_name: expect.stringMatching(/^phantom-mcp-\d+$/),
        redirect_uris: [testRedirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        application_type: "native",
        token_endpoint_auth_method: "client_secret_basic",
      });
    });

    it("should send correct headers", async () => {
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await dcrClient.register(testRedirectUri);

      const callArgs = mockedAxios.post.mock.calls[0];
      const config = callArgs[2];

      expect(config?.headers).toEqual({
        "Content-Type": "application/json",
      });
    });

    it("should generate unique client names with timestamps", async () => {
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const dateSpy = jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(2000);

      await dcrClient.register(testRedirectUri);
      await dcrClient.register(testRedirectUri);

      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({
          client_name: "phantom-mcp-1000",
        }),
        expect.any(Object),
      );

      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.objectContaining({
          client_name: "phantom-mcp-2000",
        }),
        expect.any(Object),
      );

      dateSpy.mockRestore();
    });

    it("should throw descriptive error on HTTP error with response data", async () => {
      const errorResponse = {
        error: "invalid_request",
        error_description: "Invalid redirect URI",
      };

      mockedAxios.post.mockRejectedValue({
        response: {
          data: errorResponse,
        },
        message: "Request failed with status code 400",
      });

      const error = await dcrClient.register(testRedirectUri).catch(e => e);

      expect(error.message).toContain("Dynamic Client Registration failed:");
      expect(error.message).toContain(JSON.stringify(errorResponse));
    });

    it("should throw descriptive error on HTTP error without response data", async () => {
      mockedAxios.post.mockRejectedValueOnce({
        message: "Network error",
      });

      await expect(dcrClient.register(testRedirectUri)).rejects.toThrow(
        "Dynamic Client Registration failed: Network error",
      );
    });

    it("should log successful registration to stderr", async () => {
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const stderrSpy = jest.spyOn(process.stderr, "write");

      await dcrClient.register(testRedirectUri);

      expect(stderrSpy).toHaveBeenCalled();
      const logOutput = stderrSpy.mock.calls.map(call => call[0]).join("");
      expect(logOutput).toContain("[INFO]");
      expect(logOutput).toContain("[DCR]");
      expect(logOutput).toContain("Registering OAuth client");
      expect(logOutput).toContain("Successfully registered client");
    });

    it("should log errors to stderr on registration failure", async () => {
      mockedAxios.post.mockRejectedValueOnce({
        message: "Network error",
      });

      const stderrSpy = jest.spyOn(process.stderr, "write");

      await expect(dcrClient.register(testRedirectUri)).rejects.toThrow();

      expect(stderrSpy).toHaveBeenCalled();
      const logOutput = stderrSpy.mock.calls.map(call => call[0]).join("");
      expect(logOutput).toContain("[ERROR]");
      expect(logOutput).toContain("[DCR]");
      expect(logOutput).toContain("Failed to register OAuth client");
    });

    it("should work with custom authBaseUrl", async () => {
      const customDCRClient = new DCRClient("https://custom-auth.example.com");
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await customDCRClient.register(testRedirectUri);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://custom-auth.example.com/oauth/register",
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("should work with custom appId", async () => {
      const customDCRClient = new DCRClient("https://auth.phantom.app", "custom-app");
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await customDCRClient.register(testRedirectUri);

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1] as { client_name: string };

      expect(payload.client_name).toMatch(/^custom-app-\d+$/);
    });

    it("should use PHANTOM_AUTH_BASE_URL env var for registration endpoint", async () => {
      const originalEnv = process.env.PHANTOM_AUTH_BASE_URL;
      process.env.PHANTOM_AUTH_BASE_URL = "https://staging-auth.phantom.app";

      const stagingDCRClient = new DCRClient();
      const mockResponse = {
        data: {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          client_id_issued_at: 1234567890,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await stagingDCRClient.register(testRedirectUri);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://staging-auth.phantom.app/oauth/register",
        expect.any(Object),
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
});
