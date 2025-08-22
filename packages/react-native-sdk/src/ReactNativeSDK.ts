import { EmbeddedProvider } from "@phantom/embedded-provider-core";
import type { PlatformAdapter, DebugLogger } from "@phantom/embedded-provider-core";
import type { PhantomSDKConfig, WalletAddress, ConnectResult } from "./types";
import type { ISolanaChain, IEthereumChain } from '@phantom/chains';

// Platform adapters for React Native/Expo
import { ExpoSecureStorage } from "./providers/embedded/storage";
import { ExpoAuthProvider } from "./providers/embedded/auth";
import { ExpoURLParamsAccessor } from "./providers/embedded/url-params";
import { ReactNativeStamper } from "./providers/embedded/stamper";
import { Platform } from "react-native";

/**
 * React Native SDK with chain-specific API
 * 
 * Usage:
 * ```typescript
 * const sdk = new ReactNativeSDK({
 *   scheme: 'myapp',
 *   organizationId: 'your-org-id'
 * });
 * await sdk.connect();
 * 
 * // Chain-specific operations
 * await sdk.solana.signMessage(message);
 * await sdk.ethereum.signPersonalMessage(message, address);
 * ```
 */
export class ReactNativeSDK {
  private provider: EmbeddedProvider;

  constructor(config: PhantomSDKConfig) {
    
    // Build redirect URL if not provided
    const redirectUrl = config.authOptions?.redirectUrl || `${config.scheme}://phantom-auth-callback`;

    // Convert React Native config to embedded provider config
    const embeddedConfig = {
      apiBaseUrl: config.apiBaseUrl,
      organizationId: config.organizationId,
      authOptions: {
        ...config.authOptions,
        redirectUrl,
      },
      embeddedWalletType: config.embeddedWalletType,
      addressTypes: config.addressTypes,
      solanaProvider: config.solanaProvider || "web3js",
      appName: config.appName,
      appLogo: config.appLogo,
      debug: config.debug,
    };

    // Create platform adapters
    const platformAdapter: PlatformAdapter = {
      name: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown",
      storage: new ExpoSecureStorage(),
      authProvider: new ExpoAuthProvider(),
      urlParamsAccessor: new ExpoURLParamsAccessor(),
      stamper: new ReactNativeStamper(),
    };

    // Create debug logger
    const debugLogger: DebugLogger = {
      info: (category, message, data) => config.debug ? console.info(`[${category}] ${message}`, data) : undefined,
      warn: (category, message, data) => config.debug ? console.warn(`[${category}] ${message}`, data) : undefined,
      error: (category, message, data) => config.debug ? console.error(`[${category}] ${message}`, data) : undefined,
      log: (category, message, data) => config.debug ? console.log(`[${category}] ${message}`, data) : undefined,
    };

    // Create SDK with platform adapters
    this.provider = new EmbeddedProvider(embeddedConfig, platformAdapter, debugLogger);
  }

  // ===== CHAIN API =====
  
  /**
   * Access Solana chain operations
   */
  get solana(): ISolanaChain {
    return this.provider.solana;
  }
  
  /**
   * Access Ethereum chain operations
   */
  get ethereum(): IEthereumChain {
    return this.provider.ethereum;
  }

  // ===== CONNECTION MANAGEMENT =====

  /**
   * Connect to the wallet
   */
  async connect(): Promise<ConnectResult> {
    const result = await this.provider.connect();
    return result;
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    await this.provider.disconnect();
  }

  // ===== STATE QUERIES =====

  /**
   * Check if the SDK is connected to a wallet
   */
  isConnected(): boolean {
    return this.provider.isConnected();
  }

  /**
   * Get all connected wallet addresses
   */
  getAddresses(): WalletAddress[] {
    return this.provider.getAddresses();
  }

  /**
   * Get the wallet ID (for embedded wallets)
   */
  getWalletId(): string | null {
    // The EmbeddedProvider might not have getWalletId method
    return (this.provider as any).getWalletId?.() || null;
  }

  // ===== PRIVATE METHODS =====

  // ===== INTERNAL (for hooks) =====
  
  /**
   * @internal - Used by React hooks, not for direct usage
   */
  getProvider(): EmbeddedProvider {
    return this.provider;
  }
}