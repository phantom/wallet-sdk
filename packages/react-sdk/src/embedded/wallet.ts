import { PhantomClient } from '@phantom/client';
import type { WalletAddress, EmbeddedWalletType } from '../types';
import { IndexedDBStorage } from './storage/indexedDB';
import { IframeAuth } from './auth/iframeAuth';
import { ApiKeyStamper } from '@phantom/api-key-stamper';

export interface ConnectOptions {
  apiBaseUrl: string;
  organizationId: string;
  authUrl: string;
  embeddedWalletType: EmbeddedWalletType;
}

export interface ConnectResult {
  walletId: string;
  addresses: WalletAddress[];
}

export async function connectEmbeddedWallet(options: ConnectOptions): Promise<ConnectResult> {
  const storage = new IndexedDBStorage();
  let session = await storage.getSession();

  // If no session exists, create new one
  if (!session) {
    // Generate keypair
    const keypair = await storage.generateKeypair();
    
    // Mock: In real implementation, this would create client and call createOrganization
    const mockOrganizationId = `org-${Date.now()}`;

    // Authenticate with iframe
    const auth = new IframeAuth();
    const authResult = await auth.authenticate({
      iframeUrl: options.authUrl,
      organizationId: mockOrganizationId,
      embeddedWalletType: options.embeddedWalletType,
    });

    // Save session
    session = {
      walletId: authResult.walletId,
      organizationId: mockOrganizationId,
      keypair,
    };
    await storage.saveSession(session);
  }

  // Create client from session to get addresses
  const stamper = new ApiKeyStamper({
    apiSecretKey: session.keypair.secretKey,
  });

  const client = new PhantomClient(
    {
      apiBaseUrl: options.apiBaseUrl,
      organizationId: session.organizationId,
    },
    stamper
  );

  // Get wallet addresses
  const addresses = await client.getWalletAddresses(session.walletId);

  return {
    walletId: session.walletId,
    addresses: addresses.map(addr => ({
      addressType: addr.addressType,
      address: addr.address,
    })),
  };
}

export async function disconnectEmbeddedWallet(): Promise<void> {
  const storage = new IndexedDBStorage();
  await storage.clearSession();
}

export async function getEmbeddedWalletClient(apiBaseUrl: string): Promise<PhantomClient | null> {
  const storage = new IndexedDBStorage();
  const session = await storage.getSession();

  if (!session) {
    return null;
  }

  const stamper = new ApiKeyStamper({
    apiSecretKey: session.keypair.secretKey,
  });

  return new PhantomClient(
    {
      apiBaseUrl: apiBaseUrl,
      organizationId: session.organizationId,
    },
    stamper
  );
}