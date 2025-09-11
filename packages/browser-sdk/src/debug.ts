export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface DebugMessage {
  timestamp: number;
  level: DebugLevel;
  category: string;
  message: string;
  data?: any;
}

export type DebugCallback = (message: DebugMessage) => void;

export class Debug {
  private static instance: Debug;
  private callback?: DebugCallback;
  private level: DebugLevel = DebugLevel.ERROR;
  private enabled: boolean = false;

  private constructor() {}

  static getInstance(): Debug {
    if (!Debug.instance) {
      Debug.instance = new Debug();
    }
    return Debug.instance;
  }

  setCallback(callback: DebugCallback) {
    this.callback = callback;
  }

  setLevel(level: DebugLevel) {
    this.level = level;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  private writeLog(level: DebugLevel, category: string, message: string, data?: any) {
    if (!this.enabled || level > this.level) {
      return;
    }

    const debugMessage: DebugMessage = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    };

    // Call the callback if provided
    if (this.callback) {
      this.callback(debugMessage);
    }
  }

  error(category: string, message: string, data?: any) {
    this.writeLog(DebugLevel.ERROR, category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.writeLog(DebugLevel.WARN, category, message, data);
  }

  info(category: string, message: string, data?: any) {
    this.writeLog(DebugLevel.INFO, category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.writeLog(DebugLevel.DEBUG, category, message, data);
  }

  log(category: string, message: string, data?: any) {
    this.writeLog(DebugLevel.DEBUG, category, message, data);
  }
}

// Export singleton instance
export const debug = Debug.getInstance();

// Category constants for consistency
export const DebugCategory = {
  BROWSER_SDK: "BrowserSDK",
  PROVIDER_MANAGER: "ProviderManager",
  EMBEDDED_PROVIDER: "EmbeddedProvider",
  INJECTED_PROVIDER: "InjectedProvider",
  PHANTOM_CONNECT_AUTH: "PhantomConnectAuth",
  JWT_AUTH: "JWTAuth",
  STORAGE: "Storage",
  SESSION: "Session",
} as const;
