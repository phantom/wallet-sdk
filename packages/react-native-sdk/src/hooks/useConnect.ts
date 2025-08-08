import { useState, useCallback } from "react";
import { usePhantom } from "../PhantomProvider";
import type { ConnectOptions, ConnectResult } from "../types";

export function useConnect() {
  const { sdk, updateConnectionState, setWalletId } = usePhantom();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(
    async (options?: ConnectOptions): Promise<ConnectResult> => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      setIsConnecting(true);
      setError(null);

      try {
        const result = await sdk.connect(options);

        // Update connection state after successful connection
        if (result.status === "completed") {
          // Set the walletId from the connect result
          if (result.walletId) {
            setWalletId(result.walletId);
          }
          updateConnectionState();
        }

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    [sdk, updateConnectionState, setWalletId],
  );

  return {
    connect,
    isConnecting,
    error,
  };
}
