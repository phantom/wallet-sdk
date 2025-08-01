import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { SolanaTransactionBuilder, SendTokenTransactionParams, TransactionResult } from "../types";
import { getRPCUrl } from "../config";

export class SolanaTransactionBuilderImpl implements SolanaTransactionBuilder {
  private getConnection(networkId: string): Connection {
    const rpcUrl = getRPCUrl(networkId);
    return new Connection(rpcUrl, 'confirmed');
  }

  async createSendTokenTransaction(params: SendTokenTransactionParams): Promise<TransactionResult> {
    try {
      const connection = this.getConnection(params.networkId);
      const fromPubkey = new PublicKey(params.from);
      const toPubkey = new PublicKey(params.to);

      // Handle native SOL transfer
      if (!params.token) {
        return this.createNativeSOLTransfer(connection, fromPubkey, toPubkey, params.amount);
      }

      // Handle SPL token transfer
      return this.createSPLTokenTransfer(connection, fromPubkey, toPubkey, params.token, params.amount, params.decimals);
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create Solana transaction: ${error.message}`,
      };
    }
  }

  private async createNativeSOLTransfer(
    connection: Connection,
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amount: string | number | bigint
  ): Promise<TransactionResult> {
    try {
      // Convert amount to lamports
      const lamports = typeof amount === 'string' 
        ? Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
        : typeof amount === 'bigint'
        ? Number(amount)
        : Math.floor(amount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      return {
        transaction,
      };
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create native SOL transfer: ${error.message}`,
      };
    }
  }

  private async createSPLTokenTransfer(
    connection: Connection,
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    tokenAddress: string,
    amount: string | number | bigint,
    decimals?: number
  ): Promise<TransactionResult> {
    try {
      // This is a placeholder for SPL token transfer
      // In a real implementation, you would:
      // 1. Import @solana/spl-token
      // 2. Get or create associated token accounts
      // 3. Create transfer instruction
      // 4. Handle token decimals properly

      return {
        transaction: null,
        error: "SPL token transfers not yet implemented. Please add @solana/spl-token dependency and implement token transfer logic.",
      };
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create SPL token transfer: ${error.message}`,
      };
    }
  }
}