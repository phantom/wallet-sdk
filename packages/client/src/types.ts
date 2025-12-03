import { type NetworkId, type SdkAnalyticsHeaders } from "@phantom/constants";

export interface PhantomClientConfig {
  apiBaseUrl: string;
  organizationId?: string;
  headers?: Partial<SdkAnalyticsHeaders>;
  walletType?: "server-wallet" | "user-wallet";
}

export interface CreateWalletResult {
  walletId: string;
  addresses: {
    addressType: string;
    address: string;
  }[];
}

// Transaction is an encoded string:
// - Solana: base64url encoded
// - Ethereum: RLP-encoded hex string
// - Other chains: base64url encoded
export type Transaction = string;

export interface SignedTransaction {
  rawTransaction: string; // base64url encoded signed transaction
  hash?: string; // Optional transaction hash if available
}

export interface SignedTransactionResult {
  rawTransaction: string; // base64url encoded signed transaction
}

export interface GetWalletsResult {
  wallets: Wallet[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface Wallet {
  walletId: string;
  walletName: string;
}

export interface Keypair {
  publicKey: string;
  secretKey: string;
}

export interface SignMessageParams {
  walletId: string;
  message: string; // base64url encoded message
  networkId: NetworkId;
  derivationIndex?: number; // Optional account derivation index (defaults to 0)
}

export interface SignTypedDataParams {
  walletId: string;
  typedData: any; // EIP-712 typed data object
  networkId: NetworkId;
  derivationIndex?: number; // Optional account derivation index (defaults to 0)
}

export interface SignTransactionParams {
  walletId: string;
  transaction: Transaction; // base64url encoded transaction
  networkId: NetworkId;
  derivationIndex?: number; // Optional account derivation index (defaults to 0)
  account?: string; // Optional specific account address to use
}

export interface SignAndSendTransactionParams {
  walletId: string;
  transaction: Transaction; // base64url encoded transaction
  networkId: NetworkId;
  derivationIndex?: number; // Optional account derivation index (defaults to 0)
  account?: string; // Optional specific account address to use
}

export interface GetWalletWithTagParams {
  organizationId: string;
  tag: string;
  derivationPaths: string[];
}

export interface CreateAuthenticatorParams {
  organizationId: string;
  username: string;
  authenticatorName: string;
  authenticator: AuthenticatorConfig;
  replaceExpirable?: boolean;
}

export interface DeleteAuthenticatorParams {
  organizationId: string;
  username: string;
  authenticatorId: string;
}

export type AuthenticatorConfig =
  | {
      authenticatorKind: "keypair";
      authenticatorName: string;
      publicKey: string; // base64url encoded public key (required for keypair)
      algorithm: "Ed25519";
      expiresInMs?: number; // Optional expiration timestamp in milliseconds
    }
  | {
      authenticatorKind: "passkey";
      authenticatorName: string;
      publicKey: string; // base64url encoded public key (required for passkey)
      algorithm: "Ed25519" | "ECDSA";
      expiresInMs?: number; // Optional expiration timestamp in milliseconds
    }
  | {
      authenticatorKind: "oidc";
      authenticatorName: string;
      jwksUrl: string;
      idTokenClaims: {
        sub: string;
        iss: string;
      };
      expiresInMs?: number; // Optional expiration timestamp in milliseconds
    };

export interface UserConfig {
  username: string;
  role?: "ADMIN" | "USER"; // Optional, defaults to 'ADMIN'
  authenticators: AuthenticatorConfig[];
}

// ============================================================================
// Spending Limits Types
// ============================================================================

export interface SpendingLimitConfig {
  usdCentsLimitPerDay: number;
}

export interface PrepareResponse {
  transaction: string;
  simulationResult?: any;
  memoryConfigUsed?: SpendingLimitConfig;
}

export type WalletServiceErrorType = "spending-limit-exceeded" | "transaction-blocked";

export interface IWalletServiceError {
  type: WalletServiceErrorType;
  title: string;
  detail: string;
  requestId: string;
}

export interface PrepareErrorResponse extends IWalletServiceError {
  // Spending limit specific fields
  previousSpendCents?: number;
  transactionSpendCents?: number;
  totalSpendCents?: number;
  limitCents?: number;

  // Transaction blocked specific fields
  scannerResult?: any; // Full simulation result when transaction is blocked
}
