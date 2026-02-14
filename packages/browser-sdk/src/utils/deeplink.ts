/**
 * Generates a deeplink URL to open the current page in Phantom mobile app
 * @param ref Optional referrer parameter
 * @returns Phantom mobile app deeplink URL
 */
export function getDeeplinkToPhantom(ref?: string, currentHref?: string): string {
  // Validate URL protocol before creating deeplink - only HTTP/HTTPS are safe
  const resolvedHref = currentHref ?? window.location.href;
  if (!resolvedHref.startsWith("http:") && !resolvedHref.startsWith("https:")) {
    throw new Error("Invalid URL protocol - only HTTP/HTTPS URLs are supported for deeplinks");
  }

  const currentUrl = encodeURIComponent(resolvedHref);
  const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  return `https://phantom.app/ul/browse/${currentUrl}${refParam}`;
}
