import axios, { type AxiosInstance } from "axios";
import bs58 from "bs58";
import { base64urlEncode } from "@phantom/base64url";
import { Buffer } from "buffer";
import {
  Configuration,
  KMSRPCApi,
  CreateWalletMethodEnum,
  SignTransactionMethodEnum,
  SignRawPayloadMethodEnum,
  CreateOrganizationMethodEnum,
  CreateAuthenticatorMethodEnum,
  DeleteAuthenticatorMethodEnum,
  GrantOrganizationAccessMethodEnum,
  type CreateWallet,
  type SignTransaction,
  type SignRawPayload,
  type SignTransactionRequest,
  type SignRawPayloadRequest,
  type CreateOrganization,
  type CreateOrganizationRequest,
  type CreateAuthenticator,
  type CreateAuthenticatorRequest,
  type DeleteAuthenticator,
  type DeleteAuthenticatorRequest,
  type GrantOrganizationAccess,
  type GrantOrganizationAccessRequest,
  type DerivationInfo,
  type ExternalKmsWallet,
  type SignedTransactionWithPublicKey,
  type SignatureWithPublicKey,
  type GetAccounts,
  GetAccountsMethodEnum,
  type ExternalDerivedAccount,
  KmsUserRole,
  Algorithm,
  type ExternalKmsOrganization,
  type DerivationInfoAddressFormatEnum,
} from "@phantom/openapi-wallet-service";
import { DerivationPath, getNetworkConfig } from "./constants";
import { deriveSubmissionConfig } from "./caip2-mappings";
import {
  type PhantomClientConfig,
  type CreateWalletResult,
  type SignedTransaction,
  type GetWalletsResult,
  type SignMessageParams,
  type SignAndSendTransactionParams,
  type GetWalletWithTagParams,
  type CreateAuthenticatorParams,
  type DeleteAuthenticatorParams,
  type AuthenticatorConfig,
} from "./types";

import type { Stamper } from "@phantom/sdk-types";

// TODO(napas): Auto generate this from the OpenAPI spec
export interface SubmissionConfig {
  chain: string; // e.g., 'solana', 'ethereum', 'polygon'
  network: string; // e.g., 'mainnet', 'devnet', 'sepolia'
}

export class PhantomClient {
  private config: PhantomClientConfig;
  private kmsApi: KMSRPCApi;
  private axiosInstance: AxiosInstance;
  private stamper?: Stamper;

  constructor(config: PhantomClientConfig, stamper?: Stamper) {
    this.config = config;

    if (!config.apiBaseUrl) {
      throw new Error("apiBaseUrl is required");
    }

    // Create axios instance
    this.axiosInstance = axios.create();

    // If stamper is provided, add it as an interceptor
    if (stamper) {
      // Add stamper interceptor to axios instance
      this.axiosInstance.interceptors.request.use(async config => {
        return await this.stampRequest(config, stamper);
      });
      this.stamper = stamper;
    }

    // Configure the KMS API client
    const configuration = new Configuration({
      basePath: config.apiBaseUrl,
    });

    // Pass the axios instance to the KMS API
    this.kmsApi = new KMSRPCApi(configuration, config.apiBaseUrl, this.axiosInstance);
  }

  setOrganizationId(organizationId: string): void {
    if (!organizationId) {
      throw new Error("organizationId is required");
    }
    this.config.organizationId = organizationId;
  }

  async createWallet(walletName?: string): Promise<CreateWalletResult> {
    try {
      if (!this.config.organizationId) {
        throw new Error("organizationId is required to create a wallet");
      }
      // Create wallet request
      const walletRequest: any = {
        organizationId: this.config.organizationId,
        walletName: walletName || `Wallet ${Date.now()}`,
        accounts: [DerivationPath.Solana, DerivationPath.Ethereum, DerivationPath.Bitcoin, DerivationPath.Sui] as any,
      };

      // Creating wallet with request
      const request: CreateWallet = {
        method: CreateWalletMethodEnum.createWallet,
        params: walletRequest,
        timestampMs: Date.now(),
      } as any;

      const response = await this.kmsApi.postKmsRpc(request);
      const walletResult = response.data.result as ExternalKmsWallet;

      // Wallet created successfully

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

      // Fetching accounts for wallet

      const accountsResponse = await this.kmsApi.postKmsRpc(requestAccounts);

      // Accounts fetched successfully
      const accountsResult = accountsResponse.data.result as (ExternalDerivedAccount & { address: string })[];
      return {
        walletId: walletResult.walletId,
        addresses: accountsResult.map(account => ({
          addressType: account.addressFormat,
          address: account.address,
        })),
      };
    } catch (error: any) {
      console.error("Failed to create wallet:", error.response?.data || error.message);
      throw new Error(`Failed to create wallet: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Sign and send a transaction
   */
  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    const walletId = params.walletId;
    const transactionParam = params.transaction;
    const networkIdParam = params.networkId;

    try {
      if (!this.config.organizationId) {
        throw new Error("organizationId is required to sign and send a transaction");
      }
      // Transaction is already base64url encoded
      const encodedTransaction = transactionParam;

      const submissionConfig = deriveSubmissionConfig(networkIdParam);

      // If we don't have a submission config, the transaction will only be signed, not submitted
      if (!submissionConfig) {
        console.error(
          `No submission config available for network ${networkIdParam}. Transaction will be signed but not submitted.`,
        );
      }

      // Get network configuration
      const networkConfig = getNetworkConfig(networkIdParam);

      if (!networkConfig) {
        throw new Error(`Unsupported network ID: ${networkIdParam}`);
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
      const rpcSubmissionResult = (response.data as any)["rpc_submission_result"];
      const hash = rpcSubmissionResult ? rpcSubmissionResult.result : null;
      return {
        rawTransaction: result.transaction as unknown as string, // Base64 encoded signed transaction
        hash,
      };
    } catch (error: any) {
      console.error("Failed to sign and send transaction:", error.response?.data || error.message);
      throw new Error(`Failed to sign and send transaction: ${error.response?.data?.message || error.message}`);
    }
  }

  async getWalletAddresses(
    walletId: string,
    derivationPaths?: string[],
  ): Promise<{ addressType: DerivationInfoAddressFormatEnum; address: string }[]> {
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
      const accountsResult = accountsResponse.data.result as (ExternalDerivedAccount & { address: string })[];

      return accountsResult.map(account => ({
        addressType: account.addressFormat,
        address: account.address,
      }));
    } catch (error: any) {
      console.error("Failed to get wallet addresses:", error.response?.data || error.message);
      throw new Error(`Failed to get wallet addresses: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Sign a message
   */
  async signMessage(params: SignMessageParams): Promise<string> {
    const walletId = params.walletId;
    const messageParam = params.message;
    const networkIdParam = params.networkId;

    try {
      if (!this.config.organizationId) {
        throw new Error("organizationId is required to sign a message");
      }
      // Get network configuration
      const networkConfig = getNetworkConfig(networkIdParam);

      if (!networkConfig) {
        throw new Error(`Unsupported network ID: ${networkIdParam}`);
      }

      const derivationInfo: DerivationInfo = {
        derivationPath: networkConfig.derivationPath,
        curve: networkConfig.curve,
        addressFormat: networkConfig.addressFormat,
      };

      // Message is already base64url encoded
      const base64StringMessage = messageParam;

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

  async getWallets(limit?: number, offset?: number): Promise<GetWalletsResult> {
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

      // Fetching wallets for organization

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = response.data.result as {
        wallets: ExternalKmsWallet[];
        totalCount: number;
        limit: number;
        offset: number;
      };

      // Fetched wallets

      return {
        wallets: result.wallets.map(wallet => ({
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

  /**
   * Get organization details by organization ID
   */
  async getOrganization(organizationId: string): Promise<ExternalKmsOrganization> {
    try {
      const request = {
        method: "getOrganization",
        params: {
          organizationId: organizationId,
        },
        timestampMs: Date.now(),
      };

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = response.data.result as ExternalKmsOrganization;
      return result;
    } catch (error: any) {
      console.error("Failed to get organization:", error.response?.data || error.message);
      throw new Error(`Failed to get organization: ${error.response?.data?.message || error.message}`);
    }
  }

  async getOrCreateOrganization(
    tag: string,
    publicKey: string,
  ): Promise<ExternalKmsOrganization> {
    try {
      // First, try to get the organization
      // Since there's no explicit getOrganization method, we'll create it
      // This assumes the API returns existing org if it already exists
      return await this.createOrganization(tag, publicKey);
    } catch (error: any) {
      console.error("Failed to get or create organization:", error.response?.data || error.message);
      throw new Error(`Failed to get or create organization: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a new organization with the specified name and public key
   * @param name Organization name
   * @param publicKey Base58 encoded public key for the admin user
   * @param authenticators Optional array of authenticators. If not provided, creates a default keypair authenticator
   */
  async createOrganization(
    name: string,
    publicKey: string,
    authenticators?: AuthenticatorConfig[],
  ): Promise<ExternalKmsOrganization> {
    try {
      if (!name) {
        throw new Error("Organization name is required");
      }

      // If no authenticators provided, create a default keypair authenticator
      const authConfigs = authenticators || [
        {
          authenticatorName: `KeyPair-${name}-${Date.now()}`,
          authenticatorKind: "keypair" as const,
          publicKey: base64urlEncode(bs58.decode(publicKey)),
          algorithm: Algorithm.ed25519 as const,
        },
      ];

      const params: CreateOrganizationRequest = {
        organizationName: name,
        users: [
          {
            role: KmsUserRole.admin,
            authenticators: authConfigs as any,
            username: `user-${Date.now()}`,
          },
        ],
      };

      const request: CreateOrganization = {
        method: CreateOrganizationMethodEnum.createOrganization,
        params: params,
        timestampMs: Date.now(),
      } as any;

      const response = await this.kmsApi.postKmsRpc(request);
      const result = response.data.result as ExternalKmsOrganization;

      return result;
    } catch (error: any) {
      console.error("Failed to create organization:", error.response?.data || error.message);
      throw new Error(`Failed to create organization: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create an authenticator for a user in an organization
   */
  async createAuthenticator(params: CreateAuthenticatorParams): Promise<any> {
    try {
      const requestParams: CreateAuthenticatorRequest = {
        organizationId: params.organizationId,
        username: params.username,
        authenticatorName: params.authenticatorName,
        authenticator: params.authenticator as any
      } as any;

      const request: CreateAuthenticator = {
        method: CreateAuthenticatorMethodEnum.createAuthenticator,
        params: requestParams,
        timestampMs: Date.now(),
      } as any;

      const response = await this.kmsApi.postKmsRpc(request);
      const result = response.data.result;

      return result;
    } catch (error: any) {
      console.error("Failed to create authenticator:", error.response?.data || error.message);
      throw new Error(`Failed to create authenticator: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete an authenticator for a user in an organization
   */
  async deleteAuthenticator(params: DeleteAuthenticatorParams): Promise<any> {
    try {
      const requestParams: DeleteAuthenticatorRequest = {
        organizationId: params.organizationId,
        username: params.username,
        authenticatorId: params.authenticatorId,
      };

      const request: DeleteAuthenticator = {
        method: DeleteAuthenticatorMethodEnum.deleteAuthenticator,
        params: requestParams,
        timestampMs: Date.now(),
      } as any;

      const response = await this.kmsApi.postKmsRpc(request);
      const result = response.data.result;

      return result;
    } catch (error: any) {
      console.error("Failed to delete authenticator:", error.response?.data || error.message);
      throw new Error(`Failed to delete authenticator: ${error.response?.data?.message || error.message}`);
    }
  }

  async grantOrganizationAccess(params: GrantOrganizationAccessRequest): Promise<any> {
    try {
      const request: GrantOrganizationAccess = {
        method: GrantOrganizationAccessMethodEnum.grantOrganizationAccess,
        params: params,
        timestampMs: Date.now(),
      } as any;

      // Granting organization access with request

      const response = await this.kmsApi.postKmsRpc(request);
      const result = response.data.result;

      // Organization access granted successfully

      return result;
    } catch (error: any) {
      console.error("Failed to grant organization access:", error.response?.data || error.message);
      throw new Error(`Failed to grant organization access: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get a wallet by tag from the specified organization
   */
  async getWalletWithTag(params: GetWalletWithTagParams): Promise<any> {
    try {
      const request = {
        method: "getWalletWithTag",
        params: {
          organizationId: params.organizationId,
          tag: params.tag,
          derivationPaths: params.derivationPaths,
        },
        timestampMs: Date.now(),
      };

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = response.data.result;
      return result;
    } catch (error: any) {
      console.error("Failed to get wallet with tag:", error.response?.data || error.message);
      throw new Error(`Failed to get wallet with tag: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Stamp an axios request with the provided stamper
   */
  private async stampRequest(config: any, stamper: Stamper) {
    // Convert request body to Buffer for stamper
    const requestBody =
      typeof config.data === "string" ? config.data : config.data === undefined ? "" : JSON.stringify(config.data);
    const dataUtf8 = Buffer.from(requestBody, "utf8");

    // Check if the stamper supports OIDC stamping (has additional parameters in stamp method)
    const stampParams: any = { data: dataUtf8 };
    
    // For OIDC stampers, you would need to provide idToken and salt
    // This would typically be configured at the stamper level or passed through context
    // The current implementation supports PKI stamping by default
    
    const stamp = await stamper.stamp(stampParams);

    // Add the stamp header
    config.headers = config.headers || {};
    config.headers["X-Phantom-Stamp"] = stamp;
    return config;
  }
}
