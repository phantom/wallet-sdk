import {
  PhantomClient,
  type SignMessageParams,
  type SignAndSendTransactionParams,
  type SignedTransaction,
  type NetworkId,
  type CreateWalletResult,
  type GetWalletsResult,
  type AddressType,
} from "@phantom/client";
import type { ExternalKmsOrganization } from "@phantom/openapi-wallet-service";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import { parseMessage, parseTransaction } from "@phantom/parsers";

export interface ServerSDKConfig {
  organizationId: string;
  apiBaseUrl: string;
  apiPrivateKey: string;
}

export interface ServerSignMessageParams {
  walletId: string;
  message: string; // Plain text - automatically converted to base64url
  networkId: NetworkId;
}

export interface ServerSignAndSendTransactionParams {
  walletId: string;
  transaction: any; // Various transaction formats - automatically parsed
  networkId: NetworkId;
}

export class ServerSDK  {
  private config: ServerSDKConfig;
  client: PhantomClient;
  
  constructor(config: ServerSDKConfig) {
    this.config = config;
    // Create the API key stamper
    const stamper = new ApiKeyStamper({
      apiSecretKey: config.apiPrivateKey,
    });

    // Initialize the parent PhantomClient with the stamper
    this.client = new PhantomClient(
      {
        apiBaseUrl: config.apiBaseUrl,
        organizationId: config.organizationId,
      },
      stamper,
    );
  }

  /**
   * Sign a message - supports plain text and automatically converts to base64url
   * @param params - Message parameters with plain text message
   * @returns Promise<string> - Base64 encoded signature
   */
  signMessage(params: ServerSignMessageParams): Promise<string> {
    // Parse the message to base64url format
    const parsedMessage = parseMessage(params.message);

    // Use the parent's signMessage method with parsed message
    const signMessageParams: SignMessageParams = {
      walletId: params.walletId,
      message: parsedMessage.base64url,
      networkId: params.networkId,
    };

    return this.client.signMessage(signMessageParams);
  }

  /**
   * Sign and send a transaction - supports various transaction formats and automatically parses them
   * @param params - Transaction parameters with flexible transaction format
   * @returns Promise<SignedTransaction> - Signed transaction result
   */
  async signAndSendTransaction(params: ServerSignAndSendTransactionParams): Promise<SignedTransaction> {
    // Parse the transaction to base64url format
    const parsedTransaction = await parseTransaction(params.transaction, params.networkId);

    // Use the parent's signAndSendTransaction method with parsed transaction
    const signAndSendParams: SignAndSendTransactionParams = {
      walletId: params.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
    };

    return this.client.signAndSendTransaction(signAndSendParams);
  }

  createOrganization(
    name: string,
    keyPair: { publicKey: string; secretKey: string },
    authenticatorName?: string,
  ): Promise<ExternalKmsOrganization> {
    // Create a temporary PhantomClient instance with the stamper
    const tempClient = new PhantomClient(
      {
        apiBaseUrl: this.config.apiBaseUrl,
        organizationId: this.config.organizationId,
      },
      new ApiKeyStamper({
        apiSecretKey: keyPair.secretKey,
      }),
    );

    // Call the createOrganization method with the provided parameters
    return tempClient.createOrganization(name, keyPair.publicKey, authenticatorName);
  }
  getWallets(limit?: number, offset?: number): Promise<GetWalletsResult> {
    return this.client.getWallets(limit, offset);
  }
  
  createWallet(name: string): Promise<CreateWalletResult> {
    return this.client.createWallet(name);
  }
  
  getWalletAddresses(walletId: string, derivationPaths?: string[]): Promise<{ addressType: AddressType; address: string }[]> {
    return this.client.getWalletAddresses(walletId, derivationPaths);
  }
}

// Re-export specific items from client
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
  generateKeyPair,
} from "@phantom/client";

export { ApiKeyStamper } from "@phantom/api-key-stamper";
export { parseMessage, parseTransaction, type ParsedMessage, type ParsedTransaction } from "@phantom/parsers";
export * from "./types";
