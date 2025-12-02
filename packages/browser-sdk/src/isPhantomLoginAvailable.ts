import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";

/**
 * Check if Phantom Login is available
 *
 * This function checks if:
 * 1. The Phantom extension is installed
 * 2. The extension supports the phantom_login feature
 *
 * @param timeoutMs - Maximum time to wait for extension in milliseconds (default: 3000)
 * @returns Promise<boolean> - true if Phantom Login is available, false otherwise
 *
 * Usage:
 * ```typescript
 * const isAvailable = await isPhantomLoginAvailable();
 * ```
 */
export async function isPhantomLoginAvailable(timeoutMs: number = 3000): Promise<boolean> {
  // First, wait for the extension to be installed
  const extensionInstalled = await waitForExtension(timeoutMs);
  if (!extensionInstalled) {
    return false;
  }

  // Check if the features API is available and returns phantom_login
  try {
    if (!window.phantom?.app?.features || typeof window.phantom.app.features !== "function") {
      return false;
    }

    const response = await window.phantom.app.features();

    if (!Array.isArray(response.features)) {
      return false;
    }

    return response.features.includes("phantom_login");
  } catch (error) {
    console.error("Error checking Phantom extension features", error);
    // If the features call fails, phantom_login is not available
    return false;
  }
}

/**
 * Internal helper to wait for Phantom extension with retry logic
 */
async function waitForExtension(timeoutMs: number): Promise<boolean> {
  return new Promise(resolve => {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    const checkForExtension = () => {
      try {
        if (isPhantomExtensionInstalled()) {
          resolve(true);
          return;
        }
      } catch (error) {
        // Extension check failed, continue trying
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        resolve(false);
        return;
      }

      setTimeout(checkForExtension, checkInterval);
    };

    checkForExtension();
  });
}
