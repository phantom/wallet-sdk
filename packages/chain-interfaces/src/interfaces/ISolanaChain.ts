import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";

// Now directly wallet-adapter compliant
export interface ISolanaChain {
  // Wallet adapter required properties
  readonly publicKey: string | null;
  readonly connected: boolean;

  // Core wallet adapter methods (bound to SDK)
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }>;
  disconnect(): Promise<void>;

  // Standard wallet adapter signing methods
  signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }>;
  signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<{ signature: string }>;
  signAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<(Transaction | VersionedTransaction)[]>;
  signAndSendAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<{ signatures: string[] }>;

  // Network switching
  switchNetwork(network: "mainnet" | "devnet"): Promise<void>;

  // Legacy compatibility methods
  getPublicKey(): Promise<string | null>;
  isConnected(): boolean;

  // Event methods
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;

  // Standard Wallet Adapter Events:
  // - connect: (publicKey: string) => void
  // - disconnect: () => void
  // - accountChanged: (publicKey: string | null) => void
}
