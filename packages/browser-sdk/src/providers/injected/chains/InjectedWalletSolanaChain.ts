import { EventEmitter } from "eventemitter3";
import type { ISolanaChain } from "@phantom/chain-interfaces";
import { Buffer } from "buffer";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";
import { debug, DebugCategory } from "../../../debug";

/**
 * Wrapper for external Wallet Standard Solana providers
 * Adds debug logging and implements ISolanaChain interface
 */
export class InjectedWalletSolanaChain implements ISolanaChain {
  private provider: ISolanaChain;
  private walletId: string;
  private walletName: string;
  private eventEmitter: EventEmitter = new EventEmitter();
  private _connected: boolean = false;
  private _publicKey: string | null = null;

  constructor(provider: ISolanaChain, walletId: string, walletName: string) {
    this.provider = provider;
    this.walletId = walletId;
    this.walletName = walletName;
    this.setupEventListeners();
  }

  get connected(): boolean {
    return this._connected;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  async connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Solana connect", {
      walletId: this.walletId,
      walletName: this.walletName,
      onlyIfTrusted: options?.onlyIfTrusted,
    });

    try {
      const result: any = await this.provider.connect(options);

      // Handle string result (Phantom returns publicKey as string)
      if (typeof result === "string") {
        this._connected = true;
        this._publicKey = result;
        debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana connected", {
          walletId: this.walletId,
          walletName: this.walletName,
          publicKey: result,
        });
        return { publicKey: result };
      }

      // Handle object with publicKey property
      if (typeof result === "object" && result !== null && "publicKey" in result) {
        this._connected = true;
        this._publicKey = result.publicKey;
        debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana connected", {
          walletId: this.walletId,
          walletName: this.walletName,
          publicKey: result.publicKey,
        });
        return result;
      }

      // Handle array of accounts
      if (Array.isArray(result) && result.length > 0) {
        const firstAccount = result[0] as any;
        if (typeof firstAccount === "object" && firstAccount !== null && "address" in firstAccount) {
          this._connected = true;
          this._publicKey = firstAccount.address;
          debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana connected", {
            walletId: this.walletId,
            walletName: this.walletName,
            publicKey: firstAccount.address,
          });
          return { publicKey: firstAccount.address };
        }
      }

      throw new Error("Unexpected connect result format");
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Solana connect failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Solana disconnect", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      await this.provider.disconnect();
      this._connected = false;
      this._publicKey = null;
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana disconnected", {
        walletId: this.walletId,
        walletName: this.walletName,
      });
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Solana disconnect failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }> {
    const messageBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const messagePreview = typeof message === "string" ? message.substring(0, 50) : `${messageBytes.length} bytes`;

    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signMessage", {
      walletId: this.walletId,
      walletName: this.walletName,
      messagePreview,
      messageLength: messageBytes.length,
    });

    try {
      const result = await this.provider.signMessage(message);
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signMessage success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signatureLength: result.signature.length,
      });
      return {
        signature:
          result.signature instanceof Uint8Array
            ? result.signature
            : new Uint8Array(Buffer.from(result.signature, "base64")),
        publicKey: result.publicKey || this._publicKey || "",
      };
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signMessage failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signTransaction", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      const result = await this.provider.signTransaction(transaction);
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signTransaction success", {
        walletId: this.walletId,
        walletName: this.walletName,
      });
      return result;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signTransaction failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<{ signature: string }> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAndSendTransaction", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      const result = await this.provider.signAndSendTransaction(transaction);
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAndSendTransaction success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signature: result.signature,
      });
      return result;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAndSendTransaction failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<(Transaction | VersionedTransaction)[]> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAllTransactions", {
      walletId: this.walletId,
      walletName: this.walletName,
      transactionCount: transactions.length,
    });

    try {
      const result = await this.provider.signAllTransactions(transactions);
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAllTransactions success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signedCount: result.length,
      });
      return result;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAllTransactions failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signAndSendAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<{ signatures: string[] }> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAndSendAllTransactions", {
      walletId: this.walletId,
      walletName: this.walletName,
      transactionCount: transactions.length,
    });

    try {
      const result = await this.provider.signAndSendAllTransactions(transactions);
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAndSendAllTransactions success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signatureCount: result.signatures.length,
      });
      return result;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Solana signAndSendAllTransactions failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  switchNetwork(_network: "mainnet" | "devnet"): Promise<void> {
    return Promise.resolve();
  }

  getPublicKey(): Promise<string | null> {
    return Promise.resolve(this._publicKey);
  }

  isConnected(): boolean {
    return this._connected;
  }

  private setupEventListeners(): void {
    if (typeof this.provider.on === "function") {
      this.provider.on("connect", (publicKey: string) => {
        this._connected = true;
        this._publicKey = publicKey;
        this.eventEmitter.emit("connect", publicKey);
      });

      this.provider.on("disconnect", () => {
        this._connected = false;
        this._publicKey = null;
        this.eventEmitter.emit("disconnect");
      });

      this.provider.on("accountChanged", (publicKey: string) => {
        this._publicKey = publicKey;
        this.eventEmitter.emit("accountChanged", publicKey);
      });
    }
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
