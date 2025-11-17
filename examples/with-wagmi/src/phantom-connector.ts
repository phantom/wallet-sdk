import { createConnector } from "@wagmi/core";
import { BrowserSDK, DebugLevel } from "@phantom/browser-sdk";
import { AddressType } from "@phantom/browser-sdk";

export interface PhantomConnectorParameters {
  organizationId: string;
  apiBaseUrl?: string;
  redirect?: string;
}

export function phantomConnector() {
  let sdk: BrowserSDK | null = null;

  const initializeSdk = async () => {
    if (!sdk) {
      sdk = new BrowserSDK({
        providers: ["google", "apple"],
        appId: "test-app-id",
        apiBaseUrl: "https://staging-api.phantom.app/v1/wallets",

        authOptions: {
          authUrl: "https://staging-connect.phantom.app/login",
          redirectUrl: `${window.location.origin}/auth-callback`,
        },
        embeddedWalletType: "user-wallet",
        addressTypes: [AddressType.ethereum], // Only need Ethereum for wagmi
      });

      sdk.configureDebug({
        enabled: true,
        callback: console.log,
        level: DebugLevel.DEBUG,
      });

      sdk.ethereum.on("accountsChanged", accounts => {
        console.log("Accounts changed:", accounts);
      });
    }
  };

  return createConnector(config => ({
    id: "phantom",
    name: "Phantom Wallet",
    type: "phantom",

    async setup() {
      await initializeSdk();

      // Set up event listeners for chain and account changes
      sdk?.ethereum.on("chainChanged", chainId => {
        console.log("Chain changed to:", chainId);
        config.emitter.emit("change", { chainId: Number(chainId) });
      });

      sdk?.ethereum.on("accountsChanged", accounts => {
        console.log("Accounts changed:", accounts);
        if (accounts.length === 0) {
          config.emitter.emit("disconnect");
        } else {
          config.emitter.emit("change", { accounts: accounts as `0x${string}`[] });
        }
      });

      await sdk?.autoConnect();
      if (sdk?.isConnected()) {
        const accounts = await this.getAccounts();
        config.emitter.emit("change", { accounts: accounts as `0x${string}`[] });
      }
    },

    async connect<withCapabilities extends boolean = false>(parameters?: {
      chainId?: number | undefined;
      isReconnecting?: boolean | undefined;
      withCapabilities?: withCapabilities | boolean | undefined;
    }): Promise<{
      accounts: withCapabilities extends true
        ? readonly { address: `0x${string}`; capabilities: Record<string, unknown> }[]
        : readonly `0x${string}`[];
      chainId: number;
    }> {
      if (!sdk) {
        await initializeSdk();
      }

      try {
        const result = await sdk!.connect({ provider: "phantom" });
        const ethereumAddresses = result.addresses.filter(addr => addr.addressType === AddressType.ethereum);

        if (ethereumAddresses.length === 0) {
          throw new Error("No Ethereum addresses found");
        }

        const chainId = await sdk!.ethereum.getChainId();
        const accounts = ethereumAddresses.map(addr => addr.address as `0x${string}`);

        // Handle withCapabilities if requested
        if (parameters?.withCapabilities) {
          return {
            accounts: accounts.map(address => ({
              address,
              capabilities: {},
            })),
            chainId: chainId,
          } as any;
        }

        return {
          accounts: accounts,
          chainId: chainId,
        } as any;
      } catch (error) {
        throw new Error(`Failed to connect: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    },

    async disconnect() {
      if (sdk) {
        await sdk.disconnect();
      }
    },

    async getAccounts() {
      if (!sdk?.isConnected()) {
        return [];
      }

      const addresses = sdk.getAddresses();
      return addresses
        .filter(addr => addr.addressType === AddressType.ethereum)
        .map(addr => addr.address as `0x${string}`);
    },

    async getChainId() {
      if (!sdk?.isConnected()) {
        throw new Error("Not connected");
      }

      return await sdk.ethereum.getChainId();
    },

    async getProvider() {
      // Return the Ethereum provider which is EIP-1193 compliant
      return sdk?.ethereum;
    },

    async isAuthorized() {
      if (!sdk) {
        await initializeSdk();
      }
      // Check if SDK is already connected
      return sdk?.isConnected() || false;
    },

    async switchChain({ chainId }) {
      if (!sdk?.isConnected()) {
        throw new Error("Not connected");
      }

      await sdk.ethereum.switchChain(chainId);

      // Emit chain change event to wagmi so UI updates
      config.emitter.emit("change", { chainId });

      // Return the chain object - we need to find it from our config
      const chain = config.chains.find(c => c.id === chainId);
      if (!chain) {
        throw new Error(`Chain with id ${chainId} not found in configuration`);
      }

      return chain;
    },

    onAccountsChanged(accounts) {
      // The SDK handles account change events internally
      // We can listen to the SDK's events and emit wagmi events
      if (accounts.length === 0) {
        config.emitter.emit("disconnect");
      } else {
        config.emitter.emit("change", { accounts: accounts as `0x${string}`[] });
      }
    },

    onChainChanged(chainId) {
      config.emitter.emit("change", { chainId: Number(chainId) });
    },

    onConnect(connectInfo) {
      // wagmi expects { accounts, chainId } format
      // We need to get the current accounts and chainId when connected
      if (sdk?.isConnected()) {
        const accounts = sdk
          .getAddresses()
          .filter(addr => addr.addressType === AddressType.ethereum)
          .map(addr => addr.address as `0x${string}`);

        sdk.ethereum.getChainId().then(chainId => {
          config.emitter.emit("connect", { accounts, chainId });
        });
      }
    },

    onDisconnect(error) {
      config.emitter.emit("disconnect");
    },
  }));
}
