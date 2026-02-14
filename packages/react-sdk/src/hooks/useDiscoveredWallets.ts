import { useCallback, useState, useEffect } from "react";
import { usePhantom } from "../PhantomContext";
import type { InjectedWalletInfo } from "@phantom/browser-sdk";

export interface UseDiscoveredWalletsResult {
  wallets: InjectedWalletInfo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDiscoveredWallets(): UseDiscoveredWalletsResult {
  const { sdk } = usePhantom();
  const [wallets, setWallets] = useState<InjectedWalletInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    if (!sdk) {
      setWallets([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Always await discoverWallets() first to ensure discovery has fully resolved.
      // This reuses the existing discovery promise if one is in progress (started by
      // the BrowserSDK constructor), so it won't trigger a redundant discovery.
      // Without this, getDiscoveredWallets() may return empty because discovery
      // hasn't finished yet, causing the hook to report no wallets prematurely.
      await sdk.discoverWallets();
      const discoveredWallets = sdk.getDiscoveredWallets();
      setWallets(discoveredWallets);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch discovered wallets");
      setError(error);
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  // Automatically fetch discovered wallets when SDK becomes available
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    wallets,
    isLoading,
    error,
    refetch,
  };
}
