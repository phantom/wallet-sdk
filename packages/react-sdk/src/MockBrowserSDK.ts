import type { BrowserSDKConfig, ConnectResult, WalletAddress, AuthOptions, DebugLevel, DebugCallback } from "@phantom/browser-sdk";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";
import type { NetworkId } from "@phantom/constants";

// Mock interfaces for types not available in the package
interface ProviderPreference {
  type: "injected" | "embedded";
  walletType?: "app-wallet" | "user-wallet";
}

type EmbeddedProviderEvent = "connect" | "connect_start" | "connect_error" | "disconnect" | "error";

interface EventCallback {
  (data?: any): void;
}

interface AutoConfirmEnableParams {
  chains?: NetworkId[];
}

interface AutoConfirmResult {
  enabled: boolean;
  chains: NetworkId[];
}

interface AutoConfirmSupportedChainsResult {
  chains: NetworkId[];
}

/**
 * Mock BrowserSDK for server-side rendering
 * Provides the same interface as BrowserSDK but throws errors for operations that require browser APIs
 */
export class MockBrowserSDK {
  constructor(_config: BrowserSDKConfig) {
    // Store config but don't initialize anything that requires browser APIs
  }

  // Chain API - throw errors since these require actual wallet connection
  get solana(): ISolanaChain {
    throw new Error("Solana operations are not available during server-side rendering");
  }

  get ethereum(): IEthereumChain {
    throw new Error("Ethereum operations are not available during server-side rendering");
  }

  // Connection Management - throw errors for actual connection operations
  async connect(_options?: AuthOptions): Promise<ConnectResult> {
    throw new Error("Connection is not available during server-side rendering");
  }

  async disconnect(): Promise<void> {
    throw new Error("Disconnect is not available during server-side rendering");
  }

  async switchProvider(_type: "injected" | "embedded", _options?: any): Promise<void> {
    throw new Error("Provider switching is not available during server-side rendering");
  }

  // State Queries - return safe defaults
  isConnected(): boolean {
    return false;
  }

  getAddresses(): WalletAddress[] {
    return [];
  }

  getCurrentProviderInfo(): ProviderPreference | null {
    return null;
  }

  getWalletId(): string | null {
    return null;
  }

  // Utility Methods
  static async isPhantomInstalled(_timeoutMs?: number): Promise<boolean> {
    return false; // Always false during SSR
  }

  // Event Management - no-op implementations
  on(_event: EmbeddedProviderEvent, _callback: EventCallback): void {
    // No-op during SSR
  }

  off(_event: EmbeddedProviderEvent, _callback: EventCallback): void {
    // No-op during SSR
  }

  async autoConnect(): Promise<void> {
    // No-op during SSR - don't throw since this is often called optimistically
  }

  // Debug Methods - no-op implementations
  enableDebug(): void {
    // No-op during SSR
  }

  disableDebug(): void {
    // No-op during SSR
  }

  setDebugLevel(_level: DebugLevel): void {
    // No-op during SSR
  }

  setDebugCallback(_callback: DebugCallback): void {
    // No-op during SSR
  }

  configureDebug(_config: { enabled?: boolean; level?: DebugLevel; callback?: DebugCallback }): void {
    // No-op during SSR
  }

  // Auto-confirm Methods - throw errors since these require actual connection
  async enableAutoConfirm(_params: AutoConfirmEnableParams): Promise<AutoConfirmResult> {
    throw new Error("Auto-confirm is not available during server-side rendering");
  }

  async disableAutoConfirm(): Promise<void> {
    throw new Error("Auto-confirm is not available during server-side rendering");
  }

  async getAutoConfirmStatus(): Promise<AutoConfirmResult> {
    throw new Error("Auto-confirm status is not available during server-side rendering");
  }

  async getSupportedAutoConfirmChains(): Promise<AutoConfirmSupportedChainsResult> {
    throw new Error("Auto-confirm chains are not available during server-side rendering");
  }
}