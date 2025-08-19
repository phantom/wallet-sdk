import {
  PhantomClient,
  type SignMessageParams,
  type SignAndSendTransactionParams,
  type NetworkId,
  type CreateWalletResult,
  type GetWalletsResult,
  type AddressType,
  type Organization,
} from "@phantom/client";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import { base64urlEncode } from "@phantom/base64url";
import bs58 from "bs58";
import {
  parseMessage,
  parseTransaction,
  parseSignMessageResponse,
  parseTransactionResponse,
  type ParsedSignatureResult,
  type ParsedTransactionResult,
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
    return await parseTransactionResponse(rawResponse.rawTransaction, params.networkId, rawResponse.hash);
  }

  createOrganization(name: string, keyPair: { publicKey: string; secretKey: string }): Promise<Organization> {
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

    // Call the createOrganization method with the provided parameters using new signature
    // Convert base58 public key to base64url format as required by the API
    const base64urlPublicKey = base64urlEncode(bs58.decode(keyPair.publicKey));

    return tempClient.createOrganization(name, [
      {
        username: `user-${Date.now()}`,
        role: "ADMIN",
        authenticators: [
          {
            authenticatorName: `auth-${Date.now()}`,
            authenticatorKind: "keypair",
            publicKey: base64urlPublicKey,
            algorithm: "Ed25519",
          },
        ],
      },
    ]);
  }
  getWallets(limit?: number, offset?: number): Promise<GetWalletsResult> {
    return this.client.getWallets(limit, offset);
  }

  createWallet(name: string): Promise<CreateWalletResult> {
    return this.client.createWallet(name);
  }

  getWalletAddresses(
    walletId: string,
    derivationPaths?: string[],
  ): Promise<{ addressType: AddressType; address: string }[]> {
    return this.client.getWalletAddresses(walletId, derivationPaths);
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
  type ParsedTransactionResult,
} from "@phantom/parsers";
export * from "./types";
