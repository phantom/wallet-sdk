import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";
import { debug, DebugCategory } from "../../../debug";
import { deserializeSolanaTransaction } from "@phantom/parsers";
import bs58 from "bs58";

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

  async connect(_options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
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
        address =
          firstAccount.address ||
          firstAccount.publicKey?.toString() ||
          (firstAccount.publicKey instanceof Uint8Array
            ? Buffer.from(firstAccount.publicKey).toString("hex")
            : undefined);
      }

      if (!address) {
        throw new Error(
          `Could not extract address from account. Account structure: ${JSON.stringify(firstAccount, null, 2)}`,
        );
      }

      this._connected = true;
      this._publicKey = address;

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
    try {
      const disconnectFeature = this.wallet.features?.["standard:disconnect"];
      if (disconnectFeature && typeof disconnectFeature.disconnect === "function") {
        await disconnectFeature.disconnect();
      }

      this._connected = false;
      this._publicKey = null;
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
      const signature = this.parseUint8Array(signedMessageResult.signature);

      if (signature.length === 0) {
        throw new Error(`Signature is empty`);
      }

      const publicKey =
        signedMessageResult.account?.address || this.wallet.accounts?.[0]?.address || this._publicKey || "";

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
    try {
      const signTransactionFeature = this.wallet.features?.["solana:signTransaction"];
      if (!signTransactionFeature || typeof signTransactionFeature.signTransaction !== "function") {
        throw new Error("Wallet Standard signTransaction feature not available");
      }

      const serializedTransaction = this.serializeTransaction(transaction);

      const result = await signTransactionFeature.signTransaction({
        transaction: serializedTransaction,
        account: this.wallet.accounts?.[0],
      });

      // Wallet Standard returns { transaction: Uint8Array }
      // Some wallets (like Solflare) return [{ signedTransaction: Uint8Array }]
      let transactionData: any;
      
      if (Array.isArray(result) && result.length > 0) {
        // Handle array format: [{ signedTransaction: ... }] or [{ transaction: ... }]
        const firstItem = result[0];
        if (firstItem && typeof firstItem === "object") {
          transactionData = firstItem.signedTransaction || firstItem.transaction;
        }
      } else if (result && typeof result === "object" && !Array.isArray(result)) {
        // Handle object format: { transaction: ... } or { signedTransaction: ... }
        transactionData = result.transaction || result.signedTransaction;
      }
      
      if (!transactionData) {
        throw new Error("No transaction data found in Wallet Standard result");
      }

      const signedBytes = this.parseUint8Array(transactionData);
      
      if (signedBytes.length === 0) {
        throw new Error("Empty signed transaction returned from Wallet Standard");
      }

      // Reconstruct a proper Transaction/VersionedTransaction object using parsers package
      const signedTx = deserializeSolanaTransaction(signedBytes);

      return signedTx;
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
    try {
      const signAndSendTransactionFeature = this.wallet.features?.["solana:signAndSendTransaction"];
      if (
        !signAndSendTransactionFeature ||
        typeof signAndSendTransactionFeature.signAndSendTransaction !== "function"
      ) {
        throw new Error("Wallet Standard signAndSendTransaction feature not available");
      }

      const serializedTransaction = this.serializeTransaction(transaction);

      const result = await signAndSendTransactionFeature.signAndSendTransaction({
        transaction: serializedTransaction,
        account: this.wallet.accounts?.[0],
      });

      // Wallet Standard returns { signature: string | Uint8Array }
      // Standard format: result.signature should be the signature
      const signature = this.parseSignature(result);

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
    try {
      const signedTransactions: (Transaction | VersionedTransaction)[] = [];
      for (const transaction of transactions) {
        const signedTx = await this.signTransaction(transaction);
        signedTransactions.push(signedTx);
      }
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
    try {
      const signatures: string[] = [];
      for (const transaction of transactions) {
        const result = await this.signAndSendTransaction(transaction);
        signatures.push(result.signature);
      }
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

  async switchNetwork(network: "mainnet" | "devnet"): Promise<void> {
    try {
      // Wallet Standard uses standard:switchNetwork feature
      const switchNetworkFeature = this.wallet.features?.["standard:switchNetwork"];
      if (switchNetworkFeature && typeof switchNetworkFeature.switchNetwork === "function") {
        // Map network to Wallet Standard chain ID format
        const chainId = network === "mainnet" ? "solana:mainnet" : "solana:devnet";
        await switchNetworkFeature.switchNetwork({ chain: chainId });
      }
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet Standard Solana switchNetwork failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        network,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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

  /**
   * Serialize a transaction to Uint8Array for Wallet Standard API
   */
  private serializeTransaction(transaction: Transaction | VersionedTransaction): Uint8Array {
    if (typeof transaction.serialize === "function") {
      return transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
    }
    if (transaction instanceof Uint8Array) {
      return transaction;
    }
    return new Uint8Array(0);
  }

  /**
   * Parse a signature from Wallet Standard result
   * Wallet Standard format: { signature: string | Uint8Array }
   * Some wallets may return array-like objects with numeric keys (e.g., { "0": ... })
   */
  private parseSignature(result: any): string {
    // Handle array-like results (some wallets return arrays)
    if (Array.isArray(result) && result.length > 0) {
      const firstItem = result[0];
      if (typeof firstItem === "string") {
        return firstItem;
      }
      if (firstItem instanceof Uint8Array) {
        return bs58.encode(firstItem);
      }
      if (typeof firstItem === "object" && firstItem !== null && firstItem.signature) {
        result = firstItem;
      }
    }

    // Handle numeric key access (array-like object, e.g., { "0": ... })
    if (result && typeof result === "object" && "0" in result && !("signature" in result)) {
      const firstItem = result[0];
      if (typeof firstItem === "string") {
        return firstItem;
      }
      if (firstItem instanceof Uint8Array) {
        return bs58.encode(firstItem);
      }
      // If it's an object with numeric keys representing a Uint8Array, parse it
      const bytes = this.parseUint8Array(result);
      if (bytes.length > 0) {
        return bs58.encode(bytes);
      }
    }

    // Standard format: result.signature
    if (result?.signature) {
      if (typeof result.signature === "string") {
        return result.signature;
      }
      if (result.signature instanceof Uint8Array) {
        return bs58.encode(result.signature);
      }
      if (Array.isArray(result.signature)) {
        return bs58.encode(new Uint8Array(result.signature));
      }
    }

    throw new Error(
      `No signature found in Wallet Standard result. Result structure: ${JSON.stringify(result, null, 2)}`,
    );
  }

  /**
   * Parse a Uint8Array from various formats
   * Handles: Uint8Array, Array, object with numeric keys (JSON-serialized Uint8Array)
   */
  private parseUint8Array(value: any): Uint8Array {
    if (value instanceof Uint8Array) {
      return value;
    }
    if (Array.isArray(value)) {
      return new Uint8Array(value);
    }
    if (typeof value === "object" && value !== null) {
      // Handle object with numeric keys (JSON-serialized Uint8Array, e.g., {"0":0,"1":0,...})
      const keys = Object.keys(value)
        .map(Number)
        .filter(k => !isNaN(k) && k >= 0)
        .sort((a, b) => a - b);

      if (keys.length > 0) {
        const maxKey = Math.max(...keys);
        const array = new Uint8Array(maxKey + 1);
        for (const key of keys) {
          array[key] = Number(value[key]) || 0;
        }
        return array;
      }
    }
    return new Uint8Array(0);
  }
}
