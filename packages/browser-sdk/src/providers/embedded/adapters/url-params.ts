import type { URLParamsAccessor } from "@phantom/embedded-provider-core";

/**
 * Browser implementation using window.location.search
 */
export class BrowserURLParamsAccessor implements URLParamsAccessor {
  getParam(key: string): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  }
}

/**
 * Default accessor instance for browser environments
 */
export const browserUrlParamsAccessor: URLParamsAccessor = new BrowserURLParamsAccessor();
