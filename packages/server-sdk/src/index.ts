import {
  PhantomClient,
  type SignMessageParams,
  type SignAndSendTransactionParams,
  type NetworkId,
} from "@phantom/client";
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

    return super.signMessage(signMessageParams);
  }

  /**
   * Sign and send a transaction - supports various transaction formats and automatically parses them
   * @param params - Transaction parameters with flexible transaction format
   * @returns Promise<SignedTransaction> - Signed transaction result
   */
  async signAndSendTransaction(params: ServerSignAndSendTransactionParams): Promise<any> {
    // Parse the transaction to base64url format
    const parsedTransaction = await parseTransaction(params.transaction, params.networkId);

    // Use the parent's signAndSendTransaction method with parsed transaction
    const signAndSendParams: SignAndSendTransactionParams = {
      walletId: params.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
    };

    return super.signAndSendTransaction(signAndSendParams);
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
