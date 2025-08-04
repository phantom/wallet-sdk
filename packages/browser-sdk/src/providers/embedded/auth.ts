
import { debug, DebugCategory } from "../../debug";

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
  authUrl?: string;
  sessionId: string;
}

export interface JWTAuthOptions {
  organizationId: string;
  parentOrganizationId: string;
  jwtToken: string;
  customAuthData?: Record<string, any>;
}

export class PhantomConnectAuth {
  authenticate(options: PhantomConnectOptions) {
    debug.info(DebugCategory.PHANTOM_CONNECT_AUTH, 'Starting Phantom Connect authentication', {
      organizationId: options.organizationId,
      parentOrganizationId: options.parentOrganizationId,
      provider: options.provider,
      authUrl: options.authUrl,
      hasCustomData: !!options.customAuthData
    });

    const baseUrl = options.authUrl || "https://connect.phantom.app";
    debug.debug(DebugCategory.PHANTOM_CONNECT_AUTH, 'Using auth URL', { baseUrl });

    const params = new URLSearchParams({
      organization_id: options.organizationId,
      parent_organization_id: options.parentOrganizationId,
      redirect_uri: options.redirectUrl || window.location.href,
      session_id: options.sessionId,
      clear_previous_session: true.toString(),
    });

    // Add provider if specified (will skip provider selection)
    if (options.provider) {
      debug.debug(DebugCategory.PHANTOM_CONNECT_AUTH, 'Provider specified, will skip selection', { provider: options.provider });
      params.append("provider", options.provider);
    } else {
      // Default to Google if no provider specified
      debug.debug(DebugCategory.PHANTOM_CONNECT_AUTH, 'No provider specified, defaulting to Google');
      // Note: Phantom Connect currently defaults to Google if no provider is specified
      params.append("provider", "google");
    }

    // Add custom auth data if provided
    if (options.customAuthData) {
      debug.debug(DebugCategory.PHANTOM_CONNECT_AUTH, 'Adding custom auth data');
      params.append("authData", JSON.stringify(options.customAuthData));
    }

    // Store auth context in session storage for validation after redirect
    const authContext = {
      organizationId: options.organizationId,
      parentOrganizationId: options.parentOrganizationId,
      provider: options.provider,
      sessionId: options.sessionId,
    };
    
    sessionStorage.setItem("phantom-auth-context", JSON.stringify(authContext));
    debug.debug(DebugCategory.PHANTOM_CONNECT_AUTH, 'Stored auth context in session storage', { authContext });

    const authUrl = `${baseUrl}?${params.toString()}`;
    debug.info(DebugCategory.PHANTOM_CONNECT_AUTH, 'Redirecting to Phantom Connect', { authUrl });

    // Redirect to Phantom Connect
    window.location.href = authUrl;

    // This method won't return since we're redirecting
    // The actual auth result will be processed after redirect back
    throw new Error("Redirecting to authentication...");
  }


  static generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + '_' + Date.now();
  }

  static resumeAuthFromRedirect(): AuthResult | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletId = urlParams.get("wallet_id");
      const provider = urlParams.get("provider");
      const sessionId = urlParams.get("session_id");
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

      if (!walletId || !sessionId) {
        debug.debug(DebugCategory.PHANTOM_CONNECT_AUTH, 'Missing auth parameters in URL', {
          hasWalletId: !!walletId,
          hasSessionId: !!sessionId
        });
        return null; // No auth data in URL
      }

      // Get stored auth context
      const contextStr = sessionStorage.getItem("phantom-auth-context");
      let context: any = {};
      if (contextStr) {
        try {
          context = JSON.parse(contextStr);
        } catch (parseError) {
          debug.warn(DebugCategory.PHANTOM_CONNECT_AUTH, "Failed to parse stored auth context", { error: parseError });
        }
      }

      // Verify sessionId matches stored context
      if (context.sessionId && sessionId !== context.sessionId) {
        debug.error(DebugCategory.PHANTOM_CONNECT_AUTH, 'Session ID mismatch', {
          urlSessionId: sessionId,
          storedSessionId: context.sessionId
        });
        throw new Error("Session ID mismatch - possible session corruption or replay attack");
      }

      // Clean up session storage
      sessionStorage.removeItem("phantom-auth-context");

      debug.info(DebugCategory.PHANTOM_CONNECT_AUTH, 'Successfully resumed auth from redirect', {
        walletId,
        provider: provider || context.provider,
        sessionId
      });

      return {
        walletId,
        provider: provider || context.provider,
        userInfo: context,
      };
    } catch (error) {
      // Clean up session storage on any error
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
