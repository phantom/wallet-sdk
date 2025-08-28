import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";

/**
 * Wait for Phantom extension to become available
 * 
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 3000ms)
 * @returns Promise that resolves to true if extension is found, false if timeout
 * 
 * @example
 * ```typescript
 * import { waitForPhantomExtension } from "@phantom/browser-sdk";
 * 
 * const isAvailable = await waitForPhantomExtension(5000);
 * if (isAvailable) {
 *   console.log("Phantom extension is available!");
 * } else {
 *   console.log("Phantom extension not found within timeout");
 * }
 * ```
 */
export async function waitForPhantomExtension(timeoutMs?: number): Promise<boolean> {
  const isInstalled = async (retries = 3, timeAccumulated = 0): Promise<boolean> => {
    const installed = isPhantomExtensionInstalled();
    if (installed) return true;
    if (retries <= 0) return false;
    if (timeAccumulated >= (timeoutMs || 3000)) return false;

    return new Promise(resolve => {
      setTimeout(async () => {
        const result = await isInstalled(retries - 1, timeAccumulated + 100);
        resolve(result);
      }, 100);
    });
  };
  return isInstalled();
}