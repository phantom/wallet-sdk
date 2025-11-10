import { EventEmitter } from "eventemitter3";
import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { EmbeddedProvider } from "../embedded-provider";
import { NetworkId } from "@phantom/constants";
import bs58 from "bs58";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";
import { parseSolanaSignedTransaction } from "@phantom/parsers";

/**
 * Embedded Solana chain implementation that is wallet adapter compliant
 */
export class EmbeddedSolanaChain implements ISolanaChain {
  private currentNetworkId: NetworkId = NetworkId.SOLANA_MAINNET;
  private _connected: boolean = false;
  private _publicKey: string | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(private provider: EmbeddedProvider) {
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

  private ensureConnected(): void {
    if (!this.provider.isConnected()) {
      throw new Error("Solana chain not available. Ensure SDK is connected.");
    }
  }

  // Standard wallet adapter methods
  async signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }> {
    this.ensureConnected();
    const messageStr = typeof message === "string" ? message : new TextDecoder().decode(message);
    const result = await this.provider.signMessage({
      message: messageStr,
      networkId: this.currentNetworkId,
    });

    // Convert signature to Uint8Array - result.signature is base58 encoded from parseSignMessageResponse
    const signature =
      typeof result.signature === "string" ? new Uint8Array(bs58.decode(result.signature)) : result.signature;

    return {
      signature,
      publicKey: this._publicKey || "",
    };
  }

  async signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    this.ensureConnected();
    const result = await this.provider.signTransaction({
      transaction,
      networkId: this.currentNetworkId,
    });

    // Parse the signed transaction from base64url back to Transaction/VersionedTransaction
    const signedTransaction = parseSolanaSignedTransaction(result.rawTransaction);
    if (!signedTransaction) {
      throw new Error("Failed to parse signed transaction");
    }
    return signedTransaction;
  }

  async signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<{ signature: string }> {
    this.ensureConnected();
    const result = await this.provider.signAndSendTransaction({
      transaction,
      networkId: this.currentNetworkId,
    });
    if (!result.hash) {
      throw new Error("Transaction not submitted");
    }
    return { signature: result.hash };
  }

  async signAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<(Transaction | VersionedTransaction)[]> {
    this.ensureConnected();
    const results = await Promise.all(transactions.map(tx => this.signTransaction(tx)));
    return results;
  }

  async signAndSendAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<{ signatures: string[] }> {
    const results = await Promise.all(transactions.map(tx => this.signAndSendTransaction(tx)));
    return { signatures: results.map(result => result.signature) };
  }

  connect(_options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    if (!this.provider.isConnected()) {
      throw new Error("Provider not connected. Call provider connect first.");
    }
    const addresses = this.provider.getAddresses();
    const solanaAddr = addresses.find((a: any) => a.addressType === "Solana");
    if (!solanaAddr) throw new Error("No Solana address found");

    this.updateConnectionState(true, solanaAddr.address);
    return Promise.resolve({ publicKey: solanaAddr.address });
  }

  async disconnect(): Promise<void> {
    // For embedded, disconnection is handled at SDK level
    return this.provider.disconnect();
  }

  switchNetwork(network: "mainnet" | "devnet"): Promise<void> {
    this.currentNetworkId = network === "mainnet" ? NetworkId.SOLANA_MAINNET : NetworkId.SOLANA_DEVNET;
    return Promise.resolve();
  }

  getPublicKey(): Promise<string | null> {
    if (!this.provider.isConnected()) return Promise.resolve(null);

    const addresses = this.provider.getAddresses();
    const solanaAddr = addresses.find((a: any) => a.addressType === "Solana");
    return Promise.resolve(solanaAddr?.address || null);
  }

  isConnected(): boolean {
    return this._connected && this.provider.isConnected();
  }

  private setupEventListeners(): void {
    // Listen to provider events and bridge to wallet adapter events
    this.provider.on("connect", (data: any) => {
      const solanaAddress = data.addresses?.find((addr: any) => addr.addressType === "Solana");

      if (solanaAddress) {
        this.updateConnectionState(true, solanaAddress.address);
        this.eventEmitter.emit("connect", solanaAddress.address);
      }
    });

    this.provider.on("disconnect", () => {
      this.updateConnectionState(false, null);
      this.eventEmitter.emit("disconnect");
    });
  }

  private syncInitialState(): void {
    if (this.provider.isConnected()) {
      const addresses = this.provider.getAddresses();
      const solanaAddress = addresses.find((a: any) => a.addressType === "Solana");

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
