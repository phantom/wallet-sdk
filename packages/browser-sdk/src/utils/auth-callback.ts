/**
 * Utility functions for detecting and validating authentication callback URLs.
 * These functions check URL parameters to determine if the current page is handling
 * an OAuth redirect from the Phantom authentication service.
 */

/**
 * Check if current URL is an auth callback with failure response.
 * Failure callbacks have session_id and response_type=failure.
 *
 * @param searchParams - URLSearchParams to check (defaults to window.location.search)
 * @returns true if this is a failure callback URL
 *
 * @example
 * // Failure callback URL: https://app.com/?session_id=abc123&response_type=failure
 * isAuthFailureCallback() // returns true
 *
 * // Success callback URL: https://app.com/?session_id=abc123&wallet_id=xyz789
 * isAuthFailureCallback() // returns false
 */
export function isAuthFailureCallback(searchParams?: URLSearchParams): boolean {
  if (typeof window === 'undefined' && !searchParams) return false;

  const params = searchParams || new URLSearchParams(window.location.search);
  const responseType = params.get('response_type');
  const sessionId = params.get('session_id');

  return responseType === 'failure' && !!sessionId;
}

/**
 * Check if current URL appears to be an auth callback (success or failure).
 * Success callbacks have session_id and wallet_id.
 * Failure callbacks have session_id and response_type=failure.
 *
 * @param searchParams - URLSearchParams to check (defaults to window.location.search)
 * @returns true if this is any type of auth callback URL
 *
 * @example
 * // Success callback: https://app.com/?session_id=abc123&wallet_id=xyz789
 * isAuthCallbackUrl() // returns true
 *
 * // Failure callback: https://app.com/?session_id=abc123&response_type=failure
 * isAuthCallbackUrl() // returns true
 *
 * // Regular page: https://app.com/
 * isAuthCallbackUrl() // returns false
 */
export function isAuthCallbackUrl(searchParams?: URLSearchParams): boolean {
  if (typeof window === 'undefined' && !searchParams) return false;

  const params = searchParams || new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  // It's a callback if we have session_id with either:
  // - response_type parameter (success or failure)
  // - wallet_id parameter (success)
  return !!(
    sessionId && (
      params.has('response_type') ||
      params.has('wallet_id')
    )
  );
}
