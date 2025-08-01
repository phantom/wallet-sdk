import type { NetworkId } from "@phantom/client";

// Base transaction parameters
export interface BaseTransactionParams {
  networkId: NetworkId;
  from: string;
  to: string;
  amount: string | number | bigint;
}

// Send token transaction parameters
export interface SendTokenTransactionParams extends BaseTransactionParams {
  token?: string; // Token address (optional for native token transfers)
  decimals?: number; // Token decimals (auto-detected if not provided)
}

// Transaction result
export interface TransactionResult {
  transaction: any; // The blockchain-specific transaction object
  error?: string;
}

// RPC configuration
export interface RPCConfig {
  solana?: {
    mainnet?: string;
    devnet?: string;
    testnet?: string;
  };
  ethereum?: {
    mainnet?: string;
    sepolia?: string;
    goerli?: string;
  };
  polygon?: {
    mainnet?: string;
    mumbai?: string;
  };
  arbitrum?: {
    mainnet?: string;
    sepolia?: string;
  };
  optimism?: {
    mainnet?: string;
    sepolia?: string;
  };
  base?: {
    mainnet?: string;
    sepolia?: string;
  };
  bsc?: {
    mainnet?: string;
    testnet?: string;
  };
  avalanche?: {
    mainnet?: string;
    fuji?: string;
  };
  bitcoin?: {
    mainnet?: string;
    testnet?: string;
  };
  sui?: {
    mainnet?: string;
    testnet?: string;
    devnet?: string;
  };
}

// Transaction builder interface
export interface TransactionBuilder {
  createSendTokenTransaction(params: SendTokenTransactionParams): Promise<TransactionResult>;
}

// Chain-specific transaction builders
export interface SolanaTransactionBuilder extends TransactionBuilder {}
export interface EVMTransactionBuilder extends TransactionBuilder {}
export interface BitcoinTransactionBuilder extends TransactionBuilder {}
export interface SuiTransactionBuilder extends TransactionBuilder {}