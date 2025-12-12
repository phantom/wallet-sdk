import {
  AddUserToOrganizationMethodEnum,
  Configuration,
  CreateAuthenticatorMethodEnum,
  CreateOrganizationMethodEnum,
  CreateWalletMethodEnum,
  DeleteAuthenticatorMethodEnum,
  GetAccountsMethodEnum,
  GrantOrganizationAccessMethodEnum,
  KMSRPCApi,
  SignTransactionMethodEnum,
  SignUTF8MessageMethodEnum,
  type UserPolicy,
  UserPolicyOneOfTypeEnum,
  type DerivationInfoAddressFormatEnum as AddressType,
  type AddUserToOrganization,
  type AddUserToOrganizationRequest,
  type CreateAuthenticator,
  type CreateAuthenticatorRequest,
  type CreateOrganization,
  type CreateOrganizationRequest,
  type CreateWallet,
  type DeleteAuthenticator,
  type DeleteAuthenticatorRequest,
  type DerivationInfo,
  type ExternalDerivedAccount,
  type ExternalKmsAuthenticator,
  type ExternalKmsOrganization,
  type ExternalKmsWallet,
  type GetAccounts,
  type GrantOrganizationAccess,
  type GrantOrganizationAccessRequest,
  type PartialKmsUser,
  type SignatureWithPublicKey,
  type SignedTransactionWithPublicKey,
  type SignTransaction,
  type SignTransactionRequest,
  type SignUTF8Message,
  type SignUtf8MessageRequest,
} from "@phantom/openapi-wallet-service";
import axios, { type AxiosInstance } from "axios";
import { Buffer } from "buffer";
import { deriveSubmissionConfig } from "./caip2-mappings";
import { DerivationPath, getNetworkConfig } from "./constants";
import {
  type PrepareResponse,
  type PrepareErrorResponse,
  type AuthenticatorConfig,
  type CreateAuthenticatorParams,
  type CreateWalletResult,
  type DeleteAuthenticatorParams,
  type GetWalletsResult,
  type GetWalletWithTagParams,
  type PhantomClientConfig,
  type SignAndSendTransactionParams,
  type SignedTransaction,
  type SignedTransactionResult,
  type SignMessageParams,
  type SignTransactionParams,
  type SignTypedDataParams,
  type UserConfig,
} from "./types";
import { WalletServiceError, parseWalletServiceError, getAxiosErrorData, getErrorMessage } from "./errors";

import type { Stamper } from "@phantom/sdk-types";
import { getSecureTimestamp, randomUUID, isEthereumChain, isSolanaChain } from "@phantom/utils";

type AddUserToOrganizationParams = Omit<AddUserToOrganizationRequest, "user"> & {
  replaceExpirable?: boolean;
  user: PartialKmsUser & { traits: { appId: string }; expiresInMs?: number };
};

// TODO(napas): Auto generate this from the OpenAPI spec
export interface SubmissionConfig {
  chain: string; // e.g., 'solana', 'ethereum', 'polygon'
  network: string; // e.g., 'mainnet', 'devnet', 'sepolia'
}

export interface SimulationConfig {
  account: string; // The address/account that is signing the transaction
}

export class PhantomClient {
  private config: PhantomClientConfig;
  private kmsApi: KMSRPCApi;
  private axiosInstance: AxiosInstance;
  public stamper?: Stamper;

  constructor(config: PhantomClientConfig, stamper?: Stamper) {
    this.config = {
      ...config,
      walletType: config.walletType || "user-wallet",
    };

    // Create axios instance
    this.axiosInstance = axios.create();

    // Add custom headers interceptor
    const customHeaders: Record<string, string> = {};

    // Add any additional headers provided in config
    if (config.headers) {
      Object.assign(customHeaders, config.headers);
    }

    // Add headers interceptor if we have any custom headers
    if (Object.keys(customHeaders).length > 0) {
      this.axiosInstance.interceptors.request.use(config => {
        Object.assign(config.headers, customHeaders);
        return config;
      });
    }

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

      const timestamp = await getSecureTimestamp();

      // Create wallet request
      const walletRequest: any = {
        organizationId: this.config.organizationId,
        walletName: walletName || `Wallet ${timestamp}`,
        accounts: [
          DerivationPath.Solana(),
          DerivationPath.Ethereum(),
          DerivationPath.Bitcoin(),
          DerivationPath.Sui(),
        ] as any,
      };

      // Creating wallet with request
      const request: CreateWallet = {
        method: CreateWalletMethodEnum.createWallet,
        params: walletRequest,
        timestampMs: timestamp,
      } as any;

      const response = await this.kmsApi.postKmsRpc(request);
      const walletResult = (response.data as any).result as ExternalKmsWallet;

      // Wallet created successfully

      // Fetch the accounts
      const requestAccounts: GetAccounts = {
        method: GetAccountsMethodEnum.getAccounts,
        params: {
          accounts: [
            DerivationPath.Solana(),
            DerivationPath.Ethereum(),
            DerivationPath.Bitcoin(),
            DerivationPath.Sui(),
          ],
          organizationId: this.config.organizationId,
          walletId: walletResult.walletId,
        },
        timestampMs: timestamp,
      } as any;

      // Fetching accounts for wallet

      const accountsResponse = await this.kmsApi.postKmsRpc(requestAccounts);

      // Accounts fetched successfully
      const accountsResult = (accountsResponse.data as any).result as (ExternalDerivedAccount & { address: string })[];
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

  private async prepare(
    transaction: string,
    organizationId: string,
    submissionConfig: SubmissionConfig,
    account: string,
  ): Promise<PrepareResponse> {
    try {
      const request = {
        transaction,
        organizationId,
        submissionConfig,
        simulationConfig: { account },
      };
      const response = await this.axiosInstance.post(`${this.config.apiBaseUrl}/prepare`, request, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error: unknown) {
      const errorData = getAxiosErrorData<PrepareErrorResponse>(error);

      // Check for wallet service errors (like SpendingLimitError or transaction-blocked)
      const walletServiceError = parseWalletServiceError(errorData);
      if (walletServiceError) {
        throw walletServiceError;
      }

      // Fall back to generic error message
      const message = errorData?.detail || getErrorMessage(error, "Failed to submit transaction");
      throw new Error(message);
    }
  }

  private async getTransactionForSigning(params: {
    encodedTransaction: string;
    networkId: SignTransactionParams["networkId"];
    submissionConfig: SubmissionConfig;
    account?: string;
  }): Promise<string | { kind: "RLP_ENCODED"; bytes: string }> {
    const { encodedTransaction, networkId, submissionConfig, account } = params;

    const isEvmTransaction = isEthereumChain(networkId);
    const isSolanaTransaction = isSolanaChain(networkId);

    // For EVM transactions, use the object format with kind and bytes
    if (isEvmTransaction) {
      return { kind: "RLP_ENCODED", bytes: encodedTransaction };
    }

    // TWO-PHASE SPENDING LIMITS FLOW (Solana user-wallet only)
    if (isSolanaTransaction && this.config.walletType === "user-wallet") {
      if (!account) {
        throw new Error("Account is required to simulate Solana transactions with spending limits");
      }

      try {
        const prepareResponse = await this.prepare(
          encodedTransaction,
          this.config.organizationId as string,
          submissionConfig,
          account,
        );

        return prepareResponse.transaction;
      } catch (e: unknown) {
        // If it's a WalletServiceError, re-throw it as-is (it will be handled in performTransactionSigning)
        if (e instanceof WalletServiceError) {
          throw e;
        }

        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(errorMessage);
      }
    }

    // Non-EVM chains (including Solana server-wallet): send the original transaction as-is
    return encodedTransaction;
  }

  /**
   * Private method for shared signing logic
   */
  private async performTransactionSigning(
    params: SignTransactionParams,
    includeSubmissionConfig: boolean,
  ): Promise<{ signedTransaction: string; hash?: string }> {
    const walletId = params.walletId;
    const encodedTransaction = params.transaction;
    const networkIdParam = params.networkId;
    const derivationIndex = params.derivationIndex ?? 0;

    try {
      if (!this.config.organizationId) {
        throw new Error("organizationId is required to sign a transaction");
      }

      // SubmissionConfig is used to: 1) submit the transaction onchain, 2) derive spending limits
      const submissionConfig = deriveSubmissionConfig(networkIdParam);

      if (!submissionConfig) {
        throw new Error(`SubmissionConfig could not be derived for network ID: ${networkIdParam}`);
      }

      const networkConfig = getNetworkConfig(networkIdParam, derivationIndex);

      if (!networkConfig) {
        throw new Error(`Unsupported network ID: ${networkIdParam}`);
      }

      const derivationInfo: DerivationInfo = {
        derivationPath: networkConfig.derivationPath,
        curve: networkConfig.curve,
        addressFormat: networkConfig.addressFormat,
      };

      const transactionForSigning = await this.getTransactionForSigning({
        encodedTransaction,
        networkId: networkIdParam,
        submissionConfig,
        account: params.account,
      });

      const signRequest: SignTransactionRequest & {
        submissionConfig?: SubmissionConfig;
        simulationConfig?: SimulationConfig;
      } = {
        organizationId: this.config.organizationId,
        walletId: walletId,
        transaction: transactionForSigning,
        derivationInfo: derivationInfo,
      } as any;

      // Add submission config if available and requested
      if (includeSubmissionConfig) {
        signRequest.submissionConfig = submissionConfig;
      }

      // Add simulation config if provided (only for signAndSendTransaction)
      if (includeSubmissionConfig && params.account) {
        signRequest.simulationConfig = {
          account: params.account,
        };
      }

      const request: SignTransaction = {
        method: SignTransactionMethodEnum.signTransaction,
        params: signRequest,
        timestampMs: await getSecureTimestamp(),
      } as any;

      const response = await this.kmsApi.postKmsRpc(request);
      const result = (response.data as any).result as SignedTransactionWithPublicKey;
      const rpcSubmissionResult = (response.data as any)["rpc_submission_result"];
      const hash = includeSubmissionConfig && rpcSubmissionResult ? rpcSubmissionResult.result : null;

      return {
        signedTransaction: result.transaction as unknown as string, // Base64 encoded signed transaction
        hash,
      };
    } catch (error: unknown) {
      const actionType = includeSubmissionConfig ? "sign and send" : "sign";

      // Preserve wallet service errors so callers can distinguish them
      if (error instanceof WalletServiceError) {
        throw error;
      }

      throw new Error(getErrorMessage(error, `Failed to ${actionType} transaction`));
    }
  }

  /**
   * Sign a transaction
   */
  async signTransaction(params: SignTransactionParams): Promise<SignedTransactionResult> {
    const result = await this.performTransactionSigning(params, false);

    return {
      rawTransaction: result.signedTransaction,
    };
  }

  /**
   * Sign and send a transaction
   */
  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    const result = await this.performTransactionSigning(params, true);
    return {
      rawTransaction: result.signedTransaction,
      hash: result.hash,
    };
  }

  async getWalletAddresses(
    walletId: string,
    derivationPaths?: string[],
    derivationIndex?: number,
  ): Promise<{ addressType: AddressType; address: string }[]> {
    try {
      const accountIndex = derivationIndex ?? 0;
      const paths = derivationPaths || [
        DerivationPath.Solana(accountIndex),
        DerivationPath.Ethereum(accountIndex),
        DerivationPath.Bitcoin(accountIndex),
        DerivationPath.Sui(accountIndex),
      ];

      const requestAccounts: GetAccounts = {
        method: GetAccountsMethodEnum.getAccounts,
        params: {
          accounts: paths,
          organizationId: this.config.organizationId,
          walletId: walletId,
        },
        timestampMs: await getSecureTimestamp(),
      } as any;

      const accountsResponse = await this.kmsApi.postKmsRpc(requestAccounts);
      const accountsResult = (accountsResponse.data as any).result as (ExternalDerivedAccount & { address: string })[];

      const addresses = accountsResult.map(account => ({
        addressType: account.addressFormat,
        address: account.address,
      }));

      return addresses;
    } catch (error: any) {
      console.error("Failed to get wallet addresses:", error.response?.data || error.message);
      throw new Error(`Failed to get wallet addresses: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Sign an Ethereum message using EIP-191 personal sign
   */
  async ethereumSignMessage(params: SignMessageParams): Promise<string> {
    const walletId = params.walletId;
    const messageParam = params.message;
    const networkIdParam = params.networkId;
    const derivationIndex = params.derivationIndex ?? 0;

    try {
      if (!this.config.organizationId) {
        throw new Error("organizationId is required to sign a message");
      }
      // Get network configuration with custom derivation index
      const networkConfig = getNetworkConfig(networkIdParam, derivationIndex);

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

      const request = {
        method: "ethereumSignMessage",
        params: {
          message: base64StringMessage,
          organizationId: this.config.organizationId,
          walletId,
          derivationInfo,
        },
        timestampMs: await getSecureTimestamp(),
      };

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = (response.data as any).result as SignatureWithPublicKey;

      // Return the base64 encoded signature
      return result.signature;
    } catch (error: any) {
      console.error("Failed to sign Ethereum message:", error.response?.data || error.message);
      throw new Error(`Failed to sign Ethereum message: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Sign a UTF-8 message for Solana
   */
  async signUtf8Message(params: SignMessageParams): Promise<string> {
    const walletId = params.walletId;
    const messageParam = params.message;
    const networkIdParam = params.networkId;
    const derivationIndex = params.derivationIndex ?? 0;

    try {
      if (!this.config.organizationId) {
        throw new Error("organizationId is required to sign a message");
      }
      // Get network configuration with custom derivation index
      const networkConfig = getNetworkConfig(networkIdParam, derivationIndex);

      if (!networkConfig) {
        throw new Error(`Unsupported network ID: ${networkIdParam}`);
      }

      const derivationInfo: DerivationInfo = {
        derivationPath: networkConfig.derivationPath,
        curve: networkConfig.curve,
        addressFormat: networkConfig.addressFormat,
      };

      const signRequest: SignUtf8MessageRequest = {
        organizationId: this.config.organizationId,
        walletId: walletId,
        message: messageParam,
        algorithm: networkConfig.algorithm,
        derivationInfo: derivationInfo,
      };

      const request: SignUTF8Message & { timestampMs: number } = {
        method: SignUTF8MessageMethodEnum.signUtf8Message,
        params: signRequest,
        timestampMs: await getSecureTimestamp(),
      };

      const response = await this.kmsApi.postKmsRpc(request);
      const result = (response.data as any).result as SignatureWithPublicKey;

      // Return the base64 encoded signature
      return result.signature;
    } catch (error: any) {
      console.error("Failed to sign raw payload:", error.response?.data || error.message);
      throw new Error(`Failed to sign raw payload: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Sign EIP-712 typed data for Ethereum
   */
  async ethereumSignTypedData(params: SignTypedDataParams): Promise<string> {
    const walletId = params.walletId;
    const typedData = params.typedData;
    const networkIdParam = params.networkId;
    const derivationIndex = params.derivationIndex ?? 0;

    try {
      if (!this.config.organizationId) {
        throw new Error("organizationId is required to sign typed data");
      }

      // Get network configuration
      const networkConfig = getNetworkConfig(networkIdParam, derivationIndex);

      if (!networkConfig) {
        throw new Error(`Unsupported network ID: ${networkIdParam}`);
      }

      const derivationInfo: DerivationInfo = {
        derivationPath: networkConfig.derivationPath,
        curve: networkConfig.curve,
        addressFormat: networkConfig.addressFormat,
      };

      // Use the native EthereumSignTypedData endpoint
      const request = {
        method: "ethereumSignTypedData",
        params: {
          typedData,
          organizationId: this.config.organizationId,
          walletId,
          derivationInfo,
        },
        timestampMs: await getSecureTimestamp(),
      };

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = (response.data as any).result as SignatureWithPublicKey;

      // Return the base64 encoded signature
      return result.signature;
    } catch (error: any) {
      console.error("Failed to sign typed data:", error.response?.data || error.message);
      throw new Error(`Failed to sign typed data: ${error.response?.data?.message || error.message}`);
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
        timestampMs: await getSecureTimestamp(),
      };

      // Fetching wallets for organization

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = (response.data as any).result as {
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
        timestampMs: await getSecureTimestamp(),
      };

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = (response.data as any).result as ExternalKmsOrganization;
      return result;
    } catch (error: any) {
      console.error("Failed to get organization:", error.response?.data || error.message);
      throw new Error(`Failed to get organization: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a new organization with the specified name and users
   * @param name Organization name
   * @param users Array of users with their authenticators
   */
  private validateNameLength(name: string, type: string): void {
    const MAX_NAME_LENGTH = 64;
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(`${type} name cannot exceed ${MAX_NAME_LENGTH} characters. Current length: ${name.length}`);
    }
  }

  async createOrganization(name: string, users: UserConfig[], tags?: string[]): Promise<ExternalKmsOrganization> {
    try {
      if (!name) {
        throw new Error("Organization name is required");
      }

      // Validate organization name length
      this.validateNameLength(name, "Organization");

      if (!users || users.length === 0) {
        throw new Error("At least one user is required");
      }

      // Validate user names and authenticator names
      for (const user of users) {
        if (user.username) {
          this.validateNameLength(user.username, "Username");
        }

        for (const auth of user.authenticators) {
          if (auth.authenticatorName) {
            this.validateNameLength(auth.authenticatorName, "Authenticator");
          }
        }
      }

      const params: CreateOrganizationRequest = {
        organizationName: name,
        users: users.map(userConfig => ({
          username: userConfig.username || `user-${randomUUID()}`,
          authenticators: userConfig.authenticators as any,
          policy:
            userConfig.role === "ADMIN"
              ? {
                  type: UserPolicyOneOfTypeEnum.root,
                }
              : ({ type: "CEL", preset: "LEGACY_USER_ROLE" } as UserPolicy),
        })),
        tags,
      };

      const request: CreateOrganization & { timestampMs: number } = {
        method: CreateOrganizationMethodEnum.createOrganization,
        params: params,
        timestampMs: await getSecureTimestamp(),
      };

      const response = await this.kmsApi.postKmsRpc(request);
      const result = (response.data as any).result as ExternalKmsOrganization;

      return result;
    } catch (error: any) {
      console.error("Failed to create organization:", error.response?.data || error.message);
      throw new Error(`Failed to create organization: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create an authenticator for a user in an organization
   */
  async createAuthenticator(params: CreateAuthenticatorParams): Promise<ExternalKmsAuthenticator> {
    try {
      // Validate name lengths
      if (params.username) {
        this.validateNameLength(params.username, "Username");
      }
      if (params.authenticatorName) {
        this.validateNameLength(params.authenticatorName, "Authenticator");
      }
      if (params.authenticator?.authenticatorName) {
        this.validateNameLength(params.authenticator.authenticatorName, "Authenticator");
      }

      const requestParams: CreateAuthenticatorRequest = {
        organizationId: params.organizationId,
        username: params.username,
        authenticatorName: params.authenticatorName,
        authenticator: params.authenticator as AuthenticatorConfig,
        replaceExpirable: params.replaceExpirable,
      } as any;

      const request: CreateAuthenticator & { timestampMs: number } = {
        method: CreateAuthenticatorMethodEnum.createAuthenticator,
        params: requestParams,
        timestampMs: await getSecureTimestamp(),
      };

      const response = await this.kmsApi.postKmsRpc(request);
      const result = (response.data as any).result as ExternalKmsAuthenticator;

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

      const request: DeleteAuthenticator & { timestampMs: number } = {
        method: DeleteAuthenticatorMethodEnum.deleteAuthenticator,
        params: requestParams,
        timestampMs: await getSecureTimestamp(),
      };

      const response = await this.kmsApi.postKmsRpc(request);
      const result = (response.data as any).result;

      return result;
    } catch (error: any) {
      console.error("Failed to delete authenticator:", error.response?.data || error.message);
      throw new Error(`Failed to delete authenticator: ${error.response?.data?.message || error.message}`);
    }
  }

  async grantOrganizationAccess(params: GrantOrganizationAccessRequest): Promise<any> {
    try {
      const request: GrantOrganizationAccess & { timestampMs: number } = {
        method: GrantOrganizationAccessMethodEnum.grantOrganizationAccess,
        params: params,
        timestampMs: await getSecureTimestamp(),
      };

      // Granting organization access with request

      const response = await this.kmsApi.postKmsRpc(request);
      const result = (response.data as any).result;

      // Organization access granted successfully

      return result;
    } catch (error: any) {
      console.error("Failed to grant organization access:", error.response?.data || error.message);
      throw new Error(`Failed to grant organization access: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add a new user to an organization
   */
  async addUserToOrganization(params: AddUserToOrganizationParams): Promise<void> {
    try {
      const request: AddUserToOrganization & { timestampMs: number } = {
        method: AddUserToOrganizationMethodEnum.addUserToOrganization,
        params,
        timestampMs: await getSecureTimestamp(),
      };

      await this.kmsApi.postKmsRpc(request);
      // Return success - void method
    } catch (error: any) {
      console.error("Failed to add user to organization:", error.response?.data || error.message);
      throw new Error(`Failed to add user to organization: ${error.response?.data?.message || error.message}`);
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
        timestampMs: await getSecureTimestamp(),
      };

      const response = await this.kmsApi.postKmsRpc(request as any);
      const result = (response.data as any).result;
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

    const stamp = await stamper.stamp({
      data: dataUtf8,
    });

    // Add the stamp header
    config.headers = config.headers || {};
    config.headers["X-Phantom-Stamp"] = stamp;
    return config;
  }
}
