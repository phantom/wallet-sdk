import type { ISolanaChain } from "@phantom/chains";
import type { DeeplinksSession } from "../session";
import type { DeeplinksCommunicator } from "../communication";
import type { SecureCrypto } from "../secureCrypto";
import { 
  generateSignMessageDeeplink, 
  generateSignTransactionDeeplink,
  generateSignAndSendTransactionDeeplink,
  buildRedirectLink,
  type EncryptedPayload 
} from "@phantom/deeplinks";
import bs58 from "bs58";
import { debug, DebugCategory } from "../../../debug";

// Payload type definitions for each method
interface SignMessagePayload {
  message: string; // base58 encoded message
  display: "utf8" | "hex";
}

interface SignTransactionPayload {
  transaction: number[]; // serialized transaction as byte array
}

interface SignAllTransactionsPayload {
  transactions: number[][]; // array of serialized transactions
}

interface SignAndSendTransactionPayload {
  transaction: number[]; // serialized transaction as byte array
}

export class DeeplinksSolanaChain implements ISolanaChain {
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(
    private session: DeeplinksSession,
    private communicator: DeeplinksCommunicator,
    private secureCrypto: SecureCrypto,
  ) {}

  // Required wallet adapter properties
  get publicKey(): string | null {
    return this.session.publicKey || null;
  }

  get connected(): boolean {
    return !!(this.session.sessionToken && this.session.publicKey);
  }

  // Core wallet adapter methods
  connect(_options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    // This would typically be handled by the main provider's connect method
    // but we implement it here for interface compliance
    if (this.session.publicKey) {
      return Promise.resolve({ publicKey: this.session.publicKey });
    }
    return Promise.reject(new Error("Not connected. Use the main provider's connect method first."));
  }

  disconnect(): Promise<void> {
    // This would typically be handled by the main provider's disconnect method
    return Promise.reject(new Error("Use the main provider's disconnect method."));
  }

  // Legacy compatibility methods
  getPublicKey(): Promise<string | null> {
    return Promise.resolve(this.publicKey);
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Event methods
  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  // Private method for emitting events (currently unused but available for future use)
  // private _emit(event: string, ...args: any[]): void {
  //   const listeners = this.eventListeners.get(event);
  //   if (listeners) {
  //     listeners.forEach(listener => {
  //       try {
  //         listener(...args);
  //       } catch (error) {
  //         console.error(`Error in ${event} event listener:`, error);
  //       }
  //     });
  //   }
  // }

  // Standard wallet adapter signing methods
  async signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }> {
    // Check if we have a valid session for signing
    if (!this.session.sessionToken) {
      throw new Error("No valid session found. Please call connect() first.");
    }

    debug.info(DebugCategory.BROWSER_SDK, "Opening Phantom for message signing", {
      hasSession: !!this.session.sessionToken,
      hasPublicKey: !!this.session.publicKey,
    });

    const requestId = this.communicator.generateRequestId();
    
    // Convert message to Uint8Array if needed and then to base58
    const messageBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const messageBase58 = bs58.encode(messageBytes);
    
    // Prepare request data according to Phantom documentation
    const requestData: SignMessagePayload = {
      message: messageBase58,
      display: "utf8",
    };

    // Build deeplink URL
    const url = await this.buildEncryptedDeeplinkUrl("signMessage", requestId, requestData);
    
    debug.info(DebugCategory.BROWSER_SDK, "Opening Phantom deeplink for signing", {
      requestId: requestId.substring(0, 10) + "...",
      urlLength: url.length
    });
    
    // Navigate to deeplink (fire-and-forget)
    window.location.href = url;
    
    // Return a placeholder result - the app should use utility functions to check for success
    throw new Error("Sign message opened in Phantom. Use deeplinks utility functions to check for success when user returns.");
  }

  async signTransaction<T>(transaction: T): Promise<T> {
    const requestId = this.communicator.generateRequestId();
    
    // Serialize transaction (assuming it's a Solana transaction)
    const serialized = this.serializeTransaction(transaction as any);
    
    const requestData: SignTransactionPayload = {
      transaction: Array.from(serialized),
    };

    // Build deeplink URL
    const url = await this.buildEncryptedDeeplinkUrl("signTransaction", requestId, requestData);
    
    // Navigate to deeplink
    window.location.href = url;
    
    // Wait for response (response currently not used for transaction deserialization)
    await this.communicator.waitForResponse<{
      transaction: number[];
      publicKey: string;
    }>(requestId);

    // For now, return the original transaction
    // In a real implementation, you'd deserialize the signed transaction
    return transaction;
  }

  async signAllTransactions<T>(transactions: T[]): Promise<T[]> {
    const requestId = this.communicator.generateRequestId();
    
    // Serialize all transactions
    const serializedTransactions = transactions.map(tx => Array.from(this.serializeTransaction(tx as any)));
    
    const requestData: SignAllTransactionsPayload = {
      transactions: serializedTransactions,
    };

    // Build deeplink URL
    const url = await this.buildEncryptedDeeplinkUrl("signTransaction", requestId, requestData); // signAllTransactions uses signTransaction
    
    // Navigate to deeplink
    window.location.href = url;
    
    // Wait for response (response currently not used for transaction deserialization)
    await this.communicator.waitForResponse<{
      transactions: number[][];
      publicKey: string;
    }>(requestId);

    // For now, return the original transactions
    // In a real implementation, you'd deserialize the signed transactions
    return transactions;
  }

  async signAndSendTransaction<T>(transaction: T): Promise<{ signature: string }> {
    const requestId = this.communicator.generateRequestId();
    
    // Serialize transaction
    const serialized = this.serializeTransaction(transaction as any);
    
    const requestData: SignAndSendTransactionPayload = {
      transaction: Array.from(serialized),
    };

    // Build deeplink URL
    const url = await this.buildEncryptedDeeplinkUrl("signAndSendTransaction", requestId, requestData);
    
    // Navigate to deeplink
    window.location.href = url;
    
    // Wait for response
    const response = await this.communicator.waitForResponse<{
      signature: string;
    }>(requestId);

    return {
      signature: response.signature,
    };
  }

  /**
   * Build encrypted deeplink URL for wallet operations with proper typing
   */
  private async buildEncryptedDeeplinkUrl(
    method: 'signMessage',
    requestId: string,
    data: SignMessagePayload
  ): Promise<string>;
  private async buildEncryptedDeeplinkUrl(
    method: 'signTransaction',
    requestId: string,
    data: SignTransactionPayload | SignAllTransactionsPayload
  ): Promise<string>;
  private async buildEncryptedDeeplinkUrl(
    method: 'signAndSendTransaction',
    requestId: string,
    data: SignAndSendTransactionPayload
  ): Promise<string>;
  private async buildEncryptedDeeplinkUrl(
    method: 'signMessage' | 'signTransaction' | 'signAndSendTransaction',
    requestId: string,
    data: SignMessagePayload | SignTransactionPayload | SignAllTransactionsPayload | SignAndSendTransactionPayload
  ): Promise<string> {
    // Get Phantom's encryption key from stored session data
    const { loadSession } = await import("../session");
    const storedSession = loadSession();
    const phantomEncryptionKey = storedSession?.phantomEncryptionPublicKey;
    
    if (!phantomEncryptionKey) {
      throw new Error("No Phantom encryption key available - must connect first");
    }
    
    // Prepare payload with session token
    const payload = {
      ...data,
      session: this.session.sessionToken,
      request_id: requestId
    };
    
    debug.info(DebugCategory.BROWSER_SDK, "Preparing encrypted payload", {
      method,
      hasSession: !!this.session.sessionToken,
      requestId: requestId.substring(0, 10) + "...",
      payloadKeys: Object.keys(payload)
    });
    
    // Encrypt the payload
    const encryptedPayload: EncryptedPayload = await this.secureCrypto.encryptPayload(payload, phantomEncryptionKey);
    
    debug.info(DebugCategory.BROWSER_SDK, "Encrypted payload details", {
      method,
      hasEncryptedData: !!encryptedPayload.data,
      hasNonce: !!encryptedPayload.nonce,
      encryptedDataLength: encryptedPayload.data.length,
      nonceLength: encryptedPayload.nonce.length
    });
    
    const redirectLink = buildRedirectLink("#phantom_response");
    
    // Get our encryption public key for the deeplink
    const ourPublicKey = this.secureCrypto.getPublicKeyBase58();
    if (!ourPublicKey) {
      throw new Error("SecureCrypto not initialized");
    }

    debug.info(DebugCategory.BROWSER_SDK, "Deeplink parameters", {
      method,
      ourPublicKey: ourPublicKey.substring(0, 10) + "...",
      redirectLink,
      encryptedData: encryptedPayload.data.substring(0, 50) + "...",
      nonce: encryptedPayload.nonce.substring(0, 20) + "..."
    });

    // Generate the appropriate deeplink based on method
    switch (method) {
      case 'signMessage':
        return generateSignMessageDeeplink({ 
          dappEncryptionPublicKey: ourPublicKey,
          data: encryptedPayload, 
          redirectLink 
        });
      case 'signTransaction':
        return generateSignTransactionDeeplink({ data: encryptedPayload, redirectLink });
      case 'signAndSendTransaction':
        return generateSignAndSendTransactionDeeplink({ data: encryptedPayload, redirectLink });
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  /**
   * Serialize transaction for deeplink transmission
   */
  private serializeTransaction(transaction: any): Uint8Array {
    if (transaction && typeof transaction === "object") {
      if ("serialize" in transaction && typeof transaction.serialize === "function") {
        // VersionedTransaction or similar
        return transaction.serialize();
      } else if ("serializeMessage" in transaction && typeof transaction.serializeMessage === "function") {
        // Legacy Transaction
        return transaction.serializeMessage();
      }
    }
    
    throw new Error("Unable to serialize transaction: unsupported transaction type");
  }
}