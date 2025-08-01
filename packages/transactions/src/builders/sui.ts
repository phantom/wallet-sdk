import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import type { SuiTransactionBuilder, SendTokenTransactionParams, TransactionResult } from "../types";
import { getRPCUrl } from "../config";

export class SuiTransactionBuilderImpl implements SuiTransactionBuilder {
  private getSuiClient(networkId: string): SuiClient {
    const rpcUrl = getRPCUrl(networkId);
    return new SuiClient({ url: rpcUrl });
  }

  async createSendTokenTransaction(params: SendTokenTransactionParams): Promise<TransactionResult> {
    try {
      const client = this.getSuiClient(params.networkId);

      // Handle native SUI transfer
      if (!params.token) {
        return this.createNativeSuiTransfer(params);
      }

      // Handle Sui token transfer
      return this.createSuiTokenTransfer(client, params);
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create Sui transaction: ${error.message}`,
      };
    }
  }

  private createNativeSuiTransfer(params: SendTokenTransactionParams): TransactionResult {
    try {
      const tx = new TransactionBlock();
      
      // Convert amount to MIST (1 SUI = 1,000,000,000 MIST)
      const amount = typeof params.amount === 'string'
        ? Math.floor(parseFloat(params.amount) * 1_000_000_000)
        : typeof params.amount === 'bigint'
        ? Number(params.amount)
        : Math.floor(params.amount * 1_000_000_000);

      // Split coins and transfer
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
      tx.transferObjects([coin], tx.pure(params.to));

      return {
        transaction: tx,
      };
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create native SUI transfer: ${error.message}`,
      };
    }
  }

  private async createSuiTokenTransfer(client: SuiClient, params: SendTokenTransactionParams): Promise<TransactionResult> {
    try {
      // This is a placeholder for Sui token transfers
      // In a real implementation, you would:
      // 1. Query for coin objects of the specified type
      // 2. Create appropriate transfer transactions
      // 3. Handle token-specific logic

      return {
        transaction: null,
        error: "Sui token transfers not yet fully implemented. Please add token-specific logic.",
      };
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create Sui token transfer: ${error.message}`,
      };
    }
  }
}