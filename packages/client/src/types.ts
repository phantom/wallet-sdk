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

export type AuthenticatorConfig =
  | {
      authenticatorKind: "keypair";
      authenticatorName: string;
      publicKey: string; // base64url encoded public key (required for keypair)
      algorithm: "Ed25519";
    }
  | {
      authenticatorKind: "passkey";
      authenticatorName: string;
      publicKey: string; // base64url encoded public key (required for passkey)
      algorithm: "Ed25519" | "ECDSA";
    }
  | {
      authenticatorKind: "oidc";
      authenticatorName: string;
      jwksUrl: string;
      idTokenClaims: {
        sub: string;
        iss: string;
      };
    };

export interface UserConfig {
  username: string;
  role?: "ADMIN" | "USER"; // Optional, defaults to 'ADMIN'
  authenticators: AuthenticatorConfig[];
}

export interface GetOrCreatePhantomOrganizationParams {
  publicKey: string; // base58 encoded public key from external wallet
}
