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

      if (!this.wallet.accounts || this.wallet.accounts.length === 0) {
        throw new Error("No accounts available. Please connect first.");
      }

      const account = this.wallet.accounts[0];
      const serializedTransaction = this.serializeTransaction(transaction);

      // Wallet Standard signTransaction accepts rest parameters and returns an array
      // Even for a single transaction, it returns [{ signedTransaction: Uint8Array }]
      const results = await signTransactionFeature.signTransaction({
        transaction: serializedTransaction,
        account,
      });

      // Wallet Standard returns [{ signedTransaction: Uint8Array }]
      // Handle array result (standard) or single object (some wallets)
      let transactionData: any;

      if (Array.isArray(results) && results.length > 0) {
        // Standard format: array with signedTransaction
        const firstItem = results[0];
        if (firstItem && typeof firstItem === "object") {
          transactionData = firstItem.signedTransaction || firstItem.transaction;
        }
      } else if (results && typeof results === "object" && !Array.isArray(results)) {
        // Fallback: single object format
        transactionData = results.transaction || results.signedTransaction;
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

      if (!this.wallet.accounts || this.wallet.accounts.length === 0) {
        throw new Error("No accounts available. Please connect first.");
      }

      const account = this.wallet.accounts[0];
      const chain = account.chains?.[0] || "solana:mainnet"; // Default to mainnet if not specified
      const serializedTransaction = this.serializeTransaction(transaction);

      // Wallet Standard signAndSendTransaction accepts rest parameters and returns an array
      // Even for a single transaction, it returns [{ signature: Uint8Array }]
      const results = await signAndSendTransactionFeature.signAndSendTransaction({
        transaction: serializedTransaction,
        account,
        chain,
      });

      // Handle array result (standard) or single object (some wallets)
      let signatureOutput: any;
      if (Array.isArray(results) && results.length > 0) {
        signatureOutput = results[0];
      } else if (results && typeof results === "object" && !Array.isArray(results)) {
        signatureOutput = results;
      } else {
        throw new Error("Invalid signAndSendTransaction result format");
      }

      // Wallet Standard returns { signature: Uint8Array } - decode it to string
      if (!signatureOutput.signature) {
        throw new Error("No signature found in signAndSendTransaction result");
      }

      // Convert Uint8Array signature to base58 string
      const signatureBytes = this.parseUint8Array(signatureOutput.signature);
      const signature = bs58.encode(signatureBytes);

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
