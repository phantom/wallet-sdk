import { useCallback } from "react";
import { usePhantom } from "../PhantomProvider";
import type { ConnectOptions, ConnectResult } from "../types";

export function useConnect() {
  const { sdk, isConnecting, connectError, setWalletId } = usePhantom();

  const connect = useCallback(
    async (_options?: ConnectOptions): Promise<ConnectResult> => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      // Note: isConnecting state is now managed by connect_start/connect_error events in Provider
      // This ensures consistency between manual connect and autoConnect with zero race conditions
      try {
        const result = await sdk.connect();

        // Set the walletId from the connect result for immediate access
        if (result.status === "completed" && result.walletId) {
          setWalletId(result.walletId);
        }

        return result;
      } catch (err) {
        const error = err as Error;
        // Error handling is also managed by the connect_error event listener in Provider
        throw error;
      }
    },
    [sdk, setWalletId],
  );

  return {
    connect,
    isConnecting,
    error: connectError,
  };
}
