import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";
import { debug, DebugCategory } from "../../../debug";

/**
 * Adapter to wrap Wallet Standard wallets and implement ISolanaChain
 * Wallet Standard wallets use a features-based API instead of direct methods
 */
export class WalletStandardSolanaAdapter implements ISolanaChain {
  private wallet: any; // Wallet Standard wallet object
  private walletId: string;
  private walletName: string;
  private _connected: boolean = false;
  private _publicKey: string | null = null;

  constructor(wallet: any, walletId: string, walletName: string) {
    this.wallet = wallet;
    this.walletId = walletId;
    this.walletName = walletName;
  }

  get connected(): boolean {
    return this._connected;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  async connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana connect", {
      walletId: this.walletId,
      walletName: this.walletName,
      onlyIfTrusted: options?.onlyIfTrusted,
    });

    try {
      // Wallet Standard uses standard:connect feature
      const connectFeature = this.wallet.features?.["standard:connect"];
      if (!connectFeature || typeof connectFeature.connect !== "function") {
        throw new Error("Wallet Standard connect feature not available");
      }

      // Call standard:connect
      // Note: standard:connect may return accounts or void (and update wallet.accounts)
      const connectResult = await connectFeature.connect();
      
      // After connecting, accounts should be available in wallet.accounts or returned from connect()
      let accounts: any[] | undefined;
      
      if (Array.isArray(connectResult) && connectResult.length > 0) {
        // Some wallets return accounts directly
        accounts = connectResult;
      } else if (this.wallet.accounts && this.wallet.accounts.length > 0) {
        // Others update wallet.accounts
        accounts = Array.from(this.wallet.accounts);
      }
      
      debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet Standard connect accounts", {
        walletId: this.walletId,
        walletName: this.walletName,
        connectResultType: typeof connectResult,
        connectResultIsArray: Array.isArray(connectResult),
        walletAccountsLength: this.wallet.accounts?.length || 0,
        accountsLength: accounts?.length || 0,
        firstAccountType: accounts && accounts.length > 0 ? typeof accounts[0] : undefined,
        firstAccount: accounts && accounts.length > 0 ? accounts[0] : undefined,
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts available after connecting to wallet");
      }

      // Get the first account's address
      const firstAccount = accounts[0];
      
      if (!firstAccount) {
        throw new Error("First account is null or undefined");
      }

      let address: string | undefined;
      
      // Handle different account formats
      if (typeof firstAccount === "string") {
        address = firstAccount;
      } else if (typeof firstAccount === "object" && firstAccount !== null) {
        // Wallet Standard accounts have an 'address' property
        address = firstAccount.address || 
                  firstAccount.publicKey?.toString() || 
                  (firstAccount.publicKey instanceof Uint8Array ? 
                    Buffer.from(firstAccount.publicKey).toString("hex") : undefined);
      }

      if (!address) {
        debug.error(DebugCategory.INJECTED_PROVIDER, "Could not extract address from account", {
          walletId: this.walletId,
          walletName: this.walletName,
          firstAccount,
          accountKeys: typeof firstAccount === "object" && firstAccount !== null ? Object.keys(firstAccount) : undefined,
        });
        throw new Error(`Could not extract address from account. Account structure: ${JSON.stringify(firstAccount, null, 2)}`);
      }

      this._connected = true;
      this._publicKey = address;
      
      debug.info(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana connected", {
        walletId: this.walletId,
        walletName: this.walletName,
        publicKey: address,
      });

      return { publicKey: address };
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana connect failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana disconnect", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      const disconnectFeature = this.wallet.features?.["standard:disconnect"];
      if (disconnectFeature && typeof disconnectFeature.disconnect === "function") {
        await disconnectFeature.disconnect();
      }
      
      this._connected = false;
      this._publicKey = null;
      
      debug.info(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana disconnected", {
        walletId: this.walletId,
        walletName: this.walletName,
      });
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana disconnect failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signMessage", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      const signMessageFeature = this.wallet.features?.["solana:signMessage"];
      if (!signMessageFeature || typeof signMessageFeature.signMessage !== "function") {
        throw new Error("Wallet Standard signMessage feature not available");
      }

      const messageBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
      const result = await signMessageFeature.signMessage({
        message: messageBytes,
        account: this.wallet.accounts?.[0],
      });

      // Wallet Standard signMessage returns an array with signed message objects
      // Each object has: { signedMessage: Uint8Array, signature: Uint8Array }
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error(`Expected array result from signMessage, got: ${typeof result}`);
      }

      const signedMessageResult = result[0];
      if (!signedMessageResult || !signedMessageResult.signature) {
        throw new Error(`Invalid signMessage result structure: ${JSON.stringify(result)}`);
      }

      // Convert signature to Uint8Array
      // It might be a Uint8Array, an array, or an object with numeric keys (serialized)
      let signature: Uint8Array;
      const signatureValue = signedMessageResult.signature;

      if (signatureValue instanceof Uint8Array) {
        signature = signatureValue;
      } else if (Array.isArray(signatureValue)) {
        signature = new Uint8Array(signatureValue);
      } else if (typeof signatureValue === "object" && signatureValue !== null) {
        // Handle object with numeric keys (serialized Uint8Array from JSON)
        // Find the maximum key to determine the length
        const numericKeys = Object.keys(signatureValue)
          .map(Number)
          .filter(k => !isNaN(k) && k >= 0);
        
        if (numericKeys.length === 0) {
          throw new Error(`Could not parse signature object: no numeric keys found`);
        }
        
        const maxKey = Math.max(...numericKeys);
        signature = new Uint8Array(maxKey + 1);
        
        for (const key of numericKeys) {
          signature[key] = signatureValue[key] || 0;
        }
      } else {
        throw new Error(`Invalid signature format: ${typeof signatureValue}`);
      }
      
      if (signature.length === 0) {
        throw new Error(`Signature is empty`);
      }
      
      const publicKey = signedMessageResult.account?.address || this.wallet.accounts?.[0]?.address || this._publicKey || "";

      debug.info(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signMessage success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signatureLength: signature.length,
      });

      return { signature, publicKey };
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signMessage failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signTransaction", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      const signTransactionFeature = this.wallet.features?.["solana:signTransaction"];
      if (!signTransactionFeature || typeof signTransactionFeature.signTransaction !== "function") {
        throw new Error("Wallet Standard signTransaction feature not available");
      }

      const result = await signTransactionFeature.signTransaction({
        transaction,
        account: this.wallet.accounts?.[0],
      });

      debug.info(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signTransaction success", {
        walletId: this.walletId,
        walletName: this.walletName,
      });

      return result.transaction;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signTransaction failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<{ signature: string }> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAndSendTransaction", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      const signAndSendTransactionFeature = this.wallet.features?.["solana:signAndSendTransaction"];
      if (!signAndSendTransactionFeature || typeof signAndSendTransactionFeature.signAndSendTransaction !== "function") {
        throw new Error("Wallet Standard signAndSendTransaction feature not available");
      }

      const result = await signAndSendTransactionFeature.signAndSendTransaction({
        transaction,
        account: this.wallet.accounts?.[0],
      });

      const signature = typeof result.signature === "string" 
        ? result.signature 
        : Buffer.from(result.signature).toString("base64");

      debug.info(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAndSendTransaction success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signature,
      });

      return { signature };
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAndSendTransaction failed", {
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
    debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAllTransactions", {
      walletId: this.walletId,
      walletName: this.walletName,
      transactionCount: transactions.length,
    });

    try {
      const signTransactionFeature = this.wallet.features?.["solana:signTransaction"];
      if (!signTransactionFeature || typeof signTransactionFeature.signTransaction !== "function") {
        throw new Error("Wallet Standard signTransaction feature not available");
      }

      // Sign all transactions sequentially
      const signedTransactions: (Transaction | VersionedTransaction)[] = [];
      for (const transaction of transactions) {
        const result = await signTransactionFeature.signTransaction({
          transaction,
          account: this.wallet.accounts?.[0],
        });
        signedTransactions.push(result.transaction);
      }

      debug.info(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAllTransactions success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signedCount: signedTransactions.length,
      });

      return signedTransactions;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAllTransactions failed", {
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
    debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAndSendAllTransactions", {
      walletId: this.walletId,
      walletName: this.walletName,
      transactionCount: transactions.length,
    });

    try {
      const signAndSendTransactionFeature = this.wallet.features?.["solana:signAndSendTransaction"];
      if (!signAndSendTransactionFeature || typeof signAndSendTransactionFeature.signAndSendTransaction !== "function") {
        throw new Error("Wallet Standard signAndSendTransaction feature not available");
      }

      // Sign and send all transactions sequentially
      const signatures: string[] = [];
      for (const transaction of transactions) {
        const result = await signAndSendTransactionFeature.signAndSendTransaction({
          transaction,
          account: this.wallet.accounts?.[0],
        });
        const signature = typeof result.signature === "string" 
          ? result.signature 
          : Buffer.from(result.signature).toString("base64");
        signatures.push(signature);
      }

      debug.info(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAndSendAllTransactions success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signatureCount: signatures.length,
      });

      return { signatures };
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana signAndSendAllTransactions failed", {
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

  on(_event: string, _listener: (...args: any[]) => void): void {
    // Wallet Standard uses events feature
    const eventsFeature = this.wallet.features?.["standard:events"];
    if (eventsFeature && typeof eventsFeature.on === "function") {
      eventsFeature.on(_event, _listener);
    }
  }

  off(_event: string, _listener: (...args: any[]) => void): void {
    const eventsFeature = this.wallet.features?.["standard:events"];
    if (eventsFeature && typeof eventsFeature.off === "function") {
      eventsFeature.off(_event, _listener);
    }
  }
}

