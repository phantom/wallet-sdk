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
    let isMounted = true;

    const checkExtension = async () => {
      try {
        setIsLoading(true);
        const result = await waitForPhantomExtension(3000);
        if (isMounted) {
          setIsInstalled(result);
        }
      } catch (error) {
        // If check fails, assume not installed
        if (isMounted) {
          setIsInstalled(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkExtension();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoading, isInstalled };
}
