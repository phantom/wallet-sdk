import type { Transaction, VersionedTransaction } from "@solana/web3.js";
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
  signAndSendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<{ signature: string; address?: string }>;
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions: (transactions: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
}
