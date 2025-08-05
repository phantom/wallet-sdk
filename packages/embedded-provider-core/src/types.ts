import type { AddressType, NetworkId } from "@phantom/client";

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

export interface SignAndSendTransactionParams {
  transaction: any; // Native transaction object (Transaction, VersionedTransaction, etc.)
  networkId: NetworkId;
}

export interface SignedTransaction {
  rawTransaction: string;
}

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
