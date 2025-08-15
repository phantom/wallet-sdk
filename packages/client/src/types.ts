import { type NetworkId } from "@phantom/constants";

export interface PhantomClientConfig {
  apiBaseUrl: string;
  organizationId?: string;
}

export interface CreateWalletResult {
  walletId: string;
  addresses: {
    addressType: string;
    address: string;
  }[];
}

export type Transaction = string; // base64url encoded transaction

export interface SignedTransaction {
  rawTransaction: string; // base64url encoded signed transaction
  hash?: string; // Optional transaction hash if available
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
}

export interface SignAndSendTransactionParams {
  walletId: string;
  transaction: Transaction; // base64url encoded transaction
  networkId: NetworkId;
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
}

export interface DeleteAuthenticatorParams {
  organizationId: string;
  username: string;
  authenticatorId: string;
}

export interface AuthenticatorConfig {
  authenticatorName: string;
  authenticatorKind: 'keypair' | 'passkey' | 'oidc';
  publicKey?: string; // base64url encoded public key (required for keypair)
  algorithm?: 'Ed25519'; // required for keypair
  // OIDC-specific fields
  jwksUrl?: string; // required for oidc
  idTokenClaims?: {
    sub: string;
    iss: string;
  }; // required for oidc
}

export interface UserConfig {
  username?: string; // Optional, will generate default if not provided
  role?: 'admin' | 'user'; // Optional, defaults to 'admin'
  authenticators: AuthenticatorConfig[];
}
