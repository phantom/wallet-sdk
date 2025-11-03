import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";

interface UseTokenBalanceReturn {
  balance: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTokenBalance(
  walletAddress: string | null,
  tokenMint: string | null,
  decimals: number = 9
): UseTokenBalanceReturn {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com";

  const fetchBalance = useCallback(async () => {
    if (!walletAddress || !tokenMint) {
      setBalance(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const connection = new Connection(rpcUrl);
      const publicKey = new PublicKey(walletAddress);

      // For SOL (native token), get balance directly
      if (tokenMint === "So11111111111111111111111111111111111111112") {
        const balanceInLamports = await connection.getBalance(publicKey);
        const balanceInToken = balanceInLamports / Math.pow(10, decimals);
        setBalance(balanceInToken);
      } else {
        // For SPL tokens, get token accounts by owner
        try {
          const mintPublicKey = new PublicKey(tokenMint);
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { mint: mintPublicKey }
          );

          if (tokenAccounts.value.length > 0) {
            const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
            const balanceInToken = accountInfo.tokenAmount.uiAmount;
            setBalance(balanceInToken);
          } else {
            // No token account found
            setBalance(0);
          }
        } catch (err) {
          console.error("Failed to fetch SPL token balance:", err);
          setBalance(0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch token balance:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, tokenMint, decimals, rpcUrl]);

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
