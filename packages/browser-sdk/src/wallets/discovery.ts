import type { InjectedWalletInfo } from "./registry";
import { AddressType as ClientAddressType } from "@phantom/client";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";

/**
 * EIP-6963 Provider Info interface
 * See: https://eips.ethereum.org/EIPS/eip-6963
 */
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string; // Reverse domain name identifier
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any; // The actual provider object (window.ethereum-like)
}

interface WalletStandardWallet {
  readonly name: string;
  readonly icon: string;
  readonly version: string;
  readonly chains: readonly string[];
  readonly features: readonly string[];
  readonly accounts: readonly WalletStandardAccount[];
}

interface WalletStandardAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly string[];
  readonly features: readonly string[];
}

function generateWalletIdFromEIP6963(info: EIP6963ProviderInfo): string {
  if (info.rdns) {
    return info.rdns.split(".").reverse().join("-");
  }
  return info.name.toLowerCase().replace(/\s+/g, "-");
}

function generateWalletIdFromName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function processEIP6963Providers(providers: Map<string, EIP6963ProviderDetail>): InjectedWalletInfo[] {
  const wallets: InjectedWalletInfo[] = [];

  for (const [, detail] of providers) {
    const { info, provider } = detail;
    const walletId = generateWalletIdFromEIP6963(info);

    wallets.push({
      id: walletId,
      name: info.name,
      icon: info.icon,
      addressTypes: [ClientAddressType.ethereum],
      providers: {
        // EIP-6963 provider implements EIP-1193 interface (IEthereumChain)
        ethereum: provider as unknown as IEthereumChain,
      },
    });
  }

  return wallets;
}

export function discoverEthereumWallets(): Promise<InjectedWalletInfo[]> {
  return new Promise(resolve => {
    const discoveredProviders = new Map<string, EIP6963ProviderDetail>();

    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const handleAnnounce = (event: CustomEvent<EIP6963ProviderDetail>) => {
      const detail = event.detail;
      if (detail?.info && detail?.provider) {
        discoveredProviders.set(detail.info.uuid, detail);
      }
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce as EventListener);

    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const processProviders = () => {
      const wallets = processEIP6963Providers(discoveredProviders);

      window.removeEventListener("eip6963:announceProvider", handleAnnounce as EventListener);

      resolve(wallets);
    };

    setTimeout(processProviders, 400);
  });
}

export async function discoverSolanaWallets(): Promise<InjectedWalletInfo[]> {
  const wallets: InjectedWalletInfo[] = [];

  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return wallets;
  }

  const walletsAPI = (navigator as any).wallets;
  if (walletsAPI && typeof walletsAPI.getWallets === "function") {
    try {
      const registeredWallets: WalletStandardWallet[] = await walletsAPI.getWallets();

      for (const wallet of registeredWallets) {
        const supportsSolana = wallet.chains.some(chain => chain.startsWith("solana:") || chain === "solana");

        if (!supportsSolana) {
          continue;
        }

        // Skip Phantom as is handled by our injected provider
        if (wallet.name.toLowerCase().includes("phantom")) {
          continue;
        }

        const walletId = generateWalletIdFromName(wallet.name);

        wallets.push({
          id: walletId,
          name: wallet.name,
          icon: wallet.icon,
          addressTypes: [ClientAddressType.solana],
          providers: {
            // Wallet Standard wallet implements standard methods compatible with ISolanaChain
            solana: wallet as unknown as ISolanaChain,
          },
        });
      }
    } catch (error) {
      // If Wallet Standard API fails, fall back silently
      // This is expected if no wallets have registered or API is not available
    }
  }

  return wallets;
}

export async function discoverWallets(): Promise<InjectedWalletInfo[]> {
  const [solanaWallets, ethereumWallets] = await Promise.all([discoverSolanaWallets(), discoverEthereumWallets()]);

  const walletMap = new Map<string, InjectedWalletInfo>();

  for (const wallet of [...solanaWallets, ...ethereumWallets]) {
    const existing = walletMap.get(wallet.id);
    if (existing) {
      const mergedAddressTypes = Array.from(new Set([...existing.addressTypes, ...wallet.addressTypes]));
      const mergedProviders = {
        ...existing.providers,
        ...wallet.providers,
      };
      walletMap.set(wallet.id, {
        ...existing,
        addressTypes: mergedAddressTypes,
        // Prefer icon from the most recent discovery
        icon: wallet.icon || existing.icon,
        providers: mergedProviders,
      });
    } else {
      walletMap.set(wallet.id, wallet);
    }
  }

  return Array.from(walletMap.values());
}
