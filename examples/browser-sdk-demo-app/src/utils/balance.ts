import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export interface BalanceResult {
  balance: number | null;
  error: string | null;
}

export async function getBalance(address: string, rpcUrl?: string): Promise<BalanceResult> {
  try {
    const connection = new Connection(
      rpcUrl || import.meta.env.VITE_SOLANA_RPC_URL_MAINNET || "https://api.mainnet-beta.solana.com",
      "confirmed",
    );

    const publicKey = new PublicKey(address);
    const balanceInLamports = await connection.getBalance(publicKey);
    const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;

    return {
      balance: balanceInSol,
      error: null,
    };
  } catch (err) {
    console.error("Failed to fetch balance:", err);
    return {
      balance: null,
      error: err instanceof Error ? err.message : "Failed to fetch balance",
    };
  }
}
