import { useCallback, useState } from "react";
import { usePhantom } from "../PhantomProvider";
import type { NetworkId } from "@phantom/browser-sdk";

export function useSignMessage() {
  const { sdk, isConnected } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signMessage = useCallback(
    async (message: string, networkId: NetworkId): Promise<string> => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      setIsSigning(true);
      setError(null);

      try {
        const signature = await sdk.signMessage(message, networkId);
        return signature;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSigning(false);
      }
    },
    [sdk, isConnected],
  );

  return {
    signMessage,
    isSigning,
    error,
  };
}
