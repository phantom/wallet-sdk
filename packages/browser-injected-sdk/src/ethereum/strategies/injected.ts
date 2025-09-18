import type { EthereumStrategy } from "./types";
import type { PhantomEthereumProvider, EthereumTransaction, EthereumSignInData } from "../types";
import { ProviderStrategy } from "../../types";

const MAX_RETRIES = 4;
const BASE_DELAY = 100;

export class InjectedEthereumStrategy implements EthereumStrategy {
  type = ProviderStrategy.INJECTED;

  load() {
    // We add a backoff retry to see if window.phantom.ethereum is available
    let retryCount = 0;
    const scheduleRetry = (resolve: () => void, reject: () => void) => {
      const delay = BASE_DELAY * Math.pow(2, Math.min(retryCount, 5));

      setTimeout(() => {
        if (this.#getProvider()) {
          resolve();
          return;
        }

        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          reject();
        } else {
          scheduleRetry(resolve, reject);
        }
      }, delay);
    };

    return new Promise((resolve, reject) => {
      scheduleRetry(() => resolve(this), reject);
    });
  }

  #getProvider(): PhantomEthereumProvider | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }
    return (window as any)?.phantom?.ethereum as PhantomEthereumProvider;
  }

  public getProvider(): PhantomEthereumProvider | null {
    return this.#getProvider() || null;
  }

  public get isConnected(): boolean {
    const provider = this.#getProvider();
    return provider?.isConnected && provider.selectedAddress ? true : false;
  }

  public async connect({ onlyIfTrusted }: { onlyIfTrusted: boolean }): Promise<string[] | undefined> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    if (provider.isConnected && provider.selectedAddress) {
      return this.getAccounts();
    }

    try {
      const accounts = await provider.request({
        method: onlyIfTrusted ? "eth_accounts" : "eth_requestAccounts",
      });
      return accounts;
    } catch (_) {
      return undefined;
    }
  }

  public async disconnect(): Promise<void> {
    // Ethereum providers don't typically have a disconnect method
    // The user must disconnect through the wallet UI
    return Promise.resolve();
  }

  public async getAccounts(): Promise<string[]> {
    const provider = this.#getProvider();
    if (!provider) {
      return [];
    }

    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      return accounts || [];
    } catch (_) {
      return [];
    }
  }

  public async signMessage(message: string, address: string): Promise<string> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const signature = await provider.request({
      method: "eth_sign",
      params: [address, message],
    });

    return signature;
  }

  public async signPersonalMessage(message: string, address: string): Promise<string> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const signature = await provider.request({
      method: "personal_sign",
      params: [message, address],
    });

    return signature;
  }

  public async signTypedData(typedData: any, address: string): Promise<string> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const signature = await provider.request({
      method: "eth_signTypedData_v4",
      params: [address, JSON.stringify(typedData)],
    });

    return signature;
  }

  public async signIn(
    signInData: EthereumSignInData,
  ): Promise<{ address: string; signature: string; signedMessage: string }> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    // For Ethereum, signIn typically involves signing a message
    // This is a simplified implementation - in practice you'd construct a proper SIWE message
    const message = `Sign in to ${signInData.domain || "this application"}`;
    const address = provider.selectedAddress;
    if (!address) {
      throw new Error("No address available.");
    }

    const signature = await this.signPersonalMessage(message, address);

    return {
      address,
      signature,
      signedMessage: message,
    };
  }

  public async sendTransaction(transaction: EthereumTransaction): Promise<string> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [transaction],
    });

    return txHash;
  }

  public async signTransaction(transaction: EthereumTransaction): Promise<string> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const signedTx = await provider.request({
      method: "eth_signTransaction",
      params: [transaction],
    });

    return signedTx;
  }

  public async getChainId(): Promise<string> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    const chainId = await provider.request({ method: "eth_chainId" });
    return chainId;
  }

  public async switchChain(chainId: string): Promise<void> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  }

  public async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Provider not found.");
    }

    return await provider.request(args);
  }
}
