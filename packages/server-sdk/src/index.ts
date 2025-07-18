import { ServerSDKConfig, CreateWalletResult, Transaction, SignedTransaction, GetWalletsResult, Wallet } from "./types";
import { createAuthenticatedAxiosInstance } from "./auth";
import { DerivationPath, getNetworkConfig } from "./constants";
import { deriveSubmissionConfig, NetworkId } from "./caip2-mappings";
import bs58 from "bs58";
import {
  Configuration,
  KMSRPCApi,
  CreateWalletMethodEnum,
  SignTransactionMethodEnum,
  SignRawPayloadMethodEnum,
  type CreateWallet,
  type SignTransaction,
  type SignRawPayload,
  type CreateWalletRequest,
  type SignTransactionRequest,
  type SignRawPayloadRequest,
  type DerivationInfo,
  type ExternalKmsWallet,
  type SignedTransactionWithPublicKey,
  type SignatureWithPublicKey,
  GetAccounts,
  GetAccountsMethodEnum,
  ExternalDerivedAccount,
} from "@phantom/openapi-wallet-service";
import nacl from "tweetnacl";

// TODO(napas): Auto generate this from the OpenAPI spec
export interface SubmissionConfig {
  chain: string; // e.g., 'solana', 'ethereum', 'polygon'
  network: string; // e.g., 'mainnet', 'devnet', 'sepolia'
}

// Export CAIP-2 utilities and enums
export {
  NetworkId,
  deriveSubmissionConfig,
  supportsTransactionSubmission,
  getNetworkDescription,
  getSupportedNetworkIds,
  getNetworkIdsByChain
} from "./caip2-mappings";

export class ServerSDK {
  private config: ServerSDKConfig;
  private kmsApi: KMSRPCApi;
  private signingKeypair: nacl.SignKeyPair;

  constructor(config: ServerSDKConfig) {
    this.config = config;

    if (!config.organizationId || !config.apiBaseUrl) {
      throw new Error("organizationId and apiBaseUrl are required");
    }

    // Decode the private key from base58
    const privateKeyBytes = bs58.decode(config.apiPrivateKey);
    this.signingKeypair = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);

    // Create authenticated axios instance
    const authenticatedAxios = createAuthenticatedAxiosInstance(this.signingKeypair);

    // Configure the KMS API client with authentication
    const configuration = new Configuration({
      basePath: config.apiBaseUrl,
    });

    // Pass the authenticated axios instance to the KMS API
    this.kmsApi = new KMSRPCApi(configuration, config.apiBaseUrl, authenticatedAxios);
  }

  async createWallet(walletName?: string): Promise<CreateWalletResult> {
    try {
      // Create wallet request
      const walletRequest: CreateWalletRequest = {
        organizationId: this.config.organizationId,
        walletName: walletName || `Wallet ${Date.now()}`,
        accounts: [DerivationPath.Solana, DerivationPath.Ethereum, DerivationPath.Bitcoin, DerivationPath.Sui] as any,
      };

      console.log("Creating wallet with request:", walletRequest);

      const request: CreateWallet = {
        method: CreateWalletMethodEnum.createWallet,
        params: walletRequest,
        timestampMs: Date.now(),
      } as any;

      const response = await this.kmsApi.postKmsRpc(request);
      const walletResult = response.data.result as ExternalKmsWallet;

      console.log("Wallet created successfully:", walletResult);

      // Fetch the accounts
      const requestAccounts: GetAccounts = {
        method: GetAccountsMethodEnum.getAccounts,
        params: {
          accounts: [DerivationPath.Solana, DerivationPath.Ethereum, DerivationPath.Bitcoin, DerivationPath.Sui],
          organizationId: this.config.organizationId,
          walletId: walletResult.walletId,
        },
        timestampMs: Date.now(),
      } as any;

      console.log("Fetching accounts for wallet:", walletResult.walletId);

      const accountsResponse = await this.kmsApi.postKmsRpc(requestAccounts);

      console.log("Accounts fetched successfully:", accountsResponse.data.result);
      const accountsResult = accountsResponse.data.result as (ExternalDerivedAccount & { publicKey: string })[];

      return {
        walletId: walletResult.walletId,
        addresses: accountsResult.map(account => ({
          addressType: account.addressFormat,
          address: account.publicKey,
        })),
      };
    } catch (error: any) {
      console.error("Failed to create wallet:", error.response?.data || error.message);
      throw new Error(`Failed to create wallet: ${error.response?.data?.message || error.message}`);
    }
  }

  async signAndSendTransaction(
    walletId: string,
    transaction: Transaction,
    networkId: NetworkId
  ): Promise<SignedTransaction> {
    try {
      // Encode the Uint8Array as a base64 string
      const encodedTransaction = Buffer.from(transaction).toString('base64url');

      const submissionConfig = deriveSubmissionConfig(networkId);

      // If we don't have a submission config, the transaction will only be signed, not submitted
      if (!submissionConfig) {
        console.warn(`No submission config available for network ${networkId}. Transaction will be signed but not submitted.`);
      }

      // Get network configuration
      const networkConfig = getNetworkConfig(networkId);

      if (!networkConfig) {
        throw new Error(`Unsupported network ID: ${networkId}`);
      }

      const derivationInfo: DerivationInfo = {
        derivationPath: networkConfig.derivationPath,
        curve: networkConfig.curve,
        addressFormat: networkConfig.addressFormat,
      };

      // Sign transaction request - only include submissionConfig if available
      const signRequest: SignTransactionRequest & { submissionConfig?: SubmissionConfig } = {
        organizationId: this.config.organizationId,
        walletId: walletId,
        transaction: encodedTransaction as any,
        derivationInfo: derivationInfo,
      };

      // Add submission config if available
      if (submissionConfig) {
        signRequest.submissionConfig = submissionConfig;
      }

      const request: SignTransaction = {
        method: SignTransactionMethodEnum.signTransaction,
        params: signRequest,
        timestampMs: Date.now(),
      } as any;

      const response = await this.kmsApi.postKmsRpc(request);
      const result = response.data.result as SignedTransactionWithPublicKey;

      return {
        rawTransaction: result.transaction as unknown as string, // Base64 encoded signed transaction
      };
    } catch (error: any) {
      console.error("Failed to sign and send transaction:", error.response?.data || error.message);
      throw new Error(`Failed to sign and send transaction: ${error.response?.data?.message || error.message}`);
    }
  }

  async getWalletAddresses(
    walletId: string,
    derivationPaths?: string[],
  ): Promise<{ addressType: string; address: string }[]> {
    try {
      const paths = derivationPaths || [
        DerivationPath.Solana,
        DerivationPath.Ethereum,
        DerivationPath.Bitcoin,
        DerivationPath.Sui,
      ];

      const requestAccounts: GetAccounts = {
        method: GetAccountsMethodEnum.getAccounts,
        params: {
          accounts: paths,
          organizationId: this.config.organizationId,
          walletId: walletId,
        },
        timestampMs: Date.now(),
      } as any;

      const accountsResponse = await this.kmsApi.postKmsRpc(requestAccounts);
      const accountsResult = accountsResponse.data.result as (ExternalDerivedAccount & { publicKey: string })[];

      return accountsResult.map(account => ({
        addressType: account.addressFormat,
        address: account.publicKey,
      }));
    } catch (error: any) {
      console.error("Failed to get wallet addresses:", error.response?.data || error.message);
      throw new Error(`Failed to get wallet addresses: ${error.response?.data?.message || error.message}`);
    }
  }

  async signMessage(walletId: string, message: string, networkId: NetworkId): Promise<string> {
    try {

      // Get network configuration
      const networkConfig = getNetworkConfig(networkId);

      if (!networkConfig) {
        throw new Error(`Unsupported network ID: ${networkId}`);
      }

      const derivationInfo: DerivationInfo = {
        derivationPath: networkConfig.derivationPath,
        curve: networkConfig.curve,
        addressFormat: networkConfig.addressFormat,
      };

      const base64StringMessage = Buffer.from(message, "utf8").toString("base64url");

      const signRequest: SignRawPayloadRequest = {
        organizationId: this.config.organizationId,
        walletId: walletId,
        payload: base64StringMessage as any,
        algorithm: networkConfig.algorithm,
        derivationInfo: derivationInfo,
      };

      const request: SignRawPayload = {
        method: SignRawPayloadMethodEnum.signRawPayload,
        params: signRequest,
        timestampMs: Date.now(),
      } as any;


      const response = await this.kmsApi.postKmsRpc(request);
      const result = response.data.result as SignatureWithPublicKey;

      // Return the base64 encoded signature
      return result.signature;
    } catch (error: any) {
      console.error("Failed to sign message:", error.response?.data || error.message);
      throw new Error(`Failed to sign message: ${error.response?.data?.message || error.message}`);
    }
  }

  async getWallets(
    limit?: number,
    offset?: number
  ): Promise<GetWalletsResult> {
    try {
      const request = {
        method: "getOrganizationWallets",
        params: {
          organizationId: this.config.organizationId,
          limit: limit || 20,
          offset: offset || 0,
        },
        timestampMs: Date.now(),
      };

      console.log("Fetching wallets for organization:", this.config.organizationId);

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = response.data.result as {
        wallets: ExternalKmsWallet[];
        totalCount: number;
        limit: number;
        offset: number;
      };

      console.log(`Fetched ${result.wallets.length} wallets out of ${result.totalCount} total`);

      return {
        wallets: result.wallets.map((wallet) => ({
          walletId: wallet.walletId,
          walletName: wallet.walletName,
        })),
        totalCount: result.totalCount,
        limit: result.limit,
        offset: result.offset,
      };
    } catch (error: any) {
      console.error("Failed to get wallets:", error.response?.data || error.message);
      throw new Error(`Failed to get wallets: ${error.response?.data?.message || error.message}`);
    }
  }
}

export * from "./types";
