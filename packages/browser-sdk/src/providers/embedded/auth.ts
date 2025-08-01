import type { AuthOptions } from "../../types";

export interface AuthResult {
  walletId: string;
  provider?: string;
  userInfo?: Record<string, any>;
}

export interface PhantomConnectOptions {
  organizationId: string;
  parentOrganizationId: string;
  provider?: "google" | "apple";
  redirectUrl?: string;
  customAuthData?: Record<string, any>;
}

export interface JWTAuthOptions {
  organizationId: string;
  parentOrganizationId: string;
  jwtToken: string;
  customAuthData?: Record<string, any>;
}

export class PhantomConnectAuth {
  async authenticate(options: PhantomConnectOptions): Promise<AuthResult> {
    const baseUrl = "https://connect.phantom.app";
    const params = new URLSearchParams({
      organizationId: options.organizationId,
      parentOrganizationId: options.parentOrganizationId,
      redirectUrl: options.redirectUrl || window.location.href,
    });

    // Add provider if specified (will skip provider selection)
    if (options.provider) {
      params.append("provider", options.provider);
    }

    // Add custom auth data if provided
    if (options.customAuthData) {
      params.append("authData", JSON.stringify(options.customAuthData));
    }

    // Generate state token for CSRF protection
    const state = this.generateStateToken();
    params.append("state", state);

    // Store state and auth context in session storage
    sessionStorage.setItem("phantom-auth-state", state);
    sessionStorage.setItem("phantom-auth-context", JSON.stringify({
      organizationId: options.organizationId,
      parentOrganizationId: options.parentOrganizationId,
      provider: options.provider,
    }));

    const authUrl = `${baseUrl}?${params.toString()}`;

    // Redirect to Phantom Connect
    window.location.href = authUrl;

    // This method won't return since we're redirecting
    // The actual auth result will be processed after redirect back
    throw new Error("Redirecting to authentication...");
  }

  private generateStateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  static resumeAuthFromRedirect(): AuthResult | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletId = urlParams.get("walletId");
      const provider = urlParams.get("provider");
      const state = urlParams.get("state");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");

      if (error) {
        const errorMsg = errorDescription || error;
        switch (error) {
          case "access_denied":
            throw new Error(`Authentication cancelled: ${errorMsg}`);
          case "invalid_request":
            throw new Error(`Invalid authentication request: ${errorMsg}`);
          case "server_error":
            throw new Error(`Authentication server error: ${errorMsg}`);
          case "temporarily_unavailable":
            throw new Error(`Authentication service temporarily unavailable: ${errorMsg}`);
          default:
            throw new Error(`Authentication failed: ${errorMsg}`);
        }
      }

      if (!walletId || !state) {
        return null; // No auth data in URL
      }

      // Verify state token
      const storedState = sessionStorage.getItem("phantom-auth-state");
      if (!storedState) {
        throw new Error("No stored authentication state found - session may have expired");
      }
      
      if (state !== storedState) {
        throw new Error("Invalid state token - possible CSRF attack or expired session");
      }

      // Get stored auth context
      const contextStr = sessionStorage.getItem("phantom-auth-context");
      let context = {};
      if (contextStr) {
        try {
          context = JSON.parse(contextStr);
        } catch (parseError) {
          console.warn("Failed to parse stored auth context:", parseError);
        }
      }

      // Clean up session storage
      sessionStorage.removeItem("phantom-auth-state");
      sessionStorage.removeItem("phantom-auth-context");

      return {
        walletId,
        provider: provider || context.provider,
        userInfo: context,
      };
    } catch (error) {
      // Clean up session storage on any error
      sessionStorage.removeItem("phantom-auth-state");
      sessionStorage.removeItem("phantom-auth-context");
      throw error;
    }
  }
}

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
          "Authorization": `Bearer ${options.jwtToken}`,
        },
        body: JSON.stringify({
          organizationId: options.organizationId,
          parentOrganizationId: options.parentOrganizationId,
          customAuthData: options.customAuthData,
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
      
      return {
        walletId: result.walletId,
        provider: "jwt",
        userInfo: result.userInfo || {},
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
