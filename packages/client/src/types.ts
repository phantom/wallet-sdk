// Removed unused AxiosInstance import
import { type NetworkId } from "./caip2-mappings";
import type { Buffer } from "buffer";

export interface PhantomClientConfig {
  apiBaseUrl: string;
  organizationId?: string;
}

// Stamper interface - takes Buffer data and returns complete X-Phantom-Stamp header value
export interface Stamper {
  stamp(data: Buffer): string;
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
