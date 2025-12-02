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

      const initialWallets: InjectedWalletInfo[] = sdk.getDiscoveredWallets();

      if (initialWallets.length > 0) {
        setWallets(initialWallets);
        setIsLoading(false);
      } else {
        await sdk.discoverWallets();
        const discoveredWallets = sdk.getDiscoveredWallets();
        setWallets(discoveredWallets);
        setIsLoading(false);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch discovered wallets");
      setError(error);
      setWallets([]);
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
