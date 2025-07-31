import { PhantomClient } from "@phantom/client";
import { ApiKeyStamper } from "@phantom/api-key-stamper";

export interface ServerSDKConfig {
  organizationId: string;
  apiBaseUrl: string;
  apiPrivateKey: string;
}

export class ServerSDK extends PhantomClient {
  constructor(config: ServerSDKConfig) {
    // Create the API key stamper
    const stamper = new ApiKeyStamper({
      apiSecretKey: config.apiPrivateKey,
    });

    // Initialize the parent PhantomClient with the stamper
    super(
      {
        apiBaseUrl: config.apiBaseUrl,
        organizationId: config.organizationId,
      },
      stamper,
    );
  }
}

// Re-export specific items from client for backward compatibility
export {
  PhantomClient,
  NetworkId,
  deriveSubmissionConfig,
  supportsTransactionSubmission,
  getNetworkDescription,
  getSupportedNetworkIds,
  getNetworkIdsByChain,
  DerivationPath,
  getDerivationPathForNetwork,
  getNetworkConfig,
  type NetworkConfig,
  type CreateWalletResult,
  type Transaction,
  type SignedTransaction,
  type GetWalletsResult,
  type Wallet,
  type SignMessageParams,
  type SignAndSendTransactionParams,
  generateKeyPair,
} from "@phantom/client";

export { ApiKeyStamper } from "@phantom/api-key-stamper";
export * from "./types";
