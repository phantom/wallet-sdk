import type { PhantomAppProvider, PhantomAppAuthOptions, AuthResult } from "@phantom/embedded-provider-core";
import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";

/**
 * Browser implementation of PhantomAppProvider that uses the Phantom browser extension
 */
export class BrowserPhantomAppProvider implements PhantomAppProvider {
  /**
   * Check if the Phantom extension is installed in the browser
   */
  isAvailable(): boolean {
    return isPhantomExtensionInstalled();
  }

  /**
   * Authenticate using the Phantom browser extension
   * Calls window.phantom.connect with the authentication parameters
   */
  async authenticate(options: PhantomAppAuthOptions): Promise<AuthResult> {
    if (!this.isAvailable()) {
      throw new Error(
        "Phantom extension is not installed. Please install the Phantom browser extension to use this authentication method.",
      );
    }

    const phantom = (window as any).phantom;

    // Call the extension's app.login method
    // This is a placeholder for the actual extension API that needs to be implemented
    // TODO: Update this when the Phantom extension exposes the app.login method
    if (!phantom.app || !phantom.app.login || typeof phantom.app.login !== "function") {
      throw new Error(
        "Phantom extension authentication is not yet implemented. The extension needs to expose an app.login API (window.phantom.app.login).",
      );
    }

    try {
      // Call the extension app.login method
      const result = await phantom.app.login({
        publicKey: options.publicKey,
        appId: options.appId,
        sessionId: options.sessionId,
      });

      // Validate the response
      if (!result || !result.walletId || !result.organizationId) {
        throw new Error("Invalid authentication response from Phantom extension");
      }

      // Return the authentication result
      return {
        walletId: result.walletId,
        organizationId: result.organizationId,
        provider: "phantom",
        accountDerivationIndex: result.accountDerivationIndex ?? 0,
        expiresInMs: result.expiresInMs ?? 0,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Phantom extension authentication failed: ${String(error)}`);
    }
  }
}
