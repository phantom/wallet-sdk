import * as React from "react";
import { usePhantom } from "../PhantomProvider";
import { BrowserSDK } from "@phantom/browser-sdk";

// Session cache for extension installation status
let cachedIsInstalled: boolean | null = null;

export function useIsExtensionInstalled() {
  const { sdk } = usePhantom();
  const [isLoading, setIsLoading] = React.useState(cachedIsInstalled === null);
  const [isInstalled, setIsInstalled] = React.useState(cachedIsInstalled ?? false);

  React.useEffect(() => {
    if (!sdk) {
      setIsLoading(false);
      return;
    }

    // If we have cached result, use it immediately
    if (cachedIsInstalled !== null) {
      setIsInstalled(cachedIsInstalled);
      setIsLoading(false);
      return;
    }

    // Perform the check
    const checkExtension = () => {
      try {
        setIsLoading(true);
        const result = BrowserSDK.isPhantomInstalled();
        cachedIsInstalled = result;
        setIsInstalled(result);
      } catch (error) {
        // If check fails, assume not installed
        cachedIsInstalled = false;
        setIsInstalled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkExtension();
  }, [sdk]);

  return { isLoading, isInstalled };
}
