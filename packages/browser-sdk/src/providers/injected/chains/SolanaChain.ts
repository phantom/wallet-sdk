import { EventEmitter } from "eventemitter3";
import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { Solana } from "@phantom/browser-injected-sdk/solana";
import type { Extension } from "@phantom/browser-injected-sdk";
import { AddressType } from "@phantom/client";
import { Buffer } from "buffer";
import type { ChainCallbacks } from "./ChainCallbacks";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";

interface PhantomExtended {
  extension: Extension;
  solana: Solana;
}

/**
 * Injected Solana chain implementation that is wallet adapter compliant
 */
export class InjectedSolanaChain implements ISolanaChain {
  private phantom: PhantomExtended;
  private callbacks: ChainCallbacks;
  private _connected: boolean = false;
  private _publicKey: string | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(phantom: PhantomExtended, callbacks: ChainCallbacks) {
    this.phantom = phantom;
    this.callbacks = callbacks;
    this.setupEventListeners();
    this.syncInitialState();
  }

  // Wallet adapter compliant properties
  get connected(): boolean {
    return this._connected;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  // Connection methods - delegate to provider
  connect(_options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    if (!this.callbacks.isConnected()) {
      return Promise.reject(new Error("Provider not connected. Call provider connect first."));
    }

    const addresses = this.callbacks.getAddresses();
    const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);

    if (!solanaAddress) {
      return Promise.reject(new Error("Solana not enabled for this provider"));
    }

    this.updateConnectionState(true, solanaAddress.address);
    return Promise.resolve({ publicKey: solanaAddress.address });
  }

  async disconnect(): Promise<void> {
    await this.callbacks.disconnect();
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
    if (!this.callbacks.isConnected()) {
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

  async signAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]> {
    if (!this.callbacks.isConnected()) {
      return Promise.reject(new Error("Provider not connected. Call provider connect first."));
    }

    try {
      const result = await this.phantom.solana.signAllTransactions(transactions as any[]);
      return result as (Transaction | VersionedTransaction)[];
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async signAndSendAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<{ signatures: string[] }> {
    if (!this.callbacks.isConnected()) {
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
    return this._connected && this.callbacks.isConnected();
  }

  private setupEventListeners(): void {
    // Bridge phantom events to wallet adapter standard events
    this.phantom.solana.addEventListener("connect", (publicKey: string) => {
      this.updateConnectionState(true, publicKey);
      this.eventEmitter.emit("connect", publicKey);
    });

    this.phantom.solana.addEventListener("disconnect", () => {
      this.updateConnectionState(false, null);
      this.eventEmitter.emit("disconnect");
    });

    this.phantom.solana.addEventListener("accountChanged", (publicKey: string) => {
      this._publicKey = publicKey;
      this.eventEmitter.emit("accountChanged", publicKey);
    });

    // Listen to SDK events via callbacks (no circular reference)
    this.callbacks.on("connect", data => {
      const solanaAddress = data.addresses?.find((addr: any) => addr.addressType === AddressType.solana);

      if (solanaAddress) {
        this.updateConnectionState(true, solanaAddress.address);
      }
    });

    this.callbacks.on("disconnect", () => {
      this.updateConnectionState(false, null);
    });
  }

  private syncInitialState(): void {
    if (this.callbacks.isConnected()) {
      const solanaAddress = this.callbacks.getAddresses().find(addr => addr.addressType === AddressType.solana);

      if (solanaAddress) {
        this.updateConnectionState(true, solanaAddress.address);
      }
    }
  }

  private updateConnectionState(connected: boolean, publicKey: string | null): void {
    this._connected = connected;
    this._publicKey = publicKey;
  }

  // Event methods for interface compliance
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
