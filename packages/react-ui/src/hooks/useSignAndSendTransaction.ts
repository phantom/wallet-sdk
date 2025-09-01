import { useCallback } from "react";
import { usePhantomUI } from "../PhantomUIProvider";
import type { ParsedTransactionResult } from "@phantom/parsers";

// Generic transaction params that support both Solana and Ethereum
interface TransactionParams {
  chain: 'solana' | 'ethereum';
  transaction: any;
}

export interface UseSignAndSendTransactionResult {
  signAndSendTransaction: (params: TransactionParams) => Promise<ParsedTransactionResult>;
  isLoading: boolean;
  error: Error | null;
}

export function useSignAndSendTransaction(): UseSignAndSendTransactionResult {
  const ui = usePhantomUI();

  const signAndSendTransaction = useCallback(
    async (params: TransactionParams): Promise<ParsedTransactionResult> => {
      return await ui.signAndSendTransaction(params);
    },
    [ui],
  );

  return {
    signAndSendTransaction,
    isLoading: ui.transactionState.isLoading,
    error: ui.transactionState.error,
  };
}
