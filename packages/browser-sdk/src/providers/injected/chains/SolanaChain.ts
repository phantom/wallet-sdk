import { EventEmitter } from "eventemitter3";
import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { Solana } from "@phantom/browser-injected-sdk/solana";
import type { Extension } from "@phantom/browser-injected-sdk";
import { Buffer } from "buffer";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";

interface PhantomExtended {
  extension: Extension;
  solana: Solana;
}

/**
 * Phantom Solana chain implementation that is wallet adapter compliant
 * This wraps Phantom's Solana provider with event listeners and state management
 */
export class PhantomSolanaChain implements ISolanaChain {
  private phantom: PhantomExtended;
  private _publicKey: string | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(phantom: PhantomExtended) {
    this.phantom = phantom;
    this.setupEventListeners();
  }

  // Wallet adapter compliant properties
  get connected(): boolean {
    return this._publicKey !== null;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  // Connection methods
  async connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    const result = await this.phantom.solana.connect(options);
    if (!result) {
      throw new Error("Failed to connect to Solana wallet");
    }
    // phantom.solana.connect() returns string | undefined
    const publicKey = typeof result === "string" ? result : "";

    this._publicKey = publicKey;

    return { publicKey };
  }

  async disconnect(): Promise<void> {
    await this.phantom.solana.disconnect();
    this._publicKey = null;
  }

  // Standard wallet adapter methods
  async signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }> {
    const messageBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const result = await this.phantom.solana.signMessage(messageBytes);

    return {
      signature:
        result.signature instanceof Uint8Array
          ? result.signature
          : new Uint8Array(Buffer.from(result.signature, "base64")),
      publicKey: this._publicKey || "",
    };
  }

  async signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    if (!this.connected) {
      return Promise.reject(new Error("Provider not connected. Call provider connect first."));
    }

    try {
      const result = await this.phantom.solana.signTransaction(transaction as any);
      return result as Transaction | VersionedTransaction;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<{ signature: string }> {
    const result = await this.phantom.solana.signAndSendTransaction(transaction as any);
    return { signature: result.signature };
  }

  async signAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<(Transaction | VersionedTransaction)[]> {
    if (!this.connected) {
      return Promise.reject(new Error("Provider not connected. Call provider connect first."));
    }

    try {
      const result = await this.phantom.solana.signAllTransactions(transactions as any[]);
      return result as (Transaction | VersionedTransaction)[];
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async signAndSendAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<{ signatures: string[] }> {
    if (!this.connected) {
      return Promise.reject(new Error("Provider not connected. Call provider connect first."));
    }

    try {
      const result = await this.phantom.solana.signAndSendAllTransactions(transactions as any[]);
      return { signatures: result.signatures };
    } catch (error) {
      return Promise.reject(error);
    }
  }

  switchNetwork(_network: "mainnet" | "devnet"): Promise<void> {
    return Promise.resolve();
  }

  // Legacy methods
  getPublicKey(): Promise<string | null> {
    return Promise.resolve(this._publicKey);
  }

  isConnected(): boolean {
    return this.connected;
  }

  private setupEventListeners(): void {
    // Bridge phantom events to wallet adapter standard events
    this.phantom.solana.addEventListener("connect", (publicKey: string) => {
      this._publicKey = publicKey;
      this.eventEmitter.emit("connect", publicKey);
    });

    this.phantom.solana.addEventListener("disconnect", () => {
      this._publicKey = null;
      this.eventEmitter.emit("disconnect");
    });

    this.phantom.solana.addEventListener("accountChanged", (publicKey: string) => {
      this._publicKey = publicKey;
      this.eventEmitter.emit("accountChanged", publicKey);
    });
  }

  // Event methods for interface compliance
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
