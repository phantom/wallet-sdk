export type SolanaWalletId = string;

export interface SolanaWalletInfo {
  id: SolanaWalletId;
  name: string;
  icon?: string;
  /**
   * Supported chains in CAIP-2 style, e.g. "solana:mainnet", "solana:devnet".
   */
  chains: string[];
}

export interface SolanaWalletAdapter {
  readonly id: SolanaWalletId;
  readonly info: SolanaWalletInfo;

  readonly connected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // base58 encoded
  getAccounts(): Promise<string[]>;

  signTransaction(transaction: unknown): Promise<unknown>;
  signAndSendTransaction(transaction: unknown): Promise<unknown>;
  signMessage(message: Uint8Array | string): Promise<Uint8Array>;
}

export class SolanaWalletRegistry {
  private wallets = new Map<SolanaWalletId, SolanaWalletAdapter>();
  private selectedWalletId: SolanaWalletId | null = null;

  register(wallet: SolanaWalletAdapter): void {
    this.wallets.set(wallet.id, wallet);

    // If nothing is selected yet, prefer the first registered wallet as default.
    if (!this.selectedWalletId) {
      this.selectedWalletId = wallet.id;
    }
  }

  unregister(id: SolanaWalletId): void {
    this.wallets.delete(id);

    if (this.selectedWalletId === id) {
      this.selectedWalletId = null;
    }
  }

  getAll(): SolanaWalletAdapter[] {
    return Array.from(this.wallets.values());
  }

  getSelected(): SolanaWalletAdapter | null {
    if (!this.selectedWalletId) {
      return null;
    }
    return this.wallets.get(this.selectedWalletId) ?? null;
  }

  select(id: SolanaWalletId | null): void {
    if (id === null) {
      this.selectedWalletId = null;
      return;
    }

    if (!this.wallets.has(id)) {
      throw new Error(`Unknown Solana wallet id: ${id}`);
    }

    this.selectedWalletId = id;
  }
}
