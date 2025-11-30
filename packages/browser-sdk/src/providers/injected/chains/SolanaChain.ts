import { EventEmitter } from "eventemitter3";
import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { Solana } from "@phantom/browser-injected-sdk/solana";
import type { Extension } from "@phantom/browser-injected-sdk";
import { AddressType } from "@phantom/client";
import { Buffer } from "buffer";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";
import type { InjectedWalletRegistry } from "../../../wallets/registry";

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
  private walletId: string;
  private walletRegistry: InjectedWalletRegistry;
  private _publicKey: string | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(phantom: PhantomExtended, walletId: string, walletRegistry: InjectedWalletRegistry) {
    this.phantom = phantom;
    this.walletId = walletId;
    this.walletRegistry = walletRegistry;
    this.setupEventListeners();
    this.syncInitialState();
  }

  // Wallet adapter compliant properties
  get connected(): boolean {
    return this.walletRegistry.isWalletConnected(this.walletId);
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
    const publicKey = typeof result === "string" ? result : result.publicKey || "";
    
    // Update wallet registry state
    const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
    const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);
    const newAddresses = solanaAddress 
      ? addresses.map(addr => addr.addressType === AddressType.solana ? { ...addr, address: publicKey } : addr)
      : [...addresses, { addressType: AddressType.solana, address: publicKey }];
    
    this.walletRegistry.setWalletAddresses(this.walletId, newAddresses);
    this.walletRegistry.setWalletConnected(this.walletId, true);
    this._publicKey = publicKey;
    
    return { publicKey };
  }

  async disconnect(): Promise<void> {
    // For multi-chain wallets (Phantom), disconnect all chains
    const wallet = this.walletRegistry.getById(this.walletId);
    if (wallet && wallet.addressTypes.length > 1) {
      // Clear all addresses for multi-chain wallet
      this.walletRegistry.setWalletAddresses(this.walletId, []);
    } else {
      // For single-chain wallets, only clear Solana addresses
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const filteredAddresses = addresses.filter(addr => addr.addressType !== AddressType.solana);
      this.walletRegistry.setWalletAddresses(this.walletId, filteredAddresses);
    }
    
    await this.phantom.solana.disconnect();
    this.walletRegistry.setWalletConnected(this.walletId, false);
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
    if (!this.walletRegistry.isWalletConnected(this.walletId)) {
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
    if (!this.walletRegistry.isWalletConnected(this.walletId)) {
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
    if (!this.walletRegistry.isWalletConnected(this.walletId)) {
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
    return this.walletRegistry.isWalletConnected(this.walletId);
  }

  private setupEventListeners(): void {
    // Bridge phantom events to wallet adapter standard events
    this.phantom.solana.addEventListener("connect", (publicKey: string) => {
      this._publicKey = publicKey;
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);
      const newAddresses = solanaAddress
        ? addresses.map(addr => addr.addressType === AddressType.solana ? { ...addr, address: publicKey } : addr)
        : [...addresses, { addressType: AddressType.solana, address: publicKey }];
      
      this.walletRegistry.setWalletAddresses(this.walletId, newAddresses);
      this.walletRegistry.setWalletConnected(this.walletId, true);
      this.eventEmitter.emit("connect", publicKey);
    });

    this.phantom.solana.addEventListener("disconnect", () => {
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const filteredAddresses = addresses.filter(addr => addr.addressType !== AddressType.solana);
      this.walletRegistry.setWalletAddresses(this.walletId, filteredAddresses);
      
      // If no addresses left, mark as disconnected
      if (filteredAddresses.length === 0) {
        this.walletRegistry.setWalletConnected(this.walletId, false);
      }
      
      this._publicKey = null;
      this.eventEmitter.emit("disconnect");
    });

    this.phantom.solana.addEventListener("accountChanged", (publicKey: string) => {
      this._publicKey = publicKey;
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const newAddresses = addresses.map(addr =>
        addr.addressType === AddressType.solana ? { ...addr, address: publicKey } : addr
      );
      this.walletRegistry.setWalletAddresses(this.walletId, newAddresses);
      this.eventEmitter.emit("accountChanged", publicKey);
    });
  }

  private syncInitialState(): void {
    if (this.walletRegistry.isWalletConnected(this.walletId)) {
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);

      if (solanaAddress) {
        this._publicKey = solanaAddress.address;
      }
    }
  }

  // Event methods for interface compliance
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
