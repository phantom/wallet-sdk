import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";

/**
 * Wait for Phantom extension to be available with retry logic
 *
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 3000)
 * @returns Promise<boolean> - true if Phantom extension is available, false if timeout reached
 *
 * Usage:
 * ```typescript
 * const isAvailable = await waitForPhantomExtension(5000);
 * if (isAvailable) {
 *   console.log("Phantom extension is available!");
 * } else {
 *   console.log("Phantom extension not found or timed out");
 * }
 * ```
 */
export async function waitForPhantomExtension(timeoutMs: number = 3000): Promise<boolean> {
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
