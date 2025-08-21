import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";

interface UseBalanceReturn {
  balance: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBalance(addressValue: string | null): UseBalanceReturn {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";

  const fetchBalance = useCallback(async () => {
    if (!addressValue) {
      setBalance(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const connection = new Connection(rpcUrl);
      const publicKey = new PublicKey(addressValue);
      const balanceInLamports = await connection.getBalance(publicKey);
      const balanceInSol = balanceInLamports / 1_000_000_000; // Convert lamports to SOL
      setBalance(balanceInSol);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [addressValue, rpcUrl]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
}
