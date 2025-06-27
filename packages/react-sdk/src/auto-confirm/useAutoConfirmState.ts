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

  const isMountedRef = React.useRef(true);
  const isInitializedRef = React.useRef(false);

  const [status, setStatus] = React.useState<AutoConfirmResult | null>(null);
  const [supportedChains, setSupportedChains] = React.useState<NetworkID[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateState = React.useCallback(async () => {
    if (!isReady || !isMountedRef.current) return;

    try {
      assertAutoConfirmConfigured(phantom);

      if (!isMountedRef.current) return;
      setError(null);

      // Only show loading state on initial load
      if (status === null && isMountedRef.current) {
        setIsLoading(true);
      }

      const [statusResult, supportedChainsResult] = await Promise.all([
        phantom.autoConfirm.autoConfirmStatus(),
        phantom.autoConfirm.autoConfirmSupportedChains(),
      ]);

      if (!isMountedRef.current) return;

      setStatus(statusResult);
      setSupportedChains(supportedChainsResult.chains);
    } catch (err) {
      if (!isMountedRef.current) return;

      setError(err instanceof Error ? err : new Error("Failed to fetch auto-confirm state"));
      setStatus(null);
      setSupportedChains(null);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [phantom, isReady, status]);

  React.useEffect(() => {
    if (!isInitializedRef.current && isReady) {
      isInitializedRef.current = true;
      updateState();
    }

    const handleStateChange = () => {
      updateState();
    };

    window.addEventListener("phantomAutoConfirmStateChanged", handleStateChange);

    return () => {
      window.removeEventListener("phantomAutoConfirmStateChanged", handleStateChange);
    };
  }, [updateState, isReady]);

  return {
    status,
    supportedChains,
    isLoading,
    error,
  };
}
