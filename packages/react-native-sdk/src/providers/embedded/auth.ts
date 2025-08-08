import { InAppBrowser } from "react-native-inappbrowser-reborn";
import type { AuthProvider, AuthResult, PhantomConnectOptions, JWTAuthOptions } from "@phantom/embedded-provider-core";

export class ReactNativeAuthProvider implements AuthProvider {
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
      console.log("[ReactNativeAuthProvider] Starting authentication", {
        authUrl: authUrl.substring(0, 50) + "...",
        redirectUrl,
      });

      const isAvailable = await InAppBrowser.isAvailable();
      if (!isAvailable) {
        throw new Error("InAppBrowser is not available on this device");
      }

      const result = await InAppBrowser.openAuth(authUrl, redirectUrl, {
        // iOS options
        ephemeralWebSession: false,
        // Android options
        showTitle: true,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
      });

      console.log("[ReactNativeAuthProvider] Authentication result", {
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
      console.error("[ReactNativeAuthProvider] Authentication error", error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await InAppBrowser.isAvailable();
    } catch (error) {
      console.error("[ReactNativeAuthProvider] Failed to check InAppBrowser availability", error);
      return false;
    }
  }
}
