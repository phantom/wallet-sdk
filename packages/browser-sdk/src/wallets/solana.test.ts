import type { SolanaWalletAdapter } from "./solana";
import { SolanaWalletRegistry } from "./solana";

function createMockWallet(id: string): SolanaWalletAdapter {
  return {
    id,
    info: {
      id,
      name: `Wallet ${id}`,
      chains: ["solana:mainnet"],
    },
    connected: false,
    connect() {
      return Promise.resolve();
    },
    disconnect() {
      return Promise.resolve();
    },
    getAccounts() {
      return Promise.resolve([]);
    },
    signTransaction(tx: unknown) {
      return Promise.resolve(tx);
    },
    signAndSendTransaction(tx: unknown) {
      return Promise.resolve(tx);
    },
    signMessage(message: Uint8Array | string) {
      const bytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
      return Promise.resolve(bytes);
    },
  };
}

describe("SolanaWalletRegistry", () => {
  it("starts empty with no selected wallet", () => {
    const registry = new SolanaWalletRegistry();

    expect(registry.getAll()).toEqual([]);
    expect(registry.getSelected()).toBeNull();
  });

  it("registers wallets and selects the first one by default", () => {
    const registry = new SolanaWalletRegistry();
    const walletA = createMockWallet("a");
    const walletB = createMockWallet("b");

    registry.register(walletA);
    expect(registry.getAll()).toEqual([walletA]);
    expect(registry.getSelected()).toBe(walletA);

    registry.register(walletB);
    expect(registry.getAll()).toEqual([walletA, walletB]);
    // First registered wallet remains selected by default
    expect(registry.getSelected()).toBe(walletA);
  });

  it("allows selecting a specific wallet by id", () => {
    const registry = new SolanaWalletRegistry();
    const walletA = createMockWallet("a");
    const walletB = createMockWallet("b");

    registry.register(walletA);
    registry.register(walletB);

    registry.select("b");
    expect(registry.getSelected()).toBe(walletB);
  });

  it("throws when selecting an unknown wallet id", () => {
    const registry = new SolanaWalletRegistry();
    const walletA = createMockWallet("a");

    registry.register(walletA);

    expect(() => registry.select("unknown")).toThrow("Unknown Solana wallet id: unknown");
  });

  it("clears selection when select(null) is called", () => {
    const registry = new SolanaWalletRegistry();
    const walletA = createMockWallet("a");

    registry.register(walletA);
    expect(registry.getSelected()).toBe(walletA);

    registry.select(null);
    expect(registry.getSelected()).toBeNull();
  });

  it("unregisters wallets and clears selection if the selected wallet is removed", () => {
    const registry = new SolanaWalletRegistry();
    const walletA = createMockWallet("a");
    const walletB = createMockWallet("b");

    registry.register(walletA);
    registry.register(walletB);

    // Select the second wallet explicitly
    registry.select("b");
    expect(registry.getSelected()).toBe(walletB);

    // Unregister a non-selected wallet: selection stays the same
    registry.unregister("a");
    expect(registry.getAll()).toEqual([walletB]);
    expect(registry.getSelected()).toBe(walletB);

    // Unregister the selected wallet: selection is cleared
    registry.unregister("b");
    expect(registry.getAll()).toEqual([]);
    expect(registry.getSelected()).toBeNull();
  });
});
