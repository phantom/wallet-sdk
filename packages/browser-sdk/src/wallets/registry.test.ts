import { InjectedWalletRegistry, type InjectedWalletInfo } from "./registry";
import { AddressType } from "../types";

function createWalletInfo(id: string, addressTypes: AddressType[]): InjectedWalletInfo {
  return {
    id,
    name: `Wallet ${id}`,
    addressTypes,
  };
}

describe("InjectedWalletRegistry", () => {
  it("starts empty", () => {
    const registry = new InjectedWalletRegistry();

    expect(registry.getAll()).toEqual([]);
  });

  it("registers and unregisters wallets", () => {
    const registry = new InjectedWalletRegistry();
    const walletA = createWalletInfo("a", [AddressType.solana]);
    const walletB = createWalletInfo("b", [AddressType.solana]);

    registry.register(walletA);
    registry.register(walletB);

    expect(registry.getAll()).toEqual([walletA, walletB]);
    expect(registry.has("a")).toBe(true);
    expect(registry.has("b")).toBe(true);

    registry.unregister("a");
    expect(registry.has("a")).toBe(false);
    expect(registry.getAll()).toEqual([walletB]);
  });

  it("filters wallets by address types", () => {
    const registry = new InjectedWalletRegistry();

    const solanaOnly = createWalletInfo("sol", [AddressType.solana]);
    const multiChain = createWalletInfo("multi", [AddressType.solana, AddressType.ethereum]);

    registry.register(solanaOnly);
    registry.register(multiChain);

    const solanaWallets = registry.getByAddressTypes([AddressType.solana]);
    const evmWallets = registry.getByAddressTypes([AddressType.ethereum]);

    expect(solanaWallets.map(w => w.id)).toEqual(["sol", "multi"]);
    expect(evmWallets.map(w => w.id)).toEqual(["multi"]);
  });
});
