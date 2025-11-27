export interface SolanaWalletAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccounts(): Promise<string[]>;
  signTransaction(transaction: unknown): Promise<unknown>;
  signAndSendTransaction(transaction: unknown): Promise<unknown>;
  signMessage(message: Uint8Array | string): Promise<Uint8Array>;
}
