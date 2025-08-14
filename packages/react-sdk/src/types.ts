// Re-export types from browser-sdk
export type {
  NetworkId,
  AddressType,
  WalletAddress,
  SignedTransaction,
  SignMessageParams,
  SignAndSendTransactionParams,
} from "@phantom/browser-sdk";

export type ProviderType = "injected" | "embedded";
