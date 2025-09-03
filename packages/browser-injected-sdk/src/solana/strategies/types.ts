import type { VersionedTransaction, Transaction } from "@solana/web3.js";
import type { DisplayEncoding, SolanaSignInData } from "../types";
import type { ProviderStrategy } from "../../types";

export interface SolanaStrategy {
  readonly type: ProviderStrategy;
  isConnected: boolean;

  connect: ({ onlyIfTrusted }: { onlyIfTrusted: boolean }) => Promise<string | undefined>;
  disconnect: () => Promise<void>;

  getAccount: () => Promise<string | undefined>;

  signMessage: (message: Uint8Array, display?: DisplayEncoding) => Promise<{ signature: Uint8Array; address: string }>;
  signIn: (
    signInData: SolanaSignInData,
  ) => Promise<{ address: string; signature: Uint8Array; signedMessage: Uint8Array }>;
  signAndSendTransaction: (
    transaction: VersionedTransaction | Transaction,
  ) => Promise<{ signature: string; address?: string }>;
  signTransaction: (transaction: VersionedTransaction | Transaction) => Promise<VersionedTransaction | Transaction>;
  signAllTransactions: (
    transactions: (VersionedTransaction | Transaction)[],
  ) => Promise<(VersionedTransaction | Transaction)[]>;
}
