import * as WebBrowser from "expo-web-browser";
import type { AuthProvider, AuthResult, PhantomConnectOptions, JWTAuthOptions } from "@phantom/embedded-provider-core";

export class ExpoAuthProvider implements AuthProvider {
  async authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult> {
    // Handle JWT authentication
    if ("jwtToken" in options) {
      // JWT authentication doesn't require web browser flow
      // Return void to indicate the auth provider handled the authentication
      return;
    }

    // Handle redirect-based authentication
    const { authUrl, redirectUrl } = options;

    if (!authUrl || !redirectUrl) {
      throw new Error("authUrl and redirectUrl are required for web browser authentication");
    }

    try {
      console.log("[ExpoAuthProvider] Starting authentication", {
        authUrl: authUrl.substring(0, 50) + "...",
        redirectUrl,
      });

      // Configure the web browser for better UX
      await WebBrowser.warmUpAsync();

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl, {
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
        const walletId = url.searchParams.get("walletId");
        const provider = url.searchParams.get("provider");

        if (!walletId) {
          throw new Error("Authentication failed: no walletId in redirect URL");
        }

        // Convert URLSearchParams to Record<string, string>
        const userInfo: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          userInfo[key] = value;
        });

        return {
          walletId,
          provider: provider || undefined,
          userInfo,
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
