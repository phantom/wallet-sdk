import type { AddressType } from "@phantom/client";
import type { NetworkId } from "@phantom/constants";
import type { ParsedSignatureResult, ParsedTransactionResult } from "@phantom/parsers";

export interface WalletAddress {
  addressType: AddressType;
  address: string;
}

export interface ConnectResult {
  walletId?: string; // Only for embedded
  addresses: WalletAddress[];
  status?: "pending" | "completed"; // Session status - pending means redirect in progress, completed means wallet is ready
  authUserId?: string; // Phantom user ID from auth flow (for embedded user-wallets)
  authProvider: EmbeddedProviderAuthType;
}

export interface SignMessageParams {
  message: string;
  networkId: NetworkId;
}

export interface SignTypedDataV4Params {
  typedData: any; // EIP-712 typed data object
  networkId: NetworkId;
}

// Use the parsed signature result
export interface SignMessageResult extends ParsedSignatureResult {}

export interface SignTransactionParams {
  transaction: any; // Native transaction object (Transaction, VersionedTransaction, etc.)
  networkId: NetworkId;
}

export interface SignAndSendTransactionParams {
  transaction: any; // Native transaction object (Transaction, VersionedTransaction, etc.)
  networkId: NetworkId;
}

// Use the parsed transaction result instead of raw transaction
export interface SignedTransaction extends ParsedTransactionResult {}

export type EmbeddedProviderAuthType = "google" | "apple" | "phantom" | "device";

export interface AuthOptions {
  provider: EmbeddedProviderAuthType;
  customAuthData?: Record<string, any>;
}

export interface EmbeddedProviderConfig {
  apiBaseUrl: string;
  appId: string;
  authOptions: {
    authUrl: string;
    redirectUrl: string;
  };
  embeddedWalletType: "app-wallet" | "user-wallet" | (string & Record<never, never>); // Allow any string for avoiding type conflicts
  addressTypes: AddressType[];
}
