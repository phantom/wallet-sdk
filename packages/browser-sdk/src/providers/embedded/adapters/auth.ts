import type {
  AuthProvider,
  AuthResult,
  PhantomConnectOptions,
  JWTAuthOptions,
  URLParamsAccessor,
} from "@phantom/embedded-provider-core";
import { debug, DebugCategory } from "../../../debug";
import { DEFAULT_AUTH_URL } from "@phantom/constants";

declare const __SDK_VERSION__: string;

export class BrowserAuthProvider implements AuthProvider {
  private urlParamsAccessor: URLParamsAccessor;

  constructor(urlParamsAccessor: URLParamsAccessor) {
    this.urlParamsAccessor = urlParamsAccessor;
  }

  private getValidatedCurrentUrl(): string {
    const currentUrl = window.location.href;
    if (!currentUrl.startsWith('http:') && !currentUrl.startsWith('https:')) {
      throw new Error('Invalid URL protocol - only HTTP/HTTPS URLs are supported');
    }
    return currentUrl;
  }

  authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult> {
    return new Promise<void>(resolve => {
      // Check if this is JWT auth
      if ("jwtToken" in options) {
        throw new Error("JWT authentication should be handled by the core JWTAuth class");
      }

      const phantomOptions = options as PhantomConnectOptions;

      debug.info(DebugCategory.PHANTOM_CONNECT_AUTH, "Starting Phantom Connect authentication", {
        publicKey: phantomOptions.publicKey,
        appId: phantomOptions.appId,
        provider: phantomOptions.provider,
        authUrl: phantomOptions.authUrl,
      });

      const baseUrl = phantomOptions.authUrl || DEFAULT_AUTH_URL;
      debug.log(DebugCategory.PHANTOM_CONNECT_AUTH, "Using auth URL", { baseUrl });

      const params = new URLSearchParams({
        public_key: phantomOptions.publicKey,
        app_id: phantomOptions.appId,
        redirect_uri: phantomOptions.redirectUrl || (typeof window !== "undefined" ? this.getValidatedCurrentUrl() : ""),
        session_id: phantomOptions.sessionId,
        clear_previous_session: true.toString(),
        sdk_version: __SDK_VERSION__,
      });

      // Add provider if specified (will skip provider selection)
      if (phantomOptions.provider) {
        debug.log(DebugCategory.PHANTOM_CONNECT_AUTH, "Provider specified, will skip selection", {
          provider: phantomOptions.provider,
        });
        params.append("provider", phantomOptions.provider);
      } else {
        // Default to Google if no provider specified
        debug.log(DebugCategory.PHANTOM_CONNECT_AUTH, "No provider specified, defaulting to Google");
        // Note: Phantom Connect currently defaults to Google if no provider is specified
        params.append("provider", "google");
      }

      // Store auth context in session storage for validation after redirect
      const authContext = {
        publicKey: phantomOptions.publicKey,
        appId: phantomOptions.appId,
        provider: phantomOptions.provider,
        sessionId: phantomOptions.sessionId,
      };

      sessionStorage.setItem("phantom-auth-context", JSON.stringify(authContext));
      debug.log(DebugCategory.PHANTOM_CONNECT_AUTH, "Stored auth context in session storage", { authContext });

      const authUrl = `${baseUrl}?${params.toString()}`;
      debug.info(DebugCategory.PHANTOM_CONNECT_AUTH, "Redirecting to Phantom Connect", { authUrl });

      // Validate auth URL before redirect
      if (!authUrl.startsWith('https:') && !authUrl.startsWith('http://localhost')) {
        throw new Error('Invalid auth URL - only HTTPS URLs are allowed for authentication');
      }

      // Redirect to Phantom Connect
      window.location.href = authUrl;

      // The page will redirect, so execution stops here
      // The actual auth result will be processed after redirect back
      resolve();
    });
  }

  resumeAuthFromRedirect(): AuthResult | null {
    try {
      const walletId = this.urlParamsAccessor.getParam("wallet_id");
      const sessionId = this.urlParamsAccessor.getParam("session_id");
      const accountDerivationIndex = this.urlParamsAccessor.getParam("selected_account_index");
      const error = this.urlParamsAccessor.getParam("error");
      const errorDescription = this.urlParamsAccessor.getParam("error_description");

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
        debug.log(DebugCategory.PHANTOM_CONNECT_AUTH, "Missing auth parameters in URL", {
          hasWalletId: !!walletId,
          hasSessionId: !!sessionId,
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
        debug.error(DebugCategory.PHANTOM_CONNECT_AUTH, "Session ID mismatch", {
          urlSessionId: sessionId,
          storedSessionId: context.sessionId,
        });
        throw new Error("Session ID mismatch - possible session corruption or replay attack");
      }

      // Clean up session storage
      sessionStorage.removeItem("phantom-auth-context");

      debug.info(DebugCategory.PHANTOM_CONNECT_AUTH, "Successfully resumed auth from redirect", {
        walletId,
        sessionId,
        accountDerivationIndex: accountDerivationIndex ? parseInt(accountDerivationIndex) : undefined,
      });

      const organizationId = this.urlParamsAccessor.getParam("organization_id");
      const expiresInMs = this.urlParamsAccessor.getParam("expires_in_ms");

      // Log what we're getting for debugging
      debug.log(DebugCategory.PHANTOM_CONNECT_AUTH, "Auth redirect parameters", {
        walletId,
        organizationId,
        sessionId,
        accountDerivationIndex,
        expiresInMs,
      });

      if (!organizationId) {
        debug.error(DebugCategory.PHANTOM_CONNECT_AUTH, "Missing organization_id in auth response");
        throw new Error("Missing organization_id in auth response");
      }

      // Check if we got a temporary organization ID (which indicates server-side issue)
      if (organizationId.startsWith("temp-")) {
        debug.warn(DebugCategory.PHANTOM_CONNECT_AUTH, "Received temporary organization_id, server may not be configured properly", {
          organizationId,
        });
        // Continue anyway - the temp ID might be valid for this session
      }

      return {
        walletId,
        organizationId,
        accountDerivationIndex: accountDerivationIndex ? parseInt(accountDerivationIndex) : 0,
        expiresInMs: expiresInMs ? parseInt(expiresInMs) : 0,
      };
    } catch (error) {
      // Clean up session storage on any error
      sessionStorage.removeItem("phantom-auth-context");
      throw error;
    }
  }
}
