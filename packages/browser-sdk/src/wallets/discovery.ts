import type { InjectedWalletInfo } from "./registry";
import { AddressType as ClientAddressType } from "@phantom/client";

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

/**
 * Discover EVM wallets using EIP-6963 standard
 */
export function discoverEthereumWallets(): Promise<InjectedWalletInfo[]> {
  return new Promise(resolve => {
    const wallets: InjectedWalletInfo[] = [];
    const discoveredProviders = new Map<string, EIP6963ProviderDetail>();

    if (typeof window === "undefined") {
      resolve(wallets);
      return;
    }

    const handleAnnounce = (event: CustomEvent<EIP6963ProviderDetail>) => {
      const detail = event.detail;
      if (detail?.info && detail?.provider) {
        discoveredProviders.set(detail.info.uuid, detail);
      }
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce as EventListener);

    // Request providers to announce themselves
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Give wallets time to respond (they may load asynchronously)
    setTimeout(() => {
      for (const [, detail] of discoveredProviders) {
        const { info } = detail;

        // Use rdns as the wallet ID (e.g., "io.metamask", "com.coinbase.wallet")
        // Fallback to name if rdns is not available
        const walletId = info.rdns
          ? info.rdns.split(".").reverse().join("-") // Convert "io.metamask" to "metamask-io"
          : info.name.toLowerCase().replace(/\s+/g, "-");

        wallets.push({
          id: walletId,
          name: info.name,
          icon: info.icon,
          addressTypes: [ClientAddressType.ethereum],
          chains: ["eip155:1", "eip155:5", "eip155:11155111"], // mainnet, goerli, sepolia
        });
      }

      // Fallback: Check for legacy window.ethereum if no EIP-6963 providers found
      if (wallets.length === 0 && (window as any).ethereum) {
        const provider = (window as any).ethereum;
        let walletName = "Ethereum Wallet";
        let walletId = "ethereum";

        // Try to get wallet name from provider if available
        if (provider.providerName) {
          walletName = provider.providerName;
          walletId = provider.providerName.toLowerCase().replace(/\s+/g, "-");
        } else if (provider.name) {
          walletName = provider.name;
          walletId = provider.name.toLowerCase().replace(/\s+/g, "-");
        }

        wallets.push({
          id: walletId,
          name: walletName,
          addressTypes: [ClientAddressType.ethereum],
          chains: ["eip155:1", "eip155:5", "eip155:11155111"],
        });
      }

      window.removeEventListener("eip6963:announceProvider", handleAnnounce as EventListener);

      resolve(wallets);
    }, 400); // Small delay to allow wallets to respond
  });
}

/**
 * Discover Solana wallets using Wallet Standard
 * Wallet Standard uses window.navigator.wallets.getWallets() to discover all registered wallets
 * See: https://github.com/wallet-standard/wallet-standard
 */
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

        // Extract Solana chains
        const solanaChains = wallet.chains.filter(chain => chain.startsWith("solana:") || chain === "solana");

        const walletId = wallet.name.toLowerCase().replace(/\s+/g, "-");

        wallets.push({
          id: walletId,
          name: wallet.name,
          icon: wallet.icon,
          addressTypes: [ClientAddressType.solana],
          chains: solanaChains.length > 0 ? solanaChains : ["solana:mainnet", "solana:devnet", "solana:testnet"],
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
      const mergedChains = Array.from(new Set([...(existing.chains || []), ...(wallet.chains || [])]));
      walletMap.set(wallet.id, {
        ...existing,
        addressTypes: mergedAddressTypes,
        chains: mergedChains,
        // Prefer icon from the most recent discovery
        icon: wallet.icon || existing.icon,
      });
    } else {
      walletMap.set(wallet.id, wallet);
    }
  }

  return Array.from(walletMap.values());
}
