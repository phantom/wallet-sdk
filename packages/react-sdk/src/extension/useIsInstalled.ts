import * as React from "react";
import { usePhantom } from "../PhantomContext";
import { assertExtensionConfigured } from "./assertions";

export function useIsInstalled() {
  const { phantom, isReady } = usePhantom();

  const isInstalled = React.useMemo(() => {
    if (!isReady) return;
    assertExtensionConfigured(phantom);

    return phantom.extension.isInstalled();
  }, [phantom, isReady]);

  return { isInstalled };
}
