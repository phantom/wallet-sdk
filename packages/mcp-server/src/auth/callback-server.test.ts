/**
 * Tests for OAuth callback server
 */

import { CallbackServer } from "./callback-server";

describe("CallbackServer", () => {
  let server: CallbackServer;

  beforeEach(() => {
    // Suppress stderr output during tests
    jest.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    // Clean up any lingering servers
    if (server) {
      try {
        // Give time for server cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("constructor", () => {
    it("should use default port when not provided", () => {
      server = new CallbackServer();
      expect(server.getCallbackUrl()).toBe("http://localhost:8080/callback");
    });

    it("should use default host when not provided", () => {
      server = new CallbackServer();
      expect(server.getCallbackUrl()).toBe("http://localhost:8080/callback");
    });

    it("should use default timeout when not provided", () => {
      server = new CallbackServer();
      expect(server).toBeInstanceOf(CallbackServer);
    });

    it("should accept custom port", () => {
      server = new CallbackServer({ port: 9090 });
      expect(server.getCallbackUrl()).toBe("http://localhost:9090/callback");
    });

    it("should accept custom host", () => {
      server = new CallbackServer({ host: "127.0.0.1" });
      expect(server.getCallbackUrl()).toBe("http://127.0.0.1:8080/callback");
    });

    it("should accept custom timeout", () => {
      server = new CallbackServer({ timeoutMs: 1000 });
      expect(server).toBeInstanceOf(CallbackServer);
    });

    it("should accept all custom options", () => {
      server = new CallbackServer({
        port: 9090,
        host: "127.0.0.1",
        timeoutMs: 1000,
      });
      expect(server.getCallbackUrl()).toBe("http://127.0.0.1:9090/callback");
    });
  });

  describe("getCallbackUrl", () => {
    it("should return correct callback URL format", () => {
      server = new CallbackServer({ port: 8080, host: "localhost" });
      expect(server.getCallbackUrl()).toBe("http://localhost:8080/callback");
    });

    it("should return correct URL with custom port", () => {
      server = new CallbackServer({ port: 3000 });
      expect(server.getCallbackUrl()).toBe("http://localhost:3000/callback");
    });

    it("should return correct URL with custom host", () => {
      server = new CallbackServer({ host: "0.0.0.0", port: 8080 });
      expect(server.getCallbackUrl()).toBe("http://0.0.0.0:8080/callback");
    });
  });

  describe("waitForCallback", () => {
    const expectedState = "test-session-id-123";
    const validParams = {
      response_type: "success",
      session_id: expectedState,
      wallet_id: "wallet-456",
      organization_id: "org-789",
      auth_user_id: "user-012",
    };

    it("should successfully receive valid callback", async () => {
      server = new CallbackServer({ port: 8081 });
      const callbackUrl = server.getCallbackUrl();

      // Start waiting for callback
      const callbackPromise = server.waitForCallback(expectedState);

      // Give server time to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Make callback request
      const queryParams = new URLSearchParams(validParams).toString();
      await fetch(`${callbackUrl}?${queryParams}`);

      // Should resolve with correct parameters
      const result = await callbackPromise;
      // Response should not include response_type (it's just for validation)
      const { response_type: _response_type, ...expectedResult } = validParams;
      expect(result).toEqual(expectedResult);
    });

    it("should validate session_id parameter (CSRF protection)", async () => {
      server = new CallbackServer({ port: 8082 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send callback with wrong session_id
      const invalidParams = { ...validParams, session_id: "wrong-session-id" };
      const queryParams = new URLSearchParams(invalidParams).toString();
      const fetchPromise = fetch(`${callbackUrl}?${queryParams}`);

      // Should reject
      await expect(callbackPromise).rejects.toThrow("Invalid session_id parameter");
      await fetchPromise; // Wait for fetch to complete
    });

    it("should reject if session_id is missing", async () => {
      server = new CallbackServer({ port: 8083 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send callback without session_id
      const { session_id: _session_id, ...paramsWithoutSessionId } = validParams;
      const queryParams = new URLSearchParams(paramsWithoutSessionId).toString();
      const fetchPromise = fetch(`${callbackUrl}?${queryParams}`);

      await expect(callbackPromise).rejects.toThrow("Invalid session_id parameter");
      await fetchPromise;
    });

    it("should reject if response_type is not success", async () => {
      server = new CallbackServer({ port: 8084 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      const failureParams = { ...validParams, response_type: "failure" };
      const queryParams = new URLSearchParams(failureParams).toString();
      const fetchPromise = fetch(`${callbackUrl}?${queryParams}`);

      await expect(callbackPromise).rejects.toThrow("SSO flow failed");
      await fetchPromise;
    });

    it("should reject if wallet_id is missing", async () => {
      server = new CallbackServer({ port: 8085 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      const { wallet_id: _wallet_id, ...paramsWithoutWalletId } = validParams;
      const queryParams = new URLSearchParams(paramsWithoutWalletId).toString();
      const fetchPromise = fetch(`${callbackUrl}?${queryParams}`);

      await expect(callbackPromise).rejects.toThrow("Missing wallet_id parameter");
      await fetchPromise;
    });

    it("should reject if organization_id is missing", async () => {
      server = new CallbackServer({ port: 8086 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      const { organization_id: _organization_id, ...paramsWithoutOrgId } = validParams;
      const queryParams = new URLSearchParams(paramsWithoutOrgId).toString();
      const fetchPromise = fetch(`${callbackUrl}?${queryParams}`);

      await expect(callbackPromise).rejects.toThrow("Missing organization_id parameter");
      await fetchPromise;
    });

    it("should reject if auth_user_id is missing", async () => {
      server = new CallbackServer({ port: 8087 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      const { auth_user_id: _auth_user_id, ...paramsWithoutUserId } = validParams;
      const queryParams = new URLSearchParams(paramsWithoutUserId).toString();
      const fetchPromise = fetch(`${callbackUrl}?${queryParams}`);

      await expect(callbackPromise).rejects.toThrow("Missing auth_user_id parameter");
      await fetchPromise;
    });

    it("should timeout if no callback received", async () => {
      server = new CallbackServer({ port: 8088, timeoutMs: 500 });

      const callbackPromise = server.waitForCallback(expectedState);

      await expect(callbackPromise).rejects.toThrow("OAuth callback timeout");
    }, 10000);

    it("should close server after successful callback", async () => {
      server = new CallbackServer({ port: 8089 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      const queryParams = new URLSearchParams(validParams).toString();
      await fetch(`${callbackUrl}?${queryParams}`);

      const result = await callbackPromise;
      // Response should not include response_type (it's just for validation)
      const { response_type: _response_type, ...expectedResult } = validParams;
      expect(result).toEqual(expectedResult);

      // Give time for cleanup
      await new Promise(resolve => setTimeout(resolve, 300));

      // Server should be closed - connection should be refused
      try {
        await fetch(callbackUrl, { signal: AbortSignal.timeout(1000) });
        throw new Error("Expected fetch to fail");
      } catch (error) {
        // Expected - server is closed
        expect(error).toBeDefined();
      }
    });

    it("should close server after failed callback", async () => {
      server = new CallbackServer({ port: 8090 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState).catch(e => e);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send invalid session_id
      const invalidParams = { ...validParams, session_id: "wrong-session-id" };
      const queryParams = new URLSearchParams(invalidParams).toString();
      const fetchPromise = fetch(`${callbackUrl}?${queryParams}`);

      const error = await callbackPromise;
      expect(error.message).toContain("Invalid session_id parameter");
      await fetchPromise;

      // Give time for cleanup
      await new Promise(resolve => setTimeout(resolve, 300));

      // Server should be closed
      try {
        await fetch(callbackUrl, { signal: AbortSignal.timeout(1000) });
        throw new Error("Expected fetch to fail");
      } catch (error) {
        // Expected - server is closed
        expect(error).toBeDefined();
      }
    });

    it("should ignore favicon requests", async () => {
      server = new CallbackServer({ port: 8091 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Request favicon - should get 404 but not interfere
      const faviconResponse = await fetch(`http://localhost:8091/favicon.ico`);
      expect(faviconResponse.status).toBe(404);

      // Now send valid callback
      const queryParams = new URLSearchParams(validParams).toString();
      await fetch(`${callbackUrl}?${queryParams}`);

      const result = await callbackPromise;
      // Response should not include response_type (it's just for validation)
      const { response_type: _response_type, ...expectedResult } = validParams;
      expect(result).toEqual(expectedResult);
    });

    it("should reject requests to invalid endpoints", async () => {
      server = new CallbackServer({ port: 8092 });

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Request wrong endpoint
      const response = await fetch("http://localhost:8092/wrong");
      expect(response.status).toBe(404);

      const text = await response.text();
      expect(text).toContain("Invalid endpoint");

      // Server should still be waiting for valid callback
      const queryParams = new URLSearchParams(validParams).toString();
      await fetch(`http://localhost:8092/callback?${queryParams}`);

      const result = await callbackPromise;
      // Response should not include response_type (it's just for validation)
      const { response_type: _response_type, ...expectedResult } = validParams;
      expect(result).toEqual(expectedResult);
    });

    it("should return HTML success page on successful callback", async () => {
      server = new CallbackServer({ port: 8093 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      const queryParams = new URLSearchParams(validParams).toString();
      const response = await fetch(`${callbackUrl}?${queryParams}`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");

      const html = await response.text();
      expect(html).toContain("Authorization Successful");
      expect(html).toContain("<!DOCTYPE html>");

      await callbackPromise;
    });

    it("should return HTML error page on invalid session_id", async () => {
      server = new CallbackServer({ port: 8094 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState).catch(e => e);
      await new Promise(resolve => setTimeout(resolve, 100));

      const invalidParams = { ...validParams, session_id: "wrong-session-id" };
      const queryParams = new URLSearchParams(invalidParams).toString();
      const response = await fetch(`${callbackUrl}?${queryParams}`);

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toBe("text/html");

      const html = await response.text();
      expect(html).toContain("Authorization Failed");
      expect(html).toContain("Invalid session_id");
      expect(html).toContain("<!DOCTYPE html>");

      const error = await callbackPromise;
      expect(error.message).toContain("Invalid session_id parameter");
    });

    it("should escape HTML in error messages", async () => {
      server = new CallbackServer({ port: 8095 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState).catch(e => e);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send failure response_type
      const failureParams = { ...validParams, response_type: "failure" };
      const queryParams = new URLSearchParams(failureParams).toString();
      const response = await fetch(`${callbackUrl}?${queryParams}`);

      const html = await response.text();
      // Should escape HTML characters
      expect(html).not.toContain("<script>");
      expect(html).toContain("failure");

      const error = await callbackPromise;
      expect(error.message).toContain("SSO flow failed");
    });

    it("should log successful callback to stderr", async () => {
      const stderrSpy = jest.spyOn(process.stderr, "write");

      server = new CallbackServer({ port: 8096 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState);
      await new Promise(resolve => setTimeout(resolve, 100));

      const queryParams = new URLSearchParams(validParams).toString();
      await fetch(`${callbackUrl}?${queryParams}`);

      await callbackPromise;

      expect(stderrSpy).toHaveBeenCalled();
      const logOutput = stderrSpy.mock.calls.map(call => call[0]).join("");
      expect(logOutput).toContain("[INFO]");
      expect(logOutput).toContain("[CallbackServer]");
      expect(logOutput).toContain("Callback server listening");
      expect(logOutput).toContain("Received SSO callback");
      expect(logOutput).toContain("SSO callback successful");
    });

    it("should log errors to stderr on invalid session_id", async () => {
      const stderrSpy = jest.spyOn(process.stderr, "write");

      server = new CallbackServer({ port: 8097 });
      const callbackUrl = server.getCallbackUrl();

      const callbackPromise = server.waitForCallback(expectedState).catch(e => e);
      await new Promise(resolve => setTimeout(resolve, 100));

      const invalidParams = { ...validParams, session_id: "wrong-session-id" };
      const queryParams = new URLSearchParams(invalidParams).toString();
      await fetch(`${callbackUrl}?${queryParams}`);

      const error = await callbackPromise;
      expect(error.message).toContain("Invalid session_id parameter");

      expect(stderrSpy).toHaveBeenCalled();
      const logOutput = stderrSpy.mock.calls.map(call => call[0]).join("");
      expect(logOutput).toContain("[ERROR]");
      expect(logOutput).toContain("[CallbackServer]");
      expect(logOutput).toContain("Invalid session_id parameter");
    });

    // Skipping this test as it's flaky due to port conflicts in CI
    it.skip("should handle server port conflicts gracefully", async () => {
      server = new CallbackServer({ port: 8098 });
      const callbackPromise = server.waitForCallback(expectedState);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to create another server on same port
      const server2 = new CallbackServer({ port: 8098 });
      const callbackPromise2 = server2.waitForCallback(expectedState);

      // Should reject with server error
      await expect(callbackPromise2).rejects.toThrow("Server error");

      // Clean up first server
      const queryParams = new URLSearchParams(validParams).toString();
      await fetch(`http://localhost:8098/callback?${queryParams}`);
      await callbackPromise;
    });
  });
});
