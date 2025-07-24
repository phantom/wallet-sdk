import { PhantomClient } from '@phantom/client';
import { ApiKeyStamper } from '@phantom/api-key-stamper';
import type { Provider, ConnectResult, SignMessageParams, SignAndSendTransactionParams, SignedTransaction, WalletAddress } from '../../types';
import { IndexedDBStorage } from './storage';
import { IframeAuth } from './auth';

export interface EmbeddedProviderConfig {
  apiBaseUrl: string;
  organizationId: string;
  authUrl: string;
  embeddedWalletType: 'app-wallet' | 'user-wallet';
}

export class EmbeddedProvider implements Provider {
  private config: EmbeddedProviderConfig;
  private storage: IndexedDBStorage;
  private client: PhantomClient | null = null;
  private walletId: string | null = null;
  private addresses: WalletAddress[] = [];

  constructor(config: EmbeddedProviderConfig) {
    this.config = config;
    this.storage = new IndexedDBStorage();
  }

  async connect(): Promise<ConnectResult> {
    let session = await this.storage.getSession();

    // If no session exists, create new one
    if (!session) {
      // Generate keypair
      const keypair = await this.storage.generateKeypair();
      
      // Create a temporary client with the keypair to create the organization
      const stamper = new ApiKeyStamper({
        apiSecretKey: keypair.secretKey,
      });

      const tempClient = new PhantomClient(
        {
          apiBaseUrl: this.config.apiBaseUrl,
          organizationId: '', // Will be set after creation
        },
        stamper
      );

      // Create the organization
      const organization = await tempClient.createOrganization({
        name: `Organization ${Date.now()}`,
        // Add any other required organization parameters here
      });

      const organizationId = organization.id || organization.organizationId;

      // Authenticate with iframe
      const auth = new IframeAuth();
      const authResult = await auth.authenticate({
        iframeUrl: this.config.authUrl,
        organizationId: organizationId,
        embeddedWalletType: this.config.embeddedWalletType,
      });

      // Save session
      session = {
        walletId: authResult.walletId,
        organizationId: organizationId,
        keypair,
      };
      await this.storage.saveSession(session);
    }

    // Create client from session
    const stamper = new ApiKeyStamper({
      apiSecretKey: session.keypair.secretKey,
    });

    this.client = new PhantomClient(
      {
        apiBaseUrl: this.config.apiBaseUrl,
        organizationId: session.organizationId,
      },
      stamper
    );

    this.walletId = session.walletId;

    // Get wallet addresses
    const addresses = await this.client.getWalletAddresses(session.walletId);
    this.addresses = addresses.map(addr => ({
      addressType: addr.addressType,
      address: addr.address,
    }));

    return {
      walletId: this.walletId,
      addresses: this.addresses,
    };
  }

  async disconnect(): Promise<void> {
    await this.storage.clearSession();
    this.client = null;
    this.walletId = null;
    this.addresses = [];
  }

  async signMessage(walletId: string | null, params: SignMessageParams): Promise<string> {
    if (!this.client || !this.walletId) {
      throw new Error('Not connected');
    }

    return this.client.signMessage(
      this.walletId,
      params.message,
      params.networkId
    );
  }

  async signAndSendTransaction(walletId: string | null, params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    if (!this.client || !this.walletId) {
      throw new Error('Not connected');
    }

    return this.client.signAndSendTransaction(
      this.walletId,
      params.transaction,
      params.networkId
    );
  }

  async getAddresses(): Promise<WalletAddress[]> {
    return this.addresses;
  }

  isConnected(): boolean {
    return this.client !== null && this.walletId !== null;
  }
}