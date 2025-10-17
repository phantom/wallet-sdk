import type { AuthResult, JWTAuthOptions } from "../interfaces";

export class JWTAuth {
  async authenticate(options: JWTAuthOptions): Promise<AuthResult> {
    // Validate JWT token format
    if (!options.jwtToken || typeof options.jwtToken !== "string") {
      throw new Error("Invalid JWT token: token must be a non-empty string");
    }

    // Basic JWT format validation (3 parts separated by dots)
    const jwtParts = options.jwtToken.split(".");
    if (jwtParts.length !== 3) {
      throw new Error("Invalid JWT token format: token must have 3 parts separated by dots");
    }

    // JWT authentication flow - direct API call to create wallet with JWT
    try {
      // This would typically make an API call to your backend
      // which would validate the JWT and create/retrieve the wallet
      const response = await fetch("/api/auth/jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.jwtToken}`,
          "X-PHANTOM-APPID": options.appId,
        },
        body: JSON.stringify({
          appId: options.appId,
          publicKey: options.publicKey,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        switch (response.status) {
          case 400:
            throw new Error(`Invalid JWT authentication request: ${errorMessage}`);
          case 401:
            throw new Error(`JWT token is invalid or expired: ${errorMessage}`);
          case 403:
            throw new Error(`JWT authentication forbidden: ${errorMessage}`);
          case 404:
            throw new Error(`JWT authentication endpoint not found: ${errorMessage}`);
          case 429:
            throw new Error(`Too many JWT authentication requests: ${errorMessage}`);
          case 500:
          case 502:
          case 503:
          case 504:
            throw new Error(`JWT authentication server error: ${errorMessage}`);
          default:
            throw new Error(`JWT authentication failed: ${errorMessage}`);
        }
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error("Invalid response from JWT authentication server: response is not valid JSON");
      }

      if (!result.walletId) {
        throw new Error("Invalid JWT authentication response: missing walletId");
      }

      if (!result.organizationId) {
        throw new Error("Invalid JWT authentication response: missing organizationId");
      }

      if (!result.expiresInMs) {
        throw new Error("Invalid JWT authentication response: missing expiresInMs");
      }

      return {
        walletId: result.walletId,
        organizationId: result.organizationId,
        provider: "jwt",
        expiresInMs: result.expiresInMs,
        accountDerivationIndex: result.accountDerivationIndex || 0,
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("JWT authentication failed: network error or invalid endpoint");
      }

      if (error instanceof Error) {
        throw error; // Re-throw known errors
      }

      throw new Error(`JWT authentication error: ${String(error)}`);
    }
  }
}
