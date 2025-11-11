/**
 * Check if current URL is an auth callback with failure response.
 * Failure callbacks have session_id and response_type=failure.
 */
export function isAuthFailureCallback(searchParams?: URLSearchParams): boolean {
  if (typeof window === "undefined" && !searchParams) return false;

  const params = searchParams || new URLSearchParams(window.location.search);
  const responseType = params.get("response_type");
  const sessionId = params.get("session_id");

  return responseType === "failure" && !!sessionId;
}

/**
 * Check if current URL appears to be an auth callback (success or failure).
 * Success callbacks have session_id and wallet_id.
 * Failure callbacks have session_id and response_type=failure.
 */
export function isAuthCallbackUrl(searchParams?: URLSearchParams): boolean {
  if (typeof window === "undefined" && !searchParams) return false;

  const params = searchParams || new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  return !!(sessionId && (params.has("response_type") || params.has("wallet_id")));
}
