import type { SendTokenTransactionParams, TransactionResult } from "./types";
import { SolanaTransactionBuilderImpl } from "./builders/solana";
import { EVMTransactionBuilderImpl } from "./builders/evm";
import { BitcoinTransactionBuilderImpl } from "./builders/bitcoin";
import { SuiTransactionBuilderImpl } from "./builders/sui";

// Export types
export type * from "./types";

// Export configuration functions
export { getRPCConfig, setRPCConfig, getRPCUrl } from "./config";

// Builder instances
const solanaBuilder = new SolanaTransactionBuilderImpl();
const evmBuilder = new EVMTransactionBuilderImpl();
const bitcoinBuilder = new BitcoinTransactionBuilderImpl();
const suiBuilder = new SuiTransactionBuilderImpl();

/**
 * Create a send token transaction for any supported blockchain
 * 
 * @param params - Transaction parameters including networkId, addresses, amount, and optional token
 * @returns Promise<TransactionResult> - Contains the transaction object or error message
 * 
 * @example
 * ```typescript
 * import { createSendTokenTransaction } from "@phantom/transactions";
 * import { NetworkId } from "@phantom/client";
 * 
 * // Native token transfer (SOL, ETH, etc.)
 * const { transaction, error } = await createSendTokenTransaction({
 *   networkId: NetworkId.SOLANA_MAINNET,
 *   from: "sender-address",
 *   to: "recipient-address",
 *   amount: "1.5", // 1.5 SOL
 * });
 * 
 * // Token transfer
 * const { transaction, error } = await createSendTokenTransaction({
 *   networkId: NetworkId.ETHEREUM_MAINNET,
 *   from: "0x...",
 *   to: "0x...",
 *   amount: "100",
 *   token: "0x...", // USDC contract address
 *   decimals: 6,
 * });
 * 
 * if (error) {
 *   console.error("Transaction creation failed:", error);
 *   return;
 * }
 * 
 * // Use with Phantom SDK
 * const signature = await signAndSendTransaction({
 *   transaction,
 *   networkId,
 * });
 * ```
 */
export async function createSendTokenTransaction(params: SendTokenTransactionParams): Promise<TransactionResult> {
  const [chain] = params.networkId.toLowerCase().split(':');

  switch (chain) {
    case 'solana':
      return solanaBuilder.createSendTokenTransaction(params);

    case 'ethereum':
    case 'eip155':
    case 'polygon':
    case 'arbitrum':
    case 'optimism':
    case 'base':
    case 'bsc':
    case 'avalanche':
      return evmBuilder.createSendTokenTransaction(params);

    case 'bitcoin':
      return bitcoinBuilder.createSendTokenTransaction(params);

    case 'sui':
      return suiBuilder.createSendTokenTransaction(params);

    default:
      return {
        transaction: null,
        error: `Unsupported network: ${params.networkId}. Supported networks: Solana, Ethereum/EVM chains, Bitcoin, Sui`,
      };
  }
}

/**
 * Create a native token transfer (SOL, ETH, BTC, SUI, etc.)
 * Convenience function for sending native blockchain tokens
 */
export async function createNativeTransfer(params: Omit<SendTokenTransactionParams, 'token'>): Promise<TransactionResult> {
  return createSendTokenTransaction({ ...params, token: undefined });
}

/**
 * Create a token transfer (SPL, ERC-20, etc.)
 * Convenience function for sending custom tokens
 */
export async function createTokenTransfer(params: Required<Pick<SendTokenTransactionParams, 'token'>> & SendTokenTransactionParams): Promise<TransactionResult> {
  return createSendTokenTransaction(params);
}