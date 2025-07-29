import { useCallback } from "react";
// import { useSignAndSendTransaction as useBaseSignAndSendTransaction } from "@phantom/react-sdk";
import { usePhantomUI } from "../PhantomUIProvider";
import type { NetworkId } from "@phantom/client";

export interface UseSignAndSendTransactionResult {
  signAndSendTransaction: (transaction: any, networkId: NetworkId) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}

export function useSignAndSendTransaction(): UseSignAndSendTransactionResult {
  const ui = usePhantomUI();

  const signAndSendTransaction = useCallback(
    async (transaction: any, networkId: NetworkId): Promise<string> => {
      const result = await ui.signAndSendTransaction({ transaction, networkId });
      return result.rawTransaction;
    },
    [ui],
  );

  return {
    signAndSendTransaction,
    isLoading: ui.transactionState.isLoading,
    error: ui.transactionState.error,
  };
}
