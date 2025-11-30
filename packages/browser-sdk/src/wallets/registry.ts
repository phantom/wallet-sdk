import type { IEthereumChain, ISolanaChain } from "@phantom/chain-interfaces";
import type { AddressType } from "../types";

export type InjectedWalletId = string;

export interface WalletProviders {
  /** EIP-6963 Ethereum provider (window.ethereum-like) */
  ethereum?: IEthereumChain;
  /** Wallet Standard Solana wallet object */
  solana?: ISolanaChain;
}

export interface InjectedWalletInfo {
  id: InjectedWalletId;
  name: string;
  icon?: string;
  addressTypes: AddressType[];
  providers?: WalletProviders;
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

// Singleton instance of the wallet registry
let walletRegistry: InjectedWalletRegistry | null = null;

export function getWalletRegistry(): InjectedWalletRegistry {
  if (!walletRegistry) {
    walletRegistry = new InjectedWalletRegistry();
  }
  return walletRegistry;
}
