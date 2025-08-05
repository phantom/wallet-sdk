import { useCallback, useState } from "react";
import { usePhantom, type ConnectOptions } from "../PhantomProvider";

export function useConnect() {
  const context = usePhantom();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(
    async (options?: ConnectOptions) => {
      if (!context.sdk || !context.isReady) {
        throw new Error("SDK not initialized");
      }

      setIsConnecting(true);
      setError(null);

      try {
        const result = await context.sdk.connect(options);

        // Trigger context state update after connection
        if ((context.sdk as any)._updateConnectionState) {
          await (context.sdk as any)._updateConnectionState();
        }

        return result;
      } catch (err) {
        console.error("Error connecting to Phantom:", err);
        setError(err as Error);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [context.sdk, context.isReady],
  );

  return {
    connect,
    isConnecting,
    error,
    currentProviderType: context.currentProviderType,
    isPhantomAvailable: context.isPhantomAvailable,
  };
}
