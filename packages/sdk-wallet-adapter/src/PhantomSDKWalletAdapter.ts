import { AddressType, BrowserSDK } from "@phantom/browser-sdk";
import type { WalletName } from "@solana/wallet-adapter-base";
import {
  BaseMessageSignerWalletAdapter,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletPublicKeyError,
  WalletReadyState,
  WalletSendTransactionError,
  WalletSignMessageError,
  WalletSignTransactionError,
} from "@solana/wallet-adapter-base";
import type { Transaction, TransactionVersion, VersionedTransaction } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import type { PhantomSDKWalletAdapterConfig } from "./types";

export const PhantomSDKWalletName = "Phantom (Invisible)" as const;

/**
 * Phantom SDK Wallet Adapter for Solana
 * Provides a standard wallet adapter interface for the Phantom Browser SDK's embedded wallet
 */
export class PhantomSDKWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = PhantomSDKWalletName as WalletName;
  url = "https://phantom.app";
  icon =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iNjQiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8xMjBfMTIzNCkiLz4KPGcgZmlsdGVyPSJ1cmwoI2ZpbHRlcjBfZF8xMjBfMTIzNCkiPgo8cGF0aCBkPSJNMjMgNDYuODQ2MkMyMyA0MS4zMDg3IDI3LjQ2MjUgMzYuODQ2MiAzMyAzNi44NDYySDU5LjgzODVDNjUuNTg4MSAzNi44NDYyIDcwLjg3NjggMzkuNzI5NSA3My43MjYyIDQ0LjQ3NUM3NC40MzU3IDQ1LjU4MTcgNzUuNTI3NiA0Ni4zNzg1IDc2Ljc4MDggNDYuNjk3Qzc4LjYzNTUgNDcuMTc2MiA4MC41MjQ1IDQ2LjUyMTkgODEuNzg5MiA0NS4wNDk0Qzg0LjEwMDQgNDIuMzA1MSA4Ny41MTU3IDQwLjczMDggOTEuMTUzOCA0MC43MzA4Qzk3LjgzODUgNDAuNzMwOCAxMDMuMjMxIDQ2LjEyMzEgMTAzLjIzMSA1Mi44MDc3VjY4LjUzODVDMTAzLjIzMSA3NS4yMjMxIDk3LjgzODUgODAuNjE1NCA5MS4xNTM4IDgwLjYxNTRDODQuNDY5MiA4MC42MTU0IDc5LjA3NjkgNzUuMjIzMSA3OS4wNzY5IDY4LjUzODVINDkuODQ2MkM0OS44NDYyIDc1LjIyMzEgNDQuNDUzOCA4MC42MTU0IDM3Ljc2OTIgODAuNjE1NEMzMS4wODQ2IDgwLjYxNTQgMjUuNjkyMyA3NS4yMjMxIDI1LjY5MjMgNjguNTM4NVY1OC45MjMxSDIzVjQ2Ljg0NjJaIiBmaWxsPSIjRkZGRkZGIi8+CjwvZz4KPGRlZnM+CjxmaWx0ZXIgaWQ9ImZpbHRlcjBfZF8xMjBfMTIzNCIgeD0iMTkiIHk9IjM2LjczMDgiIHdpZHRoPSI4OC4yMzA4IiBoZWlnaHQ9IjQ5Ljg4NDYiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIj4KPGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz4KPGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iaGFyZEFscGhhIi8+CjxmZU9mZnNldCBkeT0iMiIvPgo8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIyIi8+CjxmZUNvbXBvc2l0ZSBpbjI9ImhhcmRBbHBoYSIgb3BlcmF0b3I9Im91dCIvPgo8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMC4yIDAiLz4KPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJlZmZlY3QxX2Ryb3BTaGFkb3dfMTIwXzEyMzQiLz4KPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJlZmZlY3QxX2Ryb3BTaGFkb3dfMTIwXzEyMzQiIHJlc3VsdD0ic2hhcGUiLz4KPC9maWx0ZXI+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xMjBfMTIzNCIgeDE9IjY0IiB5MT0iMCIgeDI9IjY0IiB5Mj0iMTI4IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiM1MzREOUQiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjQUIzNEZGIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+";
  supportedTransactionVersions = new Set<TransactionVersion>(["legacy", 0]);

  private _sdk: BrowserSDK | null = null;
  private _connecting: boolean = false;
  private _publicKey: PublicKey | null = null;
  private _readyState: WalletReadyState = WalletReadyState.NotDetected;

  constructor(config: PhantomSDKWalletAdapterConfig) {
    super();

    // Initialize the SDK immediately
    this._sdk = new BrowserSDK({
      providerType: "embedded",
      apiBaseUrl: "https://staging-api.phantom.app/v1/wallets",
      embeddedWalletType: "user-wallet",
      addressTypes: [AddressType.solana],
      authOptions: {
        authUrl: "https://staging-connect.phantom.app/login",
        redirectUrl: config.redirectUrl,
      },
      appId: config.appId,
    } as any);

    // Mark as installed since we're using embedded provider
    this._readyState = WalletReadyState.Installed;

    // Set up event listeners for the SDK
    this.setupEventListeners();
  }

  /**
   * Get the public key of the connected wallet
   */
  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  /**
   * Check if the wallet is connecting
   */
  get connecting(): boolean {
    return this._connecting;
  }

  /**
   * Check if the wallet is connected
   */
  get connected(): boolean {
    return this._sdk?.isConnected() ?? false;
  }

  /**
   * Get the ready state of the wallet
   */
  get readyState(): WalletReadyState {
    return this._readyState;
  }

  /**
   * Set up event listeners for the SDK
   */
  private setupEventListeners(): void {
    if (!this._sdk) return;

    // Listen for connect events
    this._sdk.on("connect", data => {
      if (data && data.addresses && data.addresses.length > 0) {
        const solanaAddress = data.addresses.find((addr: any) => addr.addressType === AddressType.solana);
        if (solanaAddress) {
          this._publicKey = new PublicKey(solanaAddress.address);
          this.emit("connect", this._publicKey);
        }
      }
    });

    // Listen for disconnect events
    this._sdk.on("disconnect", () => {
      this._publicKey = null;
      this.emit("disconnect");
    });

    // Listen for errors
    this._sdk.on("error", error => {
      this.emit("error", error);
    });
  }

  async autoConnect(): Promise<void> {
    if (this.connected || this.connecting) return;

    try {
      await this._sdk?.autoConnect();

      // Check if we're connected after auto-connect
      if (this._sdk?.isConnected()) {
        const addresses = this._sdk.getAddresses();
        const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);

        if (solanaAddress) {
          this._publicKey = new PublicKey(solanaAddress.address);
          this.emit("connect", this._publicKey);
        }
      }
    } catch (error) {
      // Auto-connect failed, user will need to manually connect
      // This is expected behavior if there's no existing session
    }
  }

  /**
   * Connect to the wallet
   */
  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return;
      if (this.readyState !== WalletReadyState.Installed) throw new WalletNotReadyError();

      this._connecting = true;

      if (!this._sdk) {
        throw new WalletConnectionError("SDK not initialized");
      }

      // Try to auto-connect first (for existing sessions)
      try {
        await this._sdk.autoConnect();

        // Check if auto-connect succeeded
        if (this._sdk.isConnected()) {
          const addresses = this._sdk.getAddresses();
          const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana);

          if (solanaAddress) {
            this._publicKey = new PublicKey(solanaAddress.address);
            this.emit("connect", this._publicKey);
            return;
          }
        }
      } catch {
        // Auto-connect failed, proceed with manual connect
      }

      // Manual connect with redirect
      const result = await this._sdk.connect();

      if (!result) {
        throw new WalletConnectionError("Failed to connect to wallet");
      }

      if (result.status === "pending") {
        // Connection requires redirect, waiting for completion
        return;
      }

      const solanaAddress = result.addresses.find(addr => addr.addressType === AddressType.solana);
      if (!solanaAddress) {
        throw new WalletPublicKeyError("No Solana address found");
      }

      this._publicKey = new PublicKey(solanaAddress.address);
      this.emit("connect", this._publicKey);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message, error);
    } finally {
      this._connecting = false;
    }
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    const sdk = this._sdk;

    if (sdk) {
      this._publicKey = null;

      try {
        await sdk.disconnect();
      } catch (error: any) {
        throw new WalletDisconnectionError(error?.message, error);
      }
    }

    this.emit("disconnect");
  }

  /**
   * Sign and send a transaction
   */
  async sendTransaction(transaction: Transaction, _connection: any, _options: any = {}): Promise<string> {
    try {
      if (!this._sdk || !this._sdk.isConnected()) throw new WalletNotConnectedError();

      // Sign and send via SDK's Solana chain interface
      const result = await this._sdk.solana.signAndSendTransaction(transaction);

      if (!result || !result.signature) {
        throw new WalletSendTransactionError("Transaction failed");
      }

      return result.signature;
    } catch (error: any) {
      throw new WalletSendTransactionError(error?.message, error);
    }
  }

  /**
   * Sign a transaction
   */
  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    try {
      if (!this._sdk || !this._sdk.isConnected()) throw new WalletNotConnectedError();

      // Sign via SDK's Solana chain interface
      const signedTransaction = await this._sdk.solana.signTransaction(transaction);

      return signedTransaction as T;
    } catch (error: any) {
      throw new WalletSignTransactionError(error?.message, error);
    }
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    try {
      if (!this._sdk || !this._sdk.isConnected()) throw new WalletNotConnectedError();

      // Check if SDK supports signAllTransactions
      if (!this._sdk.solana.signAllTransactions) {
        // Fallback to signing one by one
        const signedTransactions: T[] = [];
        for (const transaction of transactions) {
          const signed = await this.signTransaction(transaction);
          signedTransactions.push(signed);
        }
        return signedTransactions;
      }

      // Sign all via SDK's Solana chain interface
      const signedTransactions = await this._sdk.solana.signAllTransactions(transactions);

      return signedTransactions as T[];
    } catch (error: any) {
      throw new WalletSignTransactionError(error?.message, error);
    }
  }

  /**
   * Sign a message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      if (!this._sdk || !this._sdk.isConnected()) throw new WalletNotConnectedError();

      const result = await this._sdk.solana.signMessage(message);

      if (!result || !result.signature) {
        throw new WalletSignMessageError("Failed to sign message");
      }

      return result.signature;
    } catch (error: any) {
      throw new WalletSignMessageError(error?.message, error);
    }
  }
}
