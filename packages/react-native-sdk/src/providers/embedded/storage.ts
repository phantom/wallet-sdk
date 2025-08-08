import * as Keychain from "react-native-keychain";
import type { EmbeddedStorage, Session } from "@phantom/embedded-provider-core";

export class ReactNativeSecureStorage implements EmbeddedStorage {
  private readonly sessionKey = "phantom_session";
  private readonly requireAuth: boolean;

  constructor(requireAuth: boolean = false) {
    this.requireAuth = requireAuth;
  }

  async saveSession(session: Session): Promise<void> {
    try {
      // Check if keychain is available before attempting to save
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new Error("Keychain is not available on this device. Make sure react-native-keychain is properly linked.");
      }

      const options: Keychain.Options = {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        authenticationType: this.requireAuth 
          ? Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
          : undefined,
        service: this.sessionKey,
      };

      await Keychain.setInternetCredentials(
        this.sessionKey,
        this.sessionKey, // username
        JSON.stringify(session), // password (the actual data)
        options
      );
    } catch (error) {
      console.error("[ReactNativeSecureStorage] Failed to save session", { error: (error as Error).message });
      throw new Error(`Failed to save session: ${(error as Error).message}`);
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      const options: Keychain.Options = {
        authenticationType: this.requireAuth 
          ? Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
          : undefined,
        service: this.sessionKey,
      };

      const credentials = await Keychain.getInternetCredentials(this.sessionKey, options);

      if (!credentials || credentials === false) {
        return null;
      }

      return JSON.parse(credentials.password) as Session;
    } catch (error) {
      console.error("[ReactNativeSecureStorage] Failed to load session", { error: (error as Error).message });
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(this.sessionKey);
    } catch (error) {
      console.error("[ReactNativeSecureStorage] Failed to clear session", { error: (error as Error).message });
      // Don't throw here, clearing should be resilient
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // First check if the native module is available
      // This will throw an error if react-native-keychain is not properly linked
      const availableLevel = await Keychain.canImplyAuthentication();
      return availableLevel !== false;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("[ReactNativeSecureStorage] Failed to check keychain availability", { error: errorMessage });
      
      // Check if this is a native module linking issue
      if (errorMessage.includes("Cannot read property") && errorMessage.includes("of null")) {
        console.error("[ReactNativeSecureStorage] react-native-keychain native module is not linked. Please follow the installation instructions.");
      }
      
      return false;
    }
  }

  // Method to update authentication requirement
  setRequireAuth(_requireAuth: boolean): void {
    // Note: this.requireAuth is readonly, so we can't actually change it
    // This would require recreating the storage instance
    console.warn("[ReactNativeSecureStorage] Cannot change requireAuth after initialization");
  }
}
