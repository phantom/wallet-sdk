import type { Transaction } from "@solana/transactions";
import type { DisplayEncoding, SolanaSignInData } from "../types";

export interface SolanaAdapter {
  connect: ({ onlyIfTrusted }: { onlyIfTrusted: boolean }) => Promise<string | undefined>;
  disconnect: () => Promise<void>;

  getAccount: () => Promise<string | undefined>;

  signMessage: (message: Uint8Array, display?: DisplayEncoding) => Promise<{ signature: Uint8Array; address: string }>;
  signIn: (
    signInData: SolanaSignInData,
  ) => Promise<{ address: string; signature: Uint8Array; signedMessage: Uint8Array }>;
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string; address?: string }>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}
