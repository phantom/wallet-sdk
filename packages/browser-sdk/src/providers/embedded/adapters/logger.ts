import type { DebugLogger } from "@phantom/embedded-provider-core";
import { debug } from "../../../debug";

export class BrowserLogger implements DebugLogger {
  info(category: string, message: string, data?: any): void {
    debug.info(category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    debug.warn(category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    debug.error(category, message, data);
  }

  log(category: string, message: string, data?: any): void {
    debug.log(category, message, data);
  }
}
