import type { EmbeddedStorage } from "./storage";
import type { AuthProvider } from "./auth";
import type { URLParamsAccessor } from "./url-params";

export interface Stamper {
  init(): Promise<{ keyId: string; publicKey: string }>;
  sign(data: string | Uint8Array | Buffer): Promise<string>;
  stamp(payload: any): Promise<string>;
  getKeyInfo(): { keyId: string; publicKey: string } | null;
  resetKeyPair?(): Promise<{ keyId: string; publicKey: string }>;
  clear?(): Promise<void>;
}

export interface PlatformAdapter {
  storage: EmbeddedStorage;
  authProvider: AuthProvider;
  urlParamsAccessor: URLParamsAccessor;
  stamper: Stamper;
}

export interface DebugLogger {
  info(category: string, message: string, data?: any): void;
  warn(category: string, message: string, data?: any): void;
  error(category: string, message: string, data?: any): void;
  log(category: string, message: string, data?: any): void;
}
