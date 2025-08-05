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
