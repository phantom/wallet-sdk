import { useCallback, useState } from "react";
import { usePhantom } from "../PhantomProvider";
import type { SignedTransaction, SignAndSendTransactionParams } from "@phantom/browser-sdk";

export function useSignAndSendTransaction() {
  const { sdk } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signAndSendTransaction = useCallback(
    async (params: SignAndSendTransactionParams): Promise<SignedTransaction> => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      if (!sdk.isConnected()) {
        throw new Error("Wallet not connected");
      }

      setIsSigning(true);
      setError(null);

      try {
        const result = await sdk.signAndSendTransaction(params);
        return result;
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
    signAndSendTransaction,
    isSigning,
    error,
  };
}
