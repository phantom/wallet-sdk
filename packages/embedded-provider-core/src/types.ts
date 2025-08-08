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
}

export interface SignMessageParams {
  message: string;
  networkId: NetworkId;
}

// Use the parsed signature result
export interface SignMessageResult extends ParsedSignatureResult {}

export interface SignAndSendTransactionParams {
  transaction: any; // Native transaction object (Transaction, VersionedTransaction, etc.)
  networkId: NetworkId;
}

// Use the parsed transaction result instead of raw transaction
export interface SignedTransaction extends ParsedTransactionResult {}

export interface AuthOptions {
  provider?: "google" | "apple" | "jwt";
  jwtToken?: string;
  customAuthData?: Record<string, any>;
}

export interface EmbeddedProviderConfig {
  apiBaseUrl: string;
  organizationId: string;
  authOptions?: {
    authUrl?: string;
    redirectUrl?: string;
  };
  embeddedWalletType: "app-wallet" | "user-wallet";
  addressTypes: AddressType[];
  solanaProvider: "web3js" | "kit";
}
