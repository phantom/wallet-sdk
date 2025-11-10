import type { EmbeddedStorage } from "./storage";
import type { AuthProvider, PhantomAppProvider } from "./auth";
import type { URLParamsAccessor } from "./url-params";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import type { ClientSideSdkHeaders } from "@phantom/constants";

export interface PlatformAdapter {
  name: string; // Platform identifier like "web", "ios", "android", "react-native", etc.
  // This is used to create identifiable authenticator names in the format:
  // "{platformName}-{shortPubKey}-{timestamp}"
  storage: EmbeddedStorage;
  authProvider: AuthProvider;
  phantomAppProvider: PhantomAppProvider;
  urlParamsAccessor: URLParamsAccessor;
  stamper: StamperWithKeyManagement;
  analyticsHeaders?: Partial<ClientSideSdkHeaders>;
}

export interface DebugLogger {
  info(category: string, message: string, data?: any): void;
  warn(category: string, message: string, data?: any): void;
  error(category: string, message: string, data?: any): void;
  log(category: string, message: string, data?: any): void;
}
