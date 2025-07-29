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
        setError(err as Error);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [context.sdk, context.isReady],
  );

  // Helper function to switch provider without connecting
  const switchProvider = useCallback(
    async (type: "injected" | "embedded", options?: { embeddedWalletType?: "app-wallet" | "user-wallet" }) => {
      if (!context.sdk || !context.isReady) {
        throw new Error("SDK not initialized");
      }

      await context.sdk.switchProvider(type, options);

      // Update context state after provider switch
      if ((context.sdk as any)._updateConnectionState) {
        await (context.sdk as any)._updateConnectionState();
      }
    },
    [context.sdk, context.isReady],
  );

  return {
    connect,
    switchProvider,
    isConnecting,
    error,
    currentProviderType: context.currentProviderType,
    isPhantomAvailable: context.isPhantomAvailable,
  };
}
