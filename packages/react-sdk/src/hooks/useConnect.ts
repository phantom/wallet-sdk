import { useCallback } from "react";
import { usePhantom, type ConnectOptions } from "../PhantomProvider";

export function useConnect() {
  const { sdk, isConnecting, connectError, currentProviderType, isPhantomAvailable } = usePhantom();

  const connect = useCallback(
    async (options?: ConnectOptions) => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      // Note: isConnecting state is now managed by connect_start/connect_error events in Provider
      // This ensures consistency between manual connect and autoConnect with zero race conditions
      try {
        const result = await sdk.connect(options);
        return result;
      } catch (err) {
        console.error("Error connecting to Phantom:", err);
        // Error handling is also managed by the connect_error event listener in Provider
        throw err;
      }
    },
    [sdk],
  );

  return {
    connect,
    isConnecting,
    error: connectError,
    currentProviderType,
    isPhantomAvailable,
  };
}
