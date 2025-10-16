import type { PhantomAppProvider, PhantomAppAuthOptions, AuthResult } from "@phantom/embedded-provider-core";

/**
 * React Native implementation of PhantomAppProvider.
 *
 * Note: React Native does not have access to browser extensions,
 * so this implementation always returns false for isAvailable()
 * and throws an error if authenticate() is called.
 *
 * In the future, this could be extended to support deep linking
 * to the Phantom mobile app.
 */
export class ReactNativePhantomAppProvider implements PhantomAppProvider {
  isAvailable(): boolean {
    // React Native doesn't have browser extensions
    // In the future, we could check if the Phantom app is installed
    // via deep link availability checks
    return false;
  }

  async authenticate(_options: PhantomAppAuthOptions): Promise<AuthResult> {
    throw new Error(
      "Phantom app authentication is not available in React Native. " +
      "Please use other authentication methods like Google, Apple, or JWT."
    );
  }
}
