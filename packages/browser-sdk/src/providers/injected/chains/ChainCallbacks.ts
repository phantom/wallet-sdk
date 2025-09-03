import type { WalletAddress } from "../../../types";

/**
 * Callback interface to avoid circular dependencies between SDK and chains.
 * This allows chains to interact with SDK functionality without holding SDK references.
 */
export interface ChainCallbacks {
  /**
   * Connect to the wallet and return all addresses
   */
  connect(): Promise<WalletAddress[]>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;

  /**
   * Check if the provider is connected
   */
  isConnected(): boolean;

  /**
   * Get current addresses from the provider
   */
  getAddresses(): WalletAddress[];

  /**
   * Subscribe to provider events
   */
  on(event: string, callback: (data: any) => void): void;

  /**
   * Unsubscribe from provider events
   */
  off(event: string, callback: (data: any) => void): void;
}
