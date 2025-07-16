import { ServerSDKConfig, CreateWalletResult, Transaction, SignedTransaction } from './types';
import { createAuthenticatedAxiosInstance } from './auth';
import { DerivationPath, getNetworkConfig } from './constants';
import { Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
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
 ExternalDerivedAccount
} from '@phantom/openapi-wallet-service';

export class ServerSDK {
  private config: ServerSDKConfig;
  private kmsApi: KMSRPCApi;
  private signingKeypair: Keypair;
  private solanaConnection?: Connection;

  constructor(config: ServerSDKConfig) {
    this.config = config;

    if (!config.organizationId || !config.apiBaseUrl) {
      throw new Error('organizationId and apiBaseUrl are required');
    }

    // Decode the private key from base58
    const privateKeyBytes = bs58.decode(config.apiPrivateKey);
    this.signingKeypair = Keypair.fromSecretKey(privateKeyBytes);

    // Create authenticated axios instance
    const authenticatedAxios = createAuthenticatedAxiosInstance(this.signingKeypair);

    // Configure the KMS API client with authentication
    const configuration = new Configuration({
      basePath: config.apiBaseUrl,
    });

    // Pass the authenticated axios instance to the KMS API
    this.kmsApi = new KMSRPCApi(configuration, config.apiBaseUrl, authenticatedAxios);

    // Initialize Solana connection if RPC URL is provided
    if (config.solanaRpcUrl) {
      this.solanaConnection = new Connection(config.solanaRpcUrl, 'confirmed');
    }
  }

  async createWallet(walletName?: string): Promise<CreateWalletResult> {
    try {
      // Create wallet request
      const walletRequest: CreateWalletRequest = {
        organizationId: this.config.organizationId,
        walletName: walletName || `Wallet ${Date.now()}`,
        accounts: [
          DerivationPath.Solana,
          DerivationPath.Ethereum,
          DerivationPath.Bitcoin,
          DerivationPath.Sui
        ] as any
      };

      console.log("Creating wallet with request:", walletRequest);

      const request: CreateWallet = {
        method: CreateWalletMethodEnum.createWallet,
        params: walletRequest,
        timestampMs: Date.now()
      } as any

      const response = await this.kmsApi.postKmsRpc(request);
      const walletResult = response.data.result as ExternalKmsWallet;

      console.log("Wallet created successfully:", walletResult);

      // Fetch the accounts
      const requestAccounts: GetAccounts = {
        method: GetAccountsMethodEnum.getAccounts,
        params: {
          accounts: [
            DerivationPath.Solana,
            DerivationPath.Ethereum,
            DerivationPath.Bitcoin,
            DerivationPath.Sui],
          organizationId: this.config.organizationId,
          walletId: walletResult.walletId
        },
        timestampMs: Date.now()
      } as any;

      console.log("Fetching accounts for wallet:", walletResult.walletId);

      const accountsResponse = await this.kmsApi.postKmsRpc(requestAccounts);

      console.log("Accounts fetched successfully:", accountsResponse.data.result);
      const accountsResult = accountsResponse.data.result as  (ExternalDerivedAccount & { publicKey : string })[];

      
      return {
        walletId: walletResult.walletId,
        addresses: accountsResult.map(account => ({
          addressType: account.addressFormat,
          address: account.publicKey
        })),
      };
    } catch (error: any) {
      console.error('Failed to create wallet:', error.response?.data || error.message);
      throw new Error(`Failed to create wallet: ${error.response?.data?.message || error.message}`);
    }
  }

  async signAndSendTransaction(walletId: string, transaction: Transaction): Promise<SignedTransaction> {
    try {
      // For Solana transactions, the data field contains the base64 encoded transaction
      if (transaction.networkId.startsWith('solana:')) {

        // Get network configuration
        const networkConfig = getNetworkConfig(transaction.networkId);

        const derivationInfo: DerivationInfo = {
          derivationPath: networkConfig.derivationPath,
          curve: networkConfig.curve,
          addressFormat: networkConfig.addressFormat
        };

        // Sign transaction request
        const signRequest: SignTransactionRequest = {
          organizationId: this.config.organizationId,
          walletId: walletId,
          transaction: transaction.data as any,
          derivationInfo: derivationInfo
        };

        const request: SignTransaction = {
          method: SignTransactionMethodEnum.signTransaction,
          params: signRequest,
          timestampMs: Date.now()
        } as any;

        const response = await this.kmsApi.postKmsRpc(request);
        const result = response.data.result as SignedTransactionWithPublicKey;

        // Send the transaction to Solana network
        if (this.solanaConnection) {
          try {
            // Decode the signed transaction from base64
            const signedTxBuffer = Buffer.from(result.transaction as unknown as string, 'base64');

            // Send raw transaction
            const signature = await this.solanaConnection.sendRawTransaction(
              signedTxBuffer,
              {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
              }
            );

            // Confirm the transaction
            const latestBlockhash = await this.solanaConnection.getLatestBlockhash();
            await this.solanaConnection.confirmTransaction({
              signature,
              blockhash: latestBlockhash.blockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            });

            return {
              txHash: signature,
              signature: signature,
              rawTransaction: result.transaction as unknown as string, // Base64 encoded signed transaction
            };
          } catch (sendError: any) {
            console.error('Failed to send transaction to Solana:', sendError);
            throw new Error(`Failed to send transaction to Solana: ${sendError.message}`);
          }
        } else {
          // No Solana connection configured, just return signed transaction
          console.log('No Solana RPC configured, returning signed transaction only');
          throw new Error('No Solana RPC configured');
        }
      } else {
        // For EVM chains (future implementation)
        throw new Error('EVM transaction signing not yet implemented');
      }
    } catch (error: any) {
      console.error('Failed to sign and send transaction:', error.response?.data || error.message);
      throw new Error(`Failed to sign and send transaction: ${error.response?.data?.message || error.message}`);
    }
  }

  async getWalletAddresses(walletId: string, derivationPaths?: string[]): Promise<{ addressType: string; address: string }[]> {
    try {
      const paths = derivationPaths || [
        DerivationPath.Solana,
        DerivationPath.Ethereum,
        DerivationPath.Bitcoin,
        DerivationPath.Sui
      ];

      const requestAccounts: GetAccounts = {
        method: GetAccountsMethodEnum.getAccounts,
        params: {
          accounts: paths,
          organizationId: this.config.organizationId,
          walletId: walletId
        },
        timestampMs: Date.now()
      } as any;

      const accountsResponse = await this.kmsApi.postKmsRpc(requestAccounts);
      const accountsResult = accountsResponse.data.result as (ExternalDerivedAccount & { publicKey: string })[];

      return accountsResult.map(account => ({
        addressType: account.addressFormat,
        address: account.publicKey
      }));
    } catch (error: any) {
      console.error('Failed to get wallet addresses:', error.response?.data || error.message);
      throw new Error(`Failed to get wallet addresses: ${error.response?.data?.message || error.message}`);
    }
  }

  async signMessage(walletId: string, message: string, networkId: string): Promise<string> {
    try {
      // Convert message to byte array
      const messageBytes = Array.from(Buffer.from(message, 'utf8'));

      // Get network configuration
      const networkConfig = getNetworkConfig(networkId);

      const derivationInfo: DerivationInfo = {
        derivationPath: networkConfig.derivationPath,
        curve: networkConfig.curve,
        addressFormat: networkConfig.addressFormat
      };

      const signRequest: SignRawPayloadRequest = {
        organizationId: this.config.organizationId,
        walletId: walletId,
        payload: messageBytes,
        algorithm: networkConfig.algorithm,
        derivationInfo: derivationInfo
      };

      const request: SignRawPayload = {
        method: SignRawPayloadMethodEnum.signRawPayload,
        params: signRequest,
        timestampMs: Date.now()
      } as any;


      const response = await this.kmsApi.postKmsRpc(request);
      const result = response.data.result as SignatureWithPublicKey;

      // Return the base64 encoded signature
      return result.signature;
    } catch (error: any) {
      console.error('Failed to sign message:', error.response?.data || error.message);
      throw new Error(`Failed to sign message: ${error.response?.data?.message || error.message}`);
    }
  }
}

export * from './types';