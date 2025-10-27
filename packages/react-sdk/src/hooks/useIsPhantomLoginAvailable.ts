import * as React from "react";
import { isPhantomLoginAvailable } from "@phantom/browser-sdk";

/**
 * React hook to check if Phantom Login is available
 * Checks if extension is installed and supports phantom_login feature
 */
export function useIsPhantomLoginAvailable() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAvailable, setIsAvailable] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const checkPhantomLogin = async () => {
      try {
        setIsLoading(true);
        const result = await isPhantomLoginAvailable(3000);
        if (isMounted) {
          setIsAvailable(result);
        }
      } catch (error) {
        // If check fails, assume not available
        if (isMounted) {
          setIsAvailable(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkPhantomLogin();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoading, isAvailable };
}
