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
   * Network to use
   * @default 'mainnet-beta'
   * TODO: Add support for network switching in the adapter
   */
  network?: "mainnet-beta" | "devnet" | "testnet";

  /**
   * The redirect URL for the embedded provider
   */
  redirectUrl?: string;
}
