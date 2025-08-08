import { useState, useCallback } from "react";
import { usePhantom } from "../PhantomProvider";
import type { SignAndSendTransactionParams, SignedTransaction } from "../types";

export function useSignAndSendTransaction() {
  const { sdk } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signAndSendTransaction = useCallback(
    async (params: SignAndSendTransactionParams): Promise<SignedTransaction> => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      setIsSigning(true);
      setError(null);

      try {
        const result = await sdk.signAndSendTransaction(params);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
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
