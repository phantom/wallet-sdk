import type { DebugLogger } from "@phantom/embedded-provider-core";

export class ExpoLogger implements DebugLogger {
  private readonly enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  info(category: string, message: string, data?: any): void {
    if (this.enabled) {
      console.info(`[${category}] ${message}`, data);
    }
  }

  warn(category: string, message: string, data?: any): void {
    if (this.enabled) {
      console.warn(`[${category}] ${message}`, data);
    }
  }

  error(category: string, message: string, data?: any): void {
    if (this.enabled) {
      console.error(`[${category}] ${message}`, data);
    }
  }

  log(category: string, message: string, data?: any): void {
    if (this.enabled) {
      console.log(`[${category}] ${message}`, data);
    }
  }
}
