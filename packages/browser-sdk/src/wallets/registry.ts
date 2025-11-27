import type { AddressType } from "../types";

export type InjectedWalletId = string;

export interface InjectedWalletInfo {
  id: InjectedWalletId;
  name: string;
  icon?: string;
  addressTypes: AddressType[];
  // caip2 style chain identifiers, e.g. "solana:mainnet", "eip155:1".
  chains?: string[];
}

export class InjectedWalletRegistry {
  private wallets = new Map<InjectedWalletId, InjectedWalletInfo>();

  register(info: InjectedWalletInfo): void {
    this.wallets.set(info.id, info);
  }

  unregister(id: InjectedWalletId): void {
    this.wallets.delete(id);
  }

  has(id: InjectedWalletId): boolean {
    return this.wallets.has(id);
  }

  getAll(): InjectedWalletInfo[] {
    return Array.from(this.wallets.values());
  }

  getByAddressTypes(addressTypes: AddressType[]): InjectedWalletInfo[] {
    if (addressTypes.length === 0) {
      return this.getAll();
    }
    const allowed = new Set(addressTypes);
    return this.getAll().filter(wallet => wallet.addressTypes.some(t => allowed.has(t)));
  }
}
