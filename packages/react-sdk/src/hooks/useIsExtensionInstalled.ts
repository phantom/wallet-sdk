import * as React from "react";
import { usePhantom } from "../PhantomProvider";

export function useIsExtensionInstalled() {
  const { sdk } = usePhantom();

  const isInstalled = React.useCallback(async () => {
    if (!sdk) {
      throw new Error("SDK not initialized");
    }
    return await sdk.waitForPhantomExtension(1000);
  }, [sdk]);

  return { isInstalled };
}
