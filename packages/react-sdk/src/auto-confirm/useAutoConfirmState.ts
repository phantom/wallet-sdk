import * as React from "react";
import { usePhantom } from "../PhantomContext";
import { assertAutoConfirmConfigured } from "./assertions";
import type { AutoConfirmState, NetworkID, AutoConfirmResult } from "./types";

/**
 * React hook that provides the current auto-confirm status and supported chains.
 * Automatically updates when auto-confirm is enabled or disabled.
 *
 * @returns Object containing status, supportedChains, isLoading, and error
 */
export function useAutoConfirmState(): AutoConfirmState {
  const { phantom, isReady } = usePhantom();

  const [status, setStatus] = React.useState<AutoConfirmResult | null>(null);
  const [supportedChains, setSupportedChains] = React.useState<NetworkID[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const updateState = React.useCallback(async () => {
    if (!isReady) return;

    try {
      assertAutoConfirmConfigured(phantom);
      setError(null);
      
      // Only show loading state on initial load (when status is null)
      const isInitialLoad = status === null;
      if (isInitialLoad) {
        setIsLoading(true);
      }

      const [statusResult, supportedChainsResult] = await Promise.all([
        phantom.autoConfirm.autoConfirmStatus(),
        phantom.autoConfirm.autoConfirmSupportedChains(),
      ]);

      setStatus(statusResult);
      setSupportedChains(supportedChainsResult.chains);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch auto-confirm state"));
      setStatus(null);
      setSupportedChains(null);
    } finally {
      // Only set loading to false if we set it to true (initial load)
      const isInitialLoad = status === null;
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [phantom, isReady, status]);

  React.useEffect(() => {
    updateState();

    // Listen for custom events that indicate state changes
    const handleStateChange = () => {
      updateState();
    };

    // We'll dispatch these events from the actions hook
    window.addEventListener("phantomAutoConfirmStateChanged", handleStateChange);

    return () => {
      window.removeEventListener("phantomAutoConfirmStateChanged", handleStateChange);
    };
  }, [updateState]);

  return {
    status,
    supportedChains,
    isLoading,
    error,
  };
}