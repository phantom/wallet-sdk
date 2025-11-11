import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";

// Re-export native @solana/web3.js types
export type { Transaction, VersionedTransaction };

export type SendOptions = {
  skipPreflight?: boolean;
  preflightCommitment?: string;
  maxRetries?: number;
  minContextSlot?: number;
};

export type PublicKey = {
  toString: () => string;
  toBase58: () => string;
};

export type SolanaSignInData = {
  domain?: string;
  address?: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
};

export type DisplayEncoding = "utf8" | "hex";

export type PhantomEventType = "connect" | "disconnect" | "accountChanged";

export interface PhantomSolanaProvider {
  isPhantom: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signMessage: (
    message: Uint8Array,
    display?: DisplayEncoding,
  ) => Promise<{ signature: Uint8Array; publicKey: PublicKey }>;
  signIn: (
    signInData: SolanaSignInData, // This will now use the simple type alias
  ) => Promise<{ address: PublicKey; signature: Uint8Array; signedMessage: Uint8Array }>;
  signAndSendTransaction: (
    transaction: any,
    options?: SendOptions,
  ) => Promise<{ signature: string; publicKey?: string }>;
  signAndSendAllTransactions: (
    transactions: any[],
    options?: SendOptions,
  ) => Promise<{ signatures: string[]; publicKey?: string }>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  signTransaction: (transaction: any) => Promise<any>;
  on: (event: "connect" | "disconnect" | "accountChanged", handler: (publicKey?: PublicKey) => void) => void;
  off: (event: "connect" | "disconnect" | "accountChanged", handler: (publicKey?: PublicKey) => void) => void;
}

export interface SolanaOperationOptions {
  getProvider?: () => PhantomSolanaProvider | null;
}
