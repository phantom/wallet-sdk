import * as SecureStore from "expo-secure-store";
import type { EmbeddedStorage, Session } from "@phantom/embedded-provider-core";

export class ExpoSecureStorage implements EmbeddedStorage {
  private readonly sessionKey = "phantom_session";
  private readonly requireAuth: boolean;

  constructor(requireAuth: boolean = false) {
    this.requireAuth = requireAuth;
  }

  async saveSession(session: Session): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.sessionKey, JSON.stringify(session), {
        requireAuthentication: this.requireAuth,
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error("[ExpoSecureStorage] Failed to save session", { error: (error as Error).message });
      throw new Error(`Failed to save session: ${(error as Error).message}`);
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      const sessionData = await SecureStore.getItemAsync(this.sessionKey, {
        requireAuthentication: this.requireAuth,
      });

      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData) as Session;
    } catch (error) {
      console.error("[ExpoSecureStorage] Failed to load session", { error: (error as Error).message });
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.sessionKey);
    } catch (error) {
      console.error("[ExpoSecureStorage] Failed to clear session", { error: (error as Error).message });
      // Don't throw here, clearing should be resilient
    }
  }

  // Method to update authentication requirement
  setRequireAuth(_requireAuth: boolean): void {
    // Note: this.requireAuth is readonly, so we can't actually change it
    // This would require recreating the storage instance
    console.warn("[ExpoSecureStorage] Cannot change requireAuth after initialization");
  }
}
