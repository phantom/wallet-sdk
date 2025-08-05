/**
 * URL parameter accessor abstraction
 * 
 * This allows us to abstract URL parameter access for different environments:
 * - Browser: window.location.search via URLSearchParams
 * - React Native: deep links or webview callback URLs
 * - Mobile WebView: in-app browser navigation state
 * 
 * This abstraction makes the auth flow code portable across platforms
 * without needing to mock window.location directly in tests.
 */
export interface URLParamsAccessor {
  /**
   * Get a URL parameter value by key
   * @param key - The parameter key to retrieve
   * @returns The parameter value or null if not found
   */
  getParam(key: string): string | null;
}

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
export const urlParamsAccessor: URLParamsAccessor = new BrowserURLParamsAccessor();