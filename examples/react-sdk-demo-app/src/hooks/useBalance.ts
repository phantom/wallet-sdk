import { useState, useEffect } from 'react';
import { createSolanaRpc, address } from '@solana/kit';

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

  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || 'https://api.mainnet-beta.solana.com';

  const fetchBalance = async () => {
    if (!addressValue) {
      setBalance(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rpc = createSolanaRpc(rpcUrl);
      const publicKey = address(addressValue);
      const { value: balanceInLamports } = await rpc.getBalance(publicKey).send();
      const balanceInSol = Number(balanceInLamports) / 1_000_000_000; // Convert lamports to SOL
      setBalance(balanceInSol);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [addressValue]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
}