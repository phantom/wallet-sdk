import { ServerSDK } from '../src/index';
import { ServerSDKConfig } from '../src/types';

describe('ServerSDK', () => {
  let sdk: ServerSDK;
  let config: ServerSDKConfig;
  let testWalletId: string;

  beforeAll(() => {
    // Validate required environment variables
    const requiredEnvVars = [
      'PHANTOM_ORGANIZATION_PRIVATE_KEY',
      'PHANTOM_ORGANIZATION_ID',
      'PHANTOM_WALLET_API'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}. Please create a .env file based on .env.example`);
      }
    }

    // Initialize config from environment variables
    config = {
      organizationId: process.env.PHANTOM_ORGANIZATION_ID!,
      apiPrivateKey: process.env.PHANTOM_ORGANIZATION_PRIVATE_KEY!,
      apiBaseUrl: process.env.PHANTOM_WALLET_API!,
      solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    };

    sdk = new ServerSDK(config);
  });

  describe('Initialization', () => {
    it('should initialize SDK with valid environment variables', () => {
      expect(() => {
        new ServerSDK(config);
      }).not.toThrow();
    });

    it('should throw error when organizationId is missing', () => {
      const invalidConfig = { ...config, organizationId: '' };
      expect(() => {
        new ServerSDK(invalidConfig);
      }).toThrow('organizationId and apiBaseUrl are required');
    });

    it('should throw error when apiBaseUrl is missing', () => {
      const invalidConfig = { ...config, apiBaseUrl: '' };
      expect(() => {
        new ServerSDK(invalidConfig);
      }).toThrow('organizationId and apiBaseUrl are required');
    });

    it('should throw error with invalid private key', () => {
      const invalidConfig = { ...config, apiPrivateKey: 'invalid-key' };
      expect(() => {
        new ServerSDK(invalidConfig);
      }).toThrow();
    });
  });

  describe('Wallet Operations', () => {
    it('should create a wallet and return accounts', async () => {
      const walletName = `Test Wallet ${Date.now()}`;
      const result = await sdk.createWallet(walletName);

      expect(result).toBeDefined();
      expect(result.walletId).toBeDefined();
      expect(typeof result.walletId).toBe('string');
      expect(result.addresses).toBeDefined();
      expect(Array.isArray(result.addresses)).toBe(true);
      expect(result.addresses.length).toBeGreaterThan(0);

      // Check that we have addresses for different chains
      const addressTypes = result.addresses.map(addr => addr.addressType);
      expect(addressTypes).toContain('Solana');
      expect(addressTypes).toContain('Ethereum');
      expect(addressTypes).toContain('BitcoinSegwit');
      expect(addressTypes).toContain('Sui');

      // Store wallet ID for subsequent tests
      testWalletId = result.walletId;
    }, 30000); // 30 second timeout for API calls

    it('should fetch wallet addresses using getWalletAddresses', async () => {
      // Ensure we have a wallet ID from previous test
      expect(testWalletId).toBeDefined();

      const addresses = await sdk.getWalletAddresses(testWalletId);

      expect(addresses).toBeDefined();
      expect(Array.isArray(addresses)).toBe(true);
      expect(addresses.length).toBeGreaterThan(0);

      // Verify address structure
      addresses.forEach(addr => {
        expect(addr).toHaveProperty('addressType');
        expect(addr).toHaveProperty('address');
        expect(typeof addr.addressType).toBe('string');
        expect(typeof addr.address).toBe('string');
      });

      // Check that we have all expected address types
      const addressTypes = addresses.map(addr => addr.addressType);
      expect(addressTypes).toContain('Solana');
      expect(addressTypes).toContain('Ethereum');
      expect(addressTypes).toContain('Bitcoin');
      expect(addressTypes).toContain('Sui');
    }, 30000);

    it('should fetch specific wallet addresses using custom derivation paths', async () => {
      // Test fetching only Solana and Ethereum addresses
      const customPaths = ["m/44'/501'/0'/0'", "m/44'/60'/0'/0/0"];
      const addresses = await sdk.getWalletAddresses(testWalletId, customPaths);

      expect(addresses).toBeDefined();
      expect(Array.isArray(addresses)).toBe(true);
      expect(addresses.length).toBe(2);

      const addressTypes = addresses.map(addr => addr.addressType);
      expect(addressTypes).toContain('Solana');
      expect(addressTypes).toContain('Ethereum');
    }, 30000);
  });

  describe('Message Signing', () => {
    beforeAll(async () => {
      // Create a wallet if we don't have one from previous tests
      if (!testWalletId) {
        const result = await sdk.createWallet('Test Wallet for Signing');
        testWalletId = result.walletId;
      }
    });

    it('should sign a message for Solana', async () => {
      const message = 'Hello from Phantom SDK tests!';
      const networkId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'; // Solana mainnet

      const signature = await sdk.signMessage(testWalletId, message, networkId);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
      // Base64 signature should be a valid base64 string
      expect(() => Buffer.from(signature, 'base64')).not.toThrow();
    }, 30000);

    it('should sign a message for Ethereum', async () => {
      const message = 'Hello from Phantom SDK Ethereum test!';
      const networkId = 'eip155:1'; // Ethereum mainnet

      const signature = await sdk.signMessage(testWalletId, message, networkId);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
      // Base64 signature should be a valid base64 string
      expect(() => Buffer.from(signature, 'base64')).not.toThrow();
    }, 30000);

    it('should sign different messages and get different signatures', async () => {
      const message1 = 'First message';
      const message2 = 'Second message';
      const networkId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

      const signature1 = await sdk.signMessage(testWalletId, message1, networkId);
      const signature2 = await sdk.signMessage(testWalletId, message2, networkId);

      expect(signature1).not.toBe(signature2);
    }, 30000);

    it('should handle UTF-8 messages correctly', async () => {
      const message = '🚀 Unicode message with emojis! 你好世界';
      const networkId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

      const signature = await sdk.signMessage(testWalletId, message, networkId);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should throw error when signing with invalid wallet ID', async () => {
      const invalidWalletId = 'invalid-wallet-id';
      const message = 'Test message';
      const networkId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

      await expect(
        sdk.signMessage(invalidWalletId, message, networkId)
      ).rejects.toThrow('Failed to sign message');
    });

    it('should throw error when getting addresses for invalid wallet ID', async () => {
      const invalidWalletId = 'invalid-wallet-id';

      await expect(
        sdk.getWalletAddresses(invalidWalletId)
      ).rejects.toThrow('Failed to get wallet addresses');
    });

    it('should throw error for unsupported network ID', async () => {
      const message = 'Test message';
      const unsupportedNetworkId = 'unsupported:network';

      await expect(
        sdk.signMessage(testWalletId, message, unsupportedNetworkId)
      ).rejects.toThrow();
    });
  });
});