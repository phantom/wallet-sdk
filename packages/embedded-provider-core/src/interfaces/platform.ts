import type { EmbeddedStorage } from "./storage";
import type { AuthProvider } from "./auth";
import type { URLParamsAccessor } from "./url-params";

export interface PlatformAdapter {
  storage: EmbeddedStorage;
  authProvider: AuthProvider;
  urlParamsAccessor: URLParamsAccessor;
}

export interface DebugLogger {
  info(category: string, message: string, data?: any): void;
  warn(category: string, message: string, data?: any): void;
  error(category: string, message: string, data?: any): void;
  log(category: string, message: string, data?: any): void;
}
