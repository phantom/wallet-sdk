import * as React from "react";
import { waitForPhantomExtension } from "@phantom/browser-sdk";

/**
 * React hook to check if Phantom extension is installed
 * Uses waitForPhantomExtension for proper detection with retry logic
 */
export function useIsExtensionInstalled() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInstalled, setIsInstalled] = React.useState(false);

  React.useEffect(() => {
    const checkExtension = async () => {
      try {
        setIsLoading(true);
        const result = await waitForPhantomExtension(3000);
        setIsInstalled(result);
      } catch (error) {
        // If check fails, assume not installed
        setIsInstalled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkExtension();
  }, []);

  return { isLoading, isInstalled };
}
