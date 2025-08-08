// Type declarations for Expo modules that are peer dependencies
// These modules are provided by the consumer of this package

declare module "expo-secure-store" {
  export const WHEN_UNLOCKED_THIS_DEVICE_ONLY: string;

  export interface SecureStoreOptions {
    requireAuthentication?: boolean;
    keychainAccessible?: string;
  }

  export function setItemAsync(key: string, value: string, options?: SecureStoreOptions): Promise<void>;
  export function getItemAsync(key: string, options?: SecureStoreOptions): Promise<string | null>;
  export function deleteItemAsync(key: string): Promise<void>;
  export function isAvailableAsync(): Promise<boolean>;
}

declare module "expo-web-browser" {
  export interface WebBrowserResult {
    type: "success" | "cancel" | "dismiss" | "locked";
    url?: string;
  }

  export interface WebBrowserAuthSessionOptions {
    presentationStyle?: string;
    dismissButtonStyle?: string;
    preferEphemeralSession?: boolean;
  }

  export const WebBrowserPresentationStyle: {
    FULL_SCREEN: string;
  };

  export const WebBrowserDismissButtonStyle: {
    CLOSE: string;
  };

  export function openAuthSessionAsync(
    authUrl: string,
    redirectUrl: string,
    options?: WebBrowserAuthSessionOptions,
  ): Promise<WebBrowserResult>;

  export function warmUpAsync(): Promise<void>;
  export function coolDownAsync(): Promise<void>;
}
