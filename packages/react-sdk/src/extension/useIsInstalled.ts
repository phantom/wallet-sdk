import * as React from "react";
import { usePhantom } from "../PhantomContext";

export function useIsInstalled() {
  const { phantom } = usePhantom();

  const isInstalled = React.useCallback(async () => {
    if (!phantom?.extension) {
      throw new Error("Phantom extension plugin not found.");
    }

    return await phantom.extension.isInstalled();
  }, [phantom]);

  return { isInstalled };
}
