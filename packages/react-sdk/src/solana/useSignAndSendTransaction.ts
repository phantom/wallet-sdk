import { usePhantom } from "../PhantomContext"; // Assuming this provides the SDK instance
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { useCallback } from "react";

interface UseSignAndSendTransactionResult {
  signAndSendTransaction: (
    transaction: Transaction | VersionedTransaction,
  ) => Promise<{ signature: string; publicKey?: string }>;
}

export function useSignAndSendTransaction(): UseSignAndSendTransactionResult {
  const { phantom } = usePhantom();

  const signAndSendTransaction = useCallback(
    async (transaction: Transaction | VersionedTransaction) => {
      if (!phantom?.solana) {
        throw new Error("Phantom Solana provider not available.");
      }
      const result = await phantom.solana.signAndSendTransaction(transaction);
      return result;
    },
    [phantom],
  );

  return { signAndSendTransaction };
}
