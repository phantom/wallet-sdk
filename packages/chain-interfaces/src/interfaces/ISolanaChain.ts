import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";

export interface ISolanaChain {
  readonly publicKey: string | null;
  readonly isConnected: boolean;

  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }>;
  disconnect(): Promise<void>;

  signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }>;
  signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<{ signature: string }>;
  signAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<(Transaction | VersionedTransaction)[]>;
  signAndSendAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<{ signatures: string[] }>;

  // Network switching (NOOP In most wallets except embedded providers)
  switchNetwork(network: "mainnet" | "devnet"): Promise<void>;

  // Event methods
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
}
