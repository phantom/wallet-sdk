/**
 * Generates a deeplink URL to open the current page in Phantom mobile app
 * @param ref Optional referrer parameter
 * @returns Phantom mobile app deeplink URL
 */
export function getDeeplinkToPhantom(ref?: string): string {
  const currentUrl = encodeURIComponent(window.location.href);
  const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  return `https://phantom.app/ul/browse/${currentUrl}${refParam}`;
}