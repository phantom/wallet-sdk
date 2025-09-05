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
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiB2aWV3Qm94PSIwIDAgMTA4IDEwOCIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00Ni41MjY3IDY5LjkyMjlDNDIuMDA1NCA3Ni44NTA5IDM0LjQyOTIgODUuNjE4MiAyNC4zNDggODUuNjE4MkMxOS41ODI0IDg1LjYxODIgMTUgODMuNjU2MyAxNSA3NS4xMzQyQzE1IDUzLjQzMDUgNDQuNjMyNiAxOS44MzI3IDcyLjEyNjggMTkuODMyN0M4Ny43NjggMTkuODMyNyA5NCAzMC42ODQ2IDk0IDQzLjAwNzlDOTQgNTguODI1OCA4My43MzU1IDc2LjkxMjIgNzMuNTMyMSA3Ni45MTIyQzcwLjI5MzkgNzYuOTEyMiA2OC43MDUzIDc1LjEzNDIgNjguNzA1MyA3Mi4zMTRDNjguNzA1MyA3MS41NzgzIDY4LjgyNzUgNzAuNzgxMiA2OS4wNzE5IDY5LjkyMjlDNjUuNTg5MyA3NS44Njk5IDU4Ljg2ODUgODEuMzg3OCA1Mi41NzU0IDgxLjM4NzhDNDcuOTkzIDgxLjM4NzggNDUuNjcxMyA3OC41MDYzIDQ1LjY3MTMgNzQuNDU5OEM0NS42NzEzIDcyLjk4ODQgNDUuOTc2OCA3MS40NTU2IDQ2LjUyNjcgNjkuOTIyOVpNODMuNjc2MSA0Mi41Nzk0QzgzLjY3NjEgNDYuMTcwNCA4MS41NTc1IDQ3Ljk2NTggNzkuMTg3NSA0Ny45NjU4Qzc2Ljc4MTYgNDcuOTY1OCA3NC42OTg5IDQ2LjE3MDQgNzQuNjk4OSA0Mi41Nzk0Qzc0LjY5ODkgMzguOTg4NSA3Ni43ODE2IDM3LjE5MzEgNzkuMTg3NSAzNy4xOTMxQzgxLjU1NzUgMzcuMTkzMSA4My42NzYxIDM4Ljk4ODUgODMuNjc2MSA0Mi41Nzk0Wk03MC4yMTAzIDQyLjU3OTVDNzAuMjEwMyA0Ni4xNzA0IDY4LjA5MTYgNDcuOTY1OCA2NS43MjE2IDQ3Ljk2NThDNjMuMzE1NyA0Ny45NjU4IDYxLjIzMyA0Ni4xNzA0IDYxLjIzMyA0Mi41Nzk1QzYxLjIzMyAzOC45ODg1IDYzLjMxNTcgMzcuMTkzMSA2NS43MjE2IDM3LjE5MzFDNjguMDkxNiAzNy4xOTMxIDcwLjIxMDMgMzguOTg4NSA3MC4yMTAzIDQyLjU3OTVaIiBmaWxsPSIjRkZGREY4Ii8+Cjwvc3ZnPg==";
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
        authUrl: "http://localhost:3000/login",
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
