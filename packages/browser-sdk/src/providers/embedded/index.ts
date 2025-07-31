import { PhantomClient, generateKeyPair } from "@phantom/client";
import type { AddressType } from "@phantom/client";
import { ApiKeyStamper } from "@phantom/api-key-stamper";
import type {
  Provider,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignedTransaction,
  WalletAddress,
} from "../../types";
import { IndexedDBStorage } from "./storage";
import { IframeAuth } from "./auth";
import { parseMessage, parseTransaction } from "@phantom/parsers";

export interface EmbeddedProviderConfig {
  apiBaseUrl: string;
  organizationId: string;
  authUrl?: string;
  embeddedWalletType: "app-wallet" | "user-wallet";
  addressTypes: AddressType[];
  solanaProvider: "web3js" | "kit";
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
    // Store solana provider config (unused for now)
    config.solanaProvider;
  }

  async connect(): Promise<ConnectResult> {
    let session = await this.storage.getSession();

    // If no session exists, create new one
    if (!session) {
      // Generate keypair using PhantomClient
      const keypair = generateKeyPair();

      // Create a temporary client with the keypair
      const stamper = new ApiKeyStamper({
        apiSecretKey: keypair.secretKey,
      });

      const tempClient = new PhantomClient(
        {
          apiBaseUrl: this.config.apiBaseUrl,
        },
        stamper,
      );

      // Create an organization
      // organization name is a combination of this organizationId and this userId, which will be a unique identifier
      const uid = Date.now(); // for now
      const organizationName = `${this.config.organizationId}-${uid}`;
      const { organizationId } = await tempClient.createOrganization(organizationName, keypair);

      let walletId: string;

      if (this.config.embeddedWalletType === "user-wallet") {
        // Authenticate with iframe for user-wallet type
        const auth = new IframeAuth();
        const authResult = await auth.authenticate({
          iframeUrl: this.config.authUrl || "https://auth-flow.phantom.app",
          organizationId: organizationId,
          parentOrganizationId: this.config.organizationId,
          embeddedWalletType: this.config.embeddedWalletType,
        });
        walletId = authResult.walletId;
      } else {
        // Create app-wallet directly
        const wallet = await tempClient.createWallet(`Wallet ${Date.now()}`);
        walletId = wallet.walletId;
      }

      // Save session
      session = {
        walletId: walletId,
        organizationId: this.config.organizationId,
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
      stamper,
    );

    this.walletId = session.walletId;

    // Get wallet addresses and filter by enabled address types
    const addresses = await this.client.getWalletAddresses(session.walletId);
    this.addresses = addresses
      .filter(addr => this.config.addressTypes.some(type => type === addr.addressType))
      .map(addr => ({
        addressType: addr.addressType as AddressType,
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

  async signMessage(params: SignMessageParams): Promise<string> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Parse message to base64url format for client
    const parsedMessage = parseMessage(params.message);

    return await this.client.signMessage({
      walletId: this.walletId,
      message: parsedMessage.base64url,
      networkId: params.networkId,
    });
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    if (!this.client || !this.walletId) {
      throw new Error("Not connected");
    }

    // Parse transaction to base64url format for client based on network
    const parsedTransaction = await parseTransaction(params.transaction, params.networkId);

    return await this.client.signAndSendTransaction({
      walletId: this.walletId,
      transaction: parsedTransaction.base64url,
      networkId: params.networkId,
    });
  }

  getAddresses(): WalletAddress[] {
    return this.addresses;
  }

  isConnected(): boolean {
    return this.client !== null && this.walletId !== null;
  }
}
