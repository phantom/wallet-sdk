import {
  PhantomClient,
  type SignMessageParams,
  type SignAndSendTransactionParams,
} from "@phantom/client";
import { type NetworkId } from "@phantom/constants";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import { 
  parseMessage, 
  parseTransaction, 
  parseSignMessageResponse, 
  parseTransactionResponse,
  type ParsedSignatureResult,
  type ParsedTransactionResult 
} from "@phantom/parsers";

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

export class ServerSDK {
  private client: PhantomClient;

  constructor(config: ServerSDKConfig) {
    // Create the API key stamper
    const stamper = new ApiKeyStamper({
      apiSecretKey: config.apiPrivateKey,
    });

    // Initialize the PhantomClient with the stamper
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
   * @returns Promise<ParsedSignatureResult> - Parsed signature with explorer URL
   */
  async signMessage(params: ServerSignMessageParams): Promise<ParsedSignatureResult> {
    // Parse the message to base64url format
    const parsedMessage = parseMessage(params.message);

    // Use the parent's signMessage method with parsed message
    const signMessageParams: SignMessageParams = {
      walletId: params.walletId,
      message: parsedMessage.base64url,
      networkId: params.networkId,
    };

    // Get raw response from client
    const rawResponse = await this.client.signMessage(signMessageParams);

    // Parse the response to get human-readable signature and explorer URL
    return parseSignMessageResponse(rawResponse, params.networkId);
  }

  /**
   * Sign and send a transaction - supports various transaction formats and automatically parses them
   * @param params - Transaction parameters with flexible transaction format
   * @returns Promise<ParsedTransactionResult> - Parsed transaction result with hash and explorer URL
   */
  async signAndSendTransaction(params: ServerSignAndSendTransactionParams): Promise<ParsedTransactionResult> {
    // Parse the transaction to base64url format
    const parsedTransaction = await parseTransaction(params.transaction, params.networkId);

    // Use the parent's signAndSendTransaction method with parsed transaction
    const signAndSendParams: SignAndSendTransactionParams = {
      walletId: params.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
    };

    // Get raw response from client
    const rawResponse = await this.client.signAndSendTransaction(signAndSendParams);

    // Parse the response to get transaction hash and explorer URL
    return await parseTransactionResponse(rawResponse.rawTransaction, params.networkId);
  }

  // Proxy methods for other PhantomClient functionality
  async createOrganization(organizationId: string, keypair: any) {
    return await this.client.createOrganization(organizationId, keypair);
  }

  async createWallet(walletType: string = "user-wallet") {
    return await this.client.createWallet(walletType);
  }

  async getWalletAddresses(walletId: string, derivationPaths?: string[]) {
    return await this.client.getWalletAddresses(walletId, derivationPaths);
  }

  async getWallets(limit?: number, offset?: number) {
    return await this.client.getWallets(limit, offset);
  }
}

// Re-export specific items from client
export {
  PhantomClient,
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

// Re-export NetworkId from constants
export { NetworkId } from "@phantom/constants";

export { ApiKeyStamper } from "@phantom/api-key-stamper";
export { 
  parseMessage, 
  parseTransaction, 
  parseSignMessageResponse,
  parseTransactionResponse,
  type ParsedMessage, 
  type ParsedTransaction,
  type ParsedSignatureResult,
  type ParsedTransactionResult 
} from "@phantom/parsers";
export * from "./types";
