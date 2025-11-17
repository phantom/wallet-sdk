import { useCallback, useState, useEffect } from "react";
import { usePhantom } from "../PhantomContext";
import type {
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
} from "@phantom/browser-sdk";

export interface UseAutoConfirmResult {
  enable: (params: AutoConfirmEnableParams) => Promise<AutoConfirmResult>;
  disable: () => Promise<void>;
  status: AutoConfirmResult | null;
  supportedChains: AutoConfirmSupportedChainsResult | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAutoConfirm(): UseAutoConfirmResult {
  const { sdk, user } = usePhantom();
  const [status, setStatus] = useState<AutoConfirmResult | null>(null);
  const [supportedChains, setSupportedChains] = useState<AutoConfirmSupportedChainsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isInjected = user?.authProvider === "injected";

  const enable = useCallback(
    async (params: AutoConfirmEnableParams): Promise<AutoConfirmResult> => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }
      if (!isInjected) {
        throw new Error("Auto-confirm is only available for injected (extension) providers");
      }

      try {
        setIsLoading(true);
        setError(null);
        const result = await sdk.enableAutoConfirm(params);
        setStatus(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error occurred");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk, isInjected],
  );

  const disable = useCallback(async (): Promise<void> => {
    if (!sdk) {
      throw new Error("SDK not initialized");
    }
    if (!isInjected) {
      throw new Error("Auto-confirm is only available for injected (extension) providers");
    }

    try {
      setIsLoading(true);
      setError(null);
      await sdk.disableAutoConfirm();
      // Update status after disabling
      const newStatus = await sdk.getAutoConfirmStatus();
      setStatus(newStatus);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInjected]);

  const refetch = useCallback(async (): Promise<void> => {
    if (!sdk || !isInjected) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [statusResult, supportedResult] = await Promise.all([
        sdk.getAutoConfirmStatus(),
        sdk.getSupportedAutoConfirmChains(),
      ]);
      setStatus(statusResult);
      setSupportedChains(supportedResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch auto-confirm data");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInjected]);

  // Automatically fetch status and supported chains when SDK becomes available
  useEffect(() => {
    if (sdk && isInjected) {
      refetch();
    } else {
      // Clear state when not using injected provider
      setStatus(null);
      setSupportedChains(null);
      setError(null);
    }
  }, [sdk, isInjected, refetch]);

  return {
    enable,
    disable,
    status,
    supportedChains,
    isLoading,
    error,
    refetch,
  };
}
