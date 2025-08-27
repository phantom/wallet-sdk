import { useCallback, useState } from "react";
import { usePhantom } from "../PhantomProvider";
import type { SignMessageParams, SignMessageResult } from "@phantom/browser-sdk";

export function useSignMessage() {
  const { sdk } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signMessage = useCallback(
    async (params: SignMessageParams): Promise<SignMessageResult> => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      if (!sdk.isConnected()) {
        throw new Error("Wallet not connected");
      }

      setIsSigning(true);
      setError(null);

      try {
        const signature = await sdk.signMessage(params);
        return signature;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSigning(false);
      }
    },
    [sdk],
  );

  return {
    signMessage,
    isSigning,
    error,
  };
}
