import { useCallback, useState } from "react";
import { usePhantom, type ConnectOptions } from "../PhantomProvider";

export function useConnect() {
  const { sdk, updateConnectionState, currentProviderType, isPhantomAvailable } = usePhantom();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(
    async (options?: ConnectOptions) => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      setIsConnecting(true);
      setError(null);

      try {
        const result = await sdk.connect(options);
        await updateConnectionState();

        return result;
      } catch (err) {
        console.error("Error connecting to Phantom:", err);
        setError(err as Error);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [sdk, updateConnectionState],
  );

  return {
    connect,
    isConnecting,
    error,
    currentProviderType,
    isPhantomAvailable,
  };
}
