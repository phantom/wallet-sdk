import type { Plugin } from "../index";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import {
  addEventListener,
  removeEventListener,
  triggerEvent,
  type PhantomEthereumEventCallback,
} from "./eventListeners";
import { getAccounts } from "./getAccounts";
import { signPersonalMessage, signTypedData } from "./signMessage";
import { sendTransaction, signTransaction } from "./sendTransaction";
import { getChainId, switchChain } from "./chainUtils";
import { getProvider } from "./getProvider";
import type { EthereumEventType, ProviderRpcError } from "./types";
import type { IEthereumChain, EthTransactionRequest } from "@phantom/chain-interfaces";

/**
 * Phantom Ethereum chain implementation that is EIP-1193 compliant
 * This wraps Phantom's Ethereum provider with event listeners and state management
 */
export class Ethereum implements IEthereumChain {
  private _chainId: string = "0x1";
  private _accounts: string[] = [];

  constructor() {
    // Bind events asynchronously without waiting for completion
    this.bindProviderEvents();
  }

  get connected(): boolean {
    return this._accounts.length > 0;
  }

  get chainId(): string {
    return this._chainId;
  }

  get accounts(): string[] {
    return this._accounts;
  }

  async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    const provider = await getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }
    const providerInstance = provider.getProvider();
    if (!providerInstance) {
      throw new Error("Provider instance not found.");
    }
    return providerInstance.request<T>(args);
  }

  async connect(): Promise<string[]> {
    const accounts = await connect();
    this._accounts = accounts;
    return accounts;
  }

  async disconnect(): Promise<void> {
    await disconnect();
    this._accounts = [];
  }

  signPersonalMessage(message: string, address: string): Promise<string> {
    return signPersonalMessage(message, address);
  }

  signTypedData(data: any, address: string): Promise<string> {
    return signTypedData(data, address);
  }

  signTransaction(transaction: EthTransactionRequest): Promise<string> {
    return signTransaction(transaction);
  }

  sendTransaction(transaction: EthTransactionRequest): Promise<string> {
    return sendTransaction(transaction);
  }

  async switchChain(chainId: number | string): Promise<void> {
    // Convert to hex string format expected by switchChain
    const hexChainId =
      typeof chainId === "string"
        ? chainId.toLowerCase().startsWith("0x")
          ? chainId.toLowerCase()
          : `0x${parseInt(chainId, 10).toString(16)}`
        : `0x${chainId.toString(16)}`;
    await switchChain(hexChainId);
    this._chainId = hexChainId;
  }

  async getChainId(): Promise<number> {
    const chainId = await getChainId();
    // getChainId returns hex string, convert to number
    const parsed = parseInt(chainId, 16);
    this._chainId = chainId;
    return parsed;
  }

  async getAccounts(): Promise<string[]> {
    const accounts = await getAccounts();
    this._accounts = accounts;
    return accounts;
  }

  isConnected(): boolean {
    return this._accounts.length > 0;
  }

  on(event: EthereumEventType, listener: PhantomEthereumEventCallback): void {
    addEventListener(event, listener);
  }

  off(event: EthereumEventType, listener: PhantomEthereumEventCallback): void {
    removeEventListener(event, listener);
  }

  private async bindProviderEvents(): Promise<void> {
    try {
      const strategy = await getProvider();
      const provider = strategy.getProvider();

      if (provider) {
        provider.on("connect", async () => {
          try {
            const accounts = await provider.request({ method: "eth_accounts" });
            if (accounts?.length > 0) {
              this._accounts = accounts;
              triggerEvent("connect", accounts);
            }
          } catch {
            // Ignore errors
          }
        });
        provider.on("disconnect", () => {
          this._accounts = [];
          const error: ProviderRpcError = {
            code: 4900,
            message: "Provider disconnected",
          };
          triggerEvent("disconnect", error);
        });
        provider.on("accountsChanged", (accounts: string[]) => {
          this._accounts = accounts;
          triggerEvent("accountsChanged", accounts);
          // Also trigger connect event when accounts change (if there are accounts)
          // This ensures the provider is considered connected to the new account
          if (accounts && accounts.length > 0) {
            triggerEvent("connect", accounts);
          }
        });
        provider.on("chainChanged", (chainId: string) => {
          this._chainId = chainId;
          triggerEvent("chainChanged", chainId);
        });
      }
    } catch (error) {
      // Silently ignore if native provider unavailable
    }
  }
}

export function createEthereumPlugin(): Plugin<IEthereumChain> {
  return {
    name: "ethereum",
    create: () => {
      return new Ethereum();
    },
  };
}
