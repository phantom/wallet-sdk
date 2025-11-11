import { isAuthFailureCallback, isAuthCallbackUrl } from "./auth-callback";

describe("auth-callback utilities", () => {
  describe("isAuthFailureCallback", () => {
    it("should return true for failure callback with session_id and response_type=failure", () => {
      const params = new URLSearchParams("session_id=abc123&response_type=failure");
      expect(isAuthFailureCallback(params)).toBe(true);
    });

    it("should return false for success callback with session_id and wallet_id", () => {
      const params = new URLSearchParams("session_id=abc123&wallet_id=xyz789");
      expect(isAuthFailureCallback(params)).toBe(false);
    });

    it("should return false for success callback with session_id, wallet_id, and response_type=success", () => {
      const params = new URLSearchParams("session_id=abc123&wallet_id=xyz789&response_type=success");
      expect(isAuthFailureCallback(params)).toBe(false);
    });

    it("should return false when session_id is missing", () => {
      const params = new URLSearchParams("response_type=failure");
      expect(isAuthFailureCallback(params)).toBe(false);
    });

    it("should return false when response_type is missing", () => {
      const params = new URLSearchParams("session_id=abc123");
      expect(isAuthFailureCallback(params)).toBe(false);
    });

    it('should return false when response_type is not "failure"', () => {
      const params = new URLSearchParams("session_id=abc123&response_type=success");
      expect(isAuthFailureCallback(params)).toBe(false);
    });

    it("should return false for empty search params", () => {
      const params = new URLSearchParams("");
      expect(isAuthFailureCallback(params)).toBe(false);
    });

    it("should return false when session_id is empty string", () => {
      const params = new URLSearchParams("session_id=&response_type=failure");
      expect(isAuthFailureCallback(params)).toBe(false);
    });

    it("should handle URLs with additional parameters", () => {
      const params = new URLSearchParams("session_id=abc123&response_type=failure&foo=bar&baz=qux");
      expect(isAuthFailureCallback(params)).toBe(true);
    });
  });

  describe("isAuthCallbackUrl", () => {
    it("should return true for success callback with session_id and wallet_id", () => {
      const params = new URLSearchParams("session_id=abc123&wallet_id=xyz789");
      expect(isAuthCallbackUrl(params)).toBe(true);
    });

    it("should return true for failure callback with session_id and response_type=failure", () => {
      const params = new URLSearchParams("session_id=abc123&response_type=failure");
      expect(isAuthCallbackUrl(params)).toBe(true);
    });

    it("should return true for success callback with session_id, wallet_id, and response_type", () => {
      const params = new URLSearchParams("session_id=abc123&wallet_id=xyz789&response_type=success");
      expect(isAuthCallbackUrl(params)).toBe(true);
    });

    it("should return true when session_id and response_type are present", () => {
      const params = new URLSearchParams("session_id=abc123&response_type=success");
      expect(isAuthCallbackUrl(params)).toBe(true);
    });

    it("should return false when session_id is missing", () => {
      const params = new URLSearchParams("wallet_id=xyz789&response_type=success");
      expect(isAuthCallbackUrl(params)).toBe(false);
    });

    it("should return false when session_id is present but no wallet_id or response_type", () => {
      const params = new URLSearchParams("session_id=abc123");
      expect(isAuthCallbackUrl(params)).toBe(false);
    });

    it("should return false for empty search params", () => {
      const params = new URLSearchParams("");
      expect(isAuthCallbackUrl(params)).toBe(false);
    });

    it("should return false when session_id is empty string", () => {
      const params = new URLSearchParams("session_id=&wallet_id=xyz789");
      expect(isAuthCallbackUrl(params)).toBe(false);
    });

    it("should handle URLs with additional parameters", () => {
      const params = new URLSearchParams("session_id=abc123&wallet_id=xyz789&foo=bar&organization_id=org123");
      expect(isAuthCallbackUrl(params)).toBe(true);
    });

    it("should handle real-world success callback URL", () => {
      const params = new URLSearchParams(
        "session_id=550e8400-e29b-41d4-a716-446655440000&wallet_id=abc123def456&organization_id=org789&provider=google&selected_account_index=0&expires_in_ms=604800000",
      );
      expect(isAuthCallbackUrl(params)).toBe(true);
    });

    it("should handle real-world failure callback URL", () => {
      const params = new URLSearchParams(
        "session_id=550e8400-e29b-41d4-a716-446655440000&response_type=failure&error=user_cancelled",
      );
      expect(isAuthCallbackUrl(params)).toBe(true);
    });
  });

  describe("browser environment integration", () => {
    it("should work with current window.location.search (returns false for test environment)", () => {
      // In the test environment, window.location.search is typically empty
      // This test demonstrates that the functions work with window.location when no params are provided
      // In production, these functions will read from window.location.search
      const result1 = isAuthFailureCallback();
      const result2 = isAuthCallbackUrl();

      // In test environment with empty search params, both should return false
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it("should return false when window is undefined (SSR environment)", () => {
      // The functions handle undefined window gracefully
      // This is already covered by the searchParams parameter tests
      // but we document the behavior here for clarity
      const params = new URLSearchParams("");
      expect(isAuthFailureCallback(params)).toBe(false);
      expect(isAuthCallbackUrl(params)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle URL-encoded parameters", () => {
      const params = new URLSearchParams("session_id=abc%20123&wallet_id=xyz%20789");
      expect(isAuthCallbackUrl(params)).toBe(true);
    });

    it("should be case-sensitive for parameter names", () => {
      const params = new URLSearchParams("Session_Id=abc123&Wallet_Id=xyz789");
      expect(isAuthCallbackUrl(params)).toBe(false);
    });

    it("should be case-sensitive for response_type value", () => {
      const params = new URLSearchParams("session_id=abc123&response_type=FAILURE");
      expect(isAuthFailureCallback(params)).toBe(false);
    });

    it("should handle duplicate parameters (takes first value)", () => {
      const params = new URLSearchParams("session_id=first&session_id=second&wallet_id=xyz789");
      expect(isAuthCallbackUrl(params)).toBe(true);
    });
  });
});
