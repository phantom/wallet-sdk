import type { Plugin } from "../index";
import { connect as connectOriginal } from "./connect";
import { disconnect } from "./disconnect";
import { addEventListener, removeEventListener, triggerEvent, type PhantomEventCallback } from "./eventListeners";
import { getAccount } from "./getAccount";
import { signAndSendTransaction } from "./signAndSendTransaction";
import { signAndSendAllTransactions } from "./signAndSendAllTransactions";
import { signTransaction } from "./signTransaction";
import { signAllTransactions } from "./signAllTransactions";
import { signMessage } from "./signMessage";
import { getProvider } from "./getProvider";
import type { PhantomEventType } from "./types";
import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";

/**
 * Phantom Solana chain implementation that implements ISolanaChain
 * This wraps Phantom's Solana provider with event listeners and state management
 */
export class Solana implements ISolanaChain {
  private _publicKey: string | null = null;

  constructor() {
    // Bind events asynchronously without waiting for completion
    this.bindProviderEvents();
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  get connected(): boolean {
    return this._publicKey !== null;
  }

  async connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    const address = await connectOriginal(options);
    if (!address) {
      throw new Error("Failed to connect to Solana wallet");
    }
    this._publicKey = address;
    return { publicKey: address };
  }

  async disconnect(): Promise<void> {
    await disconnect();
    this._publicKey = null;
  }

  async signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }> {
    const messageBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const result = await signMessage(messageBytes);
    return {
      signature: result.signature instanceof Uint8Array ? result.signature : new Uint8Array(result.signature),
      publicKey: result.address || this._publicKey || "",
    };
  }

  signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    return signTransaction(transaction);
  }

  async signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<{ signature: string }> {
    const result = await signAndSendTransaction(transaction);
    return { signature: result.signature };
  }

  signAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<(Transaction | VersionedTransaction)[]> {
    return signAllTransactions(transactions);
  }

  async signAndSendAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<{ signatures: string[] }> {
    const result = await signAndSendAllTransactions(transactions);
    return { signatures: result.signatures };
  }

  async switchNetwork(_network: "mainnet" | "devnet"): Promise<void> {
    // Solana network switching is typically handled by the provider
    // This is a no-op for browser-injected-sdk
    return Promise.resolve();
  }

  async getPublicKey(): Promise<string | null> {
    if (this._publicKey) {
      return this._publicKey;
    }
    try {
      const account = await getAccount();
      this._publicKey = account || null;
      return this._publicKey;
    } catch {
      return null;
    }
  }

  isConnected(): boolean {
    return this._publicKey !== null;
  }

  on(event: PhantomEventType, listener: PhantomEventCallback): void {
    addEventListener(event, listener);
  }

  off(event: PhantomEventType, listener: PhantomEventCallback): void {
    removeEventListener(event, listener);
  }

  private async bindProviderEvents(): Promise<void> {
    try {
      const strategy = await getProvider();
      const provider = strategy.getProvider();

      if (provider) {
        provider.on("connect", (publicKey?: { toString: () => string }) => {
          if (publicKey) {
            const pubKey = publicKey.toString();
            this._publicKey = pubKey;
            triggerEvent("connect", pubKey);
          }
        });
        provider.on("disconnect", () => {
          this._publicKey = null;
          triggerEvent("disconnect");
        });
        provider.on("accountChanged", (publicKey?: { toString: () => string }) => {
          if (publicKey) {
            const pubKey = publicKey.toString();
            this._publicKey = pubKey;
            triggerEvent("accountChanged", pubKey);
            // Also trigger connect event when account changes
            // This ensures the provider is considered connected to the new account
            triggerEvent("connect", pubKey);
          } else {
            this._publicKey = null;
            triggerEvent("accountChanged", null as any);
          }
        });
      }
    } catch (error) {
      // Silently ignore if native provider unavailable
    }
  }
}

export function createSolanaPlugin(): Plugin<ISolanaChain> {
  return {
    name: "solana",
    create: () => {
      return new Solana();
    },
  };
}
