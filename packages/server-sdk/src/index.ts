import {
  PhantomClient,
  type SignMessageParams,
  type SignTransactionParams,
  type SignAndSendTransactionParams,
  type NetworkId,
  type CreateWalletResult,
  type GetWalletsResult,
  type AddressType,
  type Organization,
} from "@phantom/client";
import { 
  ANALYTICS_HEADERS,
  type ServerSdkHeaders 
} from "@phantom/constants";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import { base64urlEncode } from "@phantom/base64url";
import bs58 from "bs58";
import packageJson from "../package.json";
import {
  parseMessage,
  parseTransactionToBase64Url,
  parseSignMessageResponse,
  parseTransactionResponse,
  type ParsedSignatureResult,
  type ParsedTransactionResult,
} from "@phantom/parsers";

export interface ServerSDKConfig {
  organizationId: string;
  appId: string;
  apiBaseUrl: string;
  apiPrivateKey: string;
}

export interface ServerSignMessageParams {
  walletId: string;
  message: string; // Plain text - automatically converted to base64url
  networkId: NetworkId;
  derivationIndex?: number; // Optional account derivation index (defaults to 0)
}

export interface ServerSignTransactionParams {
  walletId: string;
  transaction: any; // Various transaction formats - automatically parsed
  networkId: NetworkId;
  derivationIndex?: number; // Optional account derivation index (defaults to 0)
}

export interface ServerSignAndSendTransactionParams {
  walletId: string;
  transaction: any; // Various transaction formats - automatically parsed
  networkId: NetworkId;
  derivationIndex?: number; // Optional account derivation index (defaults to 0)
}

/**
 * Get current Node.js version
 */
function getNodeVersion(): string {
  if (typeof process !== "undefined" && process.version) {
    return process.version;
  }
  return "unknown";
}

/**
 * Get SDK version from package.json
 */
function getSdkVersion(): string {
  return packageJson.version || "unknown";
}

/**
 * Helper function to create server SDK analytics headers
 */
function createServerSdkHeaders(appId: string): ServerSdkHeaders {
  return {
    [ANALYTICS_HEADERS.SDK_TYPE]: "server",
    [ANALYTICS_HEADERS.SDK_VERSION]: getSdkVersion(),
    [ANALYTICS_HEADERS.PLATFORM]: `node`,
    [ANALYTICS_HEADERS.PLATFORM_VERSION]: `${getNodeVersion()}`,
    [ANALYTICS_HEADERS.APP_ID]: appId,
  };
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

    // Create analytics headers
    const headers = createServerSdkHeaders(config.appId);

    // Initialize the parent PhantomClient with the stamper and analytics headers
    this.client = new PhantomClient(
      {
        apiBaseUrl: config.apiBaseUrl,
        organizationId: config.organizationId,
        headers,
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
      derivationIndex: params.derivationIndex,
    };

    // Get raw response from client
    const rawResponse = await this.client.signMessage(signMessageParams);

    // Parse the response to get human-readable signature and explorer URL
    return parseSignMessageResponse(rawResponse, params.networkId);
  }

  /**
   * Sign a transaction - supports various transaction formats and automatically parses them
   * @param params - Transaction parameters with flexible transaction format
   * @returns Promise<ParsedTransactionResult> - Parsed transaction result without hash
   */
  async signTransaction(params: ServerSignTransactionParams): Promise<ParsedTransactionResult> {
    // Parse the transaction to base64url format
    const parsedTransaction = await parseTransactionToBase64Url(params.transaction, params.networkId);

    // Use the parent's signTransaction method with parsed transaction
    const signTransactionParams: SignTransactionParams = {
      walletId: params.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
      derivationIndex: params.derivationIndex,
    };

    // Get raw response from client
    const rawResponse = await this.client.signTransaction(signTransactionParams);

    // Parse the response to get transaction result (without hash)
    return await parseTransactionResponse(rawResponse.rawTransaction, params.networkId);
  }

  /**
   * Sign and send a transaction - supports various transaction formats and automatically parses them
   * @param params - Transaction parameters with flexible transaction format
   * @returns Promise<ParsedTransactionResult> - Parsed transaction result with hash and explorer URL
   */
  async signAndSendTransaction(params: ServerSignAndSendTransactionParams): Promise<ParsedTransactionResult> {
    // Parse the transaction to base64url format
    const parsedTransaction = await parseTransactionToBase64Url(params.transaction, params.networkId);

    // Use the parent's signAndSendTransaction method with parsed transaction
    const signAndSendParams: SignAndSendTransactionParams = {
      walletId: params.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
      derivationIndex: params.derivationIndex,
    };
    // Get raw response from client
    const rawResponse = await this.client.signAndSendTransaction(signAndSendParams);

    // Parse the response to get transaction hash and explorer URL
    return await parseTransactionResponse(rawResponse.rawTransaction, params.networkId, rawResponse.hash);
  }

  createOrganization(name: string, keyPair: { publicKey: string; secretKey: string }): Promise<Organization> {
    // Create analytics headers for the temporary client
    const headers = createServerSdkHeaders(this.config.appId);
    
    // Create a temporary PhantomClient instance with the stamper and analytics headers
    const tempClient = new PhantomClient(
      {
        apiBaseUrl: this.config.apiBaseUrl,
        organizationId: this.config.organizationId,
        headers,
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
    derivationIndex?: number,
  ): Promise<{ addressType: AddressType; address: string }[]> {
    return this.client.getWalletAddresses(walletId, derivationPaths, derivationIndex);
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
  type SignedTransactionResult,
  type GetWalletsResult,
  type Wallet,
  generateKeyPair,
} from "@phantom/client";

// Re-export NetworkId from constants
export { NetworkId } from "@phantom/constants";

export { ApiKeyStamper } from "@phantom/api-key-stamper";
export {
  parseMessage,
  parseTransactionToBase64Url,
  parseSignMessageResponse,
  parseTransactionResponse,
  type ParsedMessage,
  type ParsedTransaction,
  type ParsedSignatureResult,
  type ParsedTransactionResult,
} from "@phantom/parsers";
export * from "./types";
