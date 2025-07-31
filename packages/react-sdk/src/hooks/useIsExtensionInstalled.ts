import * as React from "react";
import { usePhantom } from "../PhantomProvider";

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
    const checkExtension = async () => {
      try {
        setIsLoading(true);
        const result = await sdk.waitForPhantomExtension(1000);
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
