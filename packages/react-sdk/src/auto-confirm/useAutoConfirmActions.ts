import * as React from "react";
import { usePhantom } from "../PhantomContext";
import { assertAutoConfirmConfigured } from "./assertions";
import type { AutoConfirmActions, AutoConfirmEnableParams } from "./types";

/**
 * React hook that provides actions to enable and disable auto-confirm.
 * Operations are async and will trigger state updates in useAutoConfirmState.
 *
 * @returns Object containing enable and disable functions
 */
export function useAutoConfirmActions(): AutoConfirmActions {
  const { phantom, isReady } = usePhantom();

  const enable = React.useCallback(async (params?: AutoConfirmEnableParams) => {
    if (!isReady) {
      throw new Error("Phantom is not ready");
    }

    assertAutoConfirmConfigured(phantom);
    await phantom.autoConfirm.autoConfirmEnable(params);

    // Notify state hook of changes
    window.dispatchEvent(new CustomEvent("phantomAutoConfirmStateChanged"));
  }, [phantom, isReady]);

  const disable = React.useCallback(async () => {
    if (!isReady) {
      throw new Error("Phantom is not ready");
    }

    assertAutoConfirmConfigured(phantom);
    await phantom.autoConfirm.autoConfirmDisable();

    // Notify state hook of changes
    window.dispatchEvent(new CustomEvent("phantomAutoConfirmStateChanged"));
  }, [phantom, isReady]);

  return {
    enable,
    disable,
  };
}