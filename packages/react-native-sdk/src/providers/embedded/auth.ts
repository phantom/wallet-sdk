import * as WebBrowser from "expo-web-browser";
import type { AuthProvider, AuthResult, PhantomConnectOptions, JWTAuthOptions } from "@phantom/embedded-provider-core";
import { DEFAULT_AUTH_URL } from "@phantom/constants";

export class ExpoAuthProvider implements AuthProvider {
  async authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult> {
    // Handle JWT authentication
    if ("jwtToken" in options) {
      // JWT authentication doesn't require web browser flow
      // Return void to indicate the auth provider handled the authentication
      return;
    }

    // Handle redirect-based authentication
    const phantomOptions = options as PhantomConnectOptions;
    const { authUrl, redirectUrl, organizationId, parentOrganizationId, sessionId, provider, customAuthData, appId } =
      phantomOptions;

    if (!redirectUrl) {
      throw new Error("redirectUrl is required for web browser authentication");
    }

    if (!organizationId || !sessionId || !appId) {
      throw new Error("organizationId, sessionId and appId are required for authentication");
    }

    try {
      // Construct the authentication URL with required parameters
      const baseUrl = authUrl || DEFAULT_AUTH_URL;

      const params = new URLSearchParams({
        organization_id: organizationId,
        parent_organization_id: parentOrganizationId,
        app_id: appId,
        redirect_uri: redirectUrl,
        session_id: sessionId,
        clear_previous_session: "true",
      });

      // Add provider if specified (will skip provider selection)
      if (provider) {
        console.log("[ExpoAuthProvider] Provider specified, will skip selection", { provider });
        params.append("provider", provider);
      } else {
        // Default to Google if no provider specified
        console.log("[ExpoAuthProvider] No provider specified, defaulting to Google");
        params.append("provider", "google");
      }

      // Add custom auth data if provided
      if (customAuthData) {
        console.log("[ExpoAuthProvider] Adding custom auth data");
        params.append("authData", JSON.stringify(customAuthData));
      }

      const fullAuthUrl = `${baseUrl}?${params.toString()}`;

      console.log("[ExpoAuthProvider] Starting authentication", {
        baseUrl,
        redirectUrl,
        organizationId,
        parentOrganizationId,
        sessionId,
        provider,
        hasCustomData: !!customAuthData,
      });

      // Configure the web browser for better UX
      await WebBrowser.warmUpAsync();

      const result = await WebBrowser.openAuthSessionAsync(fullAuthUrl, redirectUrl, {
        // Use system browser on iOS for ASWebAuthenticationSession
        preferEphemeralSession: false,
      });

      console.log("[ExpoAuthProvider] Authentication result", {
        type: result.type,
        url: result.type === "success" && result.url ? result.url.substring(0, 100) + "..." : undefined,
      });

      if (result.type === "success" && result.url) {
        // Parse the URL to extract parameters
        const url = new URL(result.url);
        const walletId = url.searchParams.get("wallet_id");
        const provider = url.searchParams.get("provider");
        const accountDerivationIndex = url.searchParams.get("selected_account_index");

        if (!walletId) {
          throw new Error("Authentication failed: no walletId in redirect URL");
        }

        return {
          walletId,
          provider: provider || undefined,
          accountDerivationIndex: accountDerivationIndex ? parseInt(accountDerivationIndex) : undefined,
        };
      } else if (result.type === "cancel") {
        throw new Error("User cancelled authentication");
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("[ExpoAuthProvider] Authentication error", error);
      throw error;
    } finally {
      // Clean up browser warming
      await WebBrowser.coolDownAsync();
    }
  }

  isAvailable(): Promise<boolean> {
    // WebBrowser is always available in Expo
    return Promise.resolve(true);
  }
}
