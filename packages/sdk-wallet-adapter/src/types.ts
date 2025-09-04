/**
 * Configuration options for the PhantomSDKWalletAdapter
 */
export interface PhantomSDKWalletAdapterConfig {
  /**
   * The app ID from phantom.com/portal
   * Required for embedded provider initialization
   */
  appId: string;

  /**
   * The type of embedded wallet to use
   * @default 'app-wallet'
   */
  embeddedWalletType?: "app-wallet" | "user-wallet";

  /**
   * The API base URL for the embedded provider
   * @default 'https://api.phantom.com'
   */
  apiBaseUrl?: string;

  /**
   * Network to use
   * @default 'mainnet-beta'
   * TODO: Add support for network switching in the adapter
   */
  network?: "mainnet-beta" | "devnet" | "testnet";
}
