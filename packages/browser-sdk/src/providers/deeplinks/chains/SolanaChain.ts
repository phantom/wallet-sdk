import type { ISolanaChain } from "@phantom/chains";
import type { DeeplinksSession } from "../session";
import type { DeeplinksCommunicator } from "../communication";
import { encryptPayload, publicKeyToBase58 } from "../crypto";

export class DeeplinksSolanaChain implements ISolanaChain {
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(
    private session: DeeplinksSession,
    private communicator: DeeplinksCommunicator,
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
    const requestId = this.communicator.generateRequestId();
    
    // Convert message to Uint8Array if needed
    const messageBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    
    // Prepare request data
    const requestData = {
      message: Array.from(messageBytes),
    };

    // Build deeplink URL
    const url = this.buildDeeplinkUrl("signMessage", requestId, requestData);
    
    // Navigate to deeplink
    window.location.href = url;
    
    // Wait for response
    const response = await this.communicator.waitForResponse<{
      signature: number[];
      publicKey: string;
    }>(requestId);

    return {
      signature: new Uint8Array(response.signature),
      publicKey: response.publicKey,
    };
  }

  async signTransaction<T>(transaction: T): Promise<T> {
    const requestId = this.communicator.generateRequestId();
    
    // Serialize transaction (assuming it's a Solana transaction)
    const serialized = this.serializeTransaction(transaction as any);
    
    const requestData = {
      transaction: Array.from(serialized),
    };

    // Build deeplink URL
    const url = this.buildDeeplinkUrl("signTransaction", requestId, requestData);
    
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
    
    const requestData = {
      transactions: serializedTransactions,
    };

    // Build deeplink URL
    const url = this.buildDeeplinkUrl("signAllTransactions", requestId, requestData);
    
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
    
    const requestData = {
      transaction: Array.from(serialized),
    };

    // Build deeplink URL
    const url = this.buildDeeplinkUrl("signAndSendTransaction", requestId, requestData);
    
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
   * Build deeplink URL for Phantom
   */
  private buildDeeplinkUrl(method: string, requestId: string, data: any): string {
    const baseUrl = `https://phantom.app/ul/v1/${method}`;
    const url = new URL(baseUrl);
    
    // Add required parameters
    url.searchParams.set("dapp_encryption_public_key", publicKeyToBase58(this.session.keyPair.publicKey));
    url.searchParams.set("redirect_link", `${window.location.origin}${window.location.pathname}#phantom_response`);
    url.searchParams.set("app_url", window.location.origin);
    
    // Add request ID for tracking
    url.searchParams.set("request_id", requestId);
    
    // Encrypt and add data if we have a session
    if (this.session.sessionToken && this.session.sharedSecret) {
      const payload = {
        ...data,
        session: this.session.sessionToken,
      };
      
      const encrypted = encryptPayload(payload, this.session.sharedSecret);
      url.searchParams.set("data", encrypted.data);
      url.searchParams.set("nonce", encrypted.nonce);
    } else {
      // For connect requests, send data in plain text
      Object.entries(data).forEach(([key, value]) => {
        url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
      });
    }
    
    return url.toString();
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