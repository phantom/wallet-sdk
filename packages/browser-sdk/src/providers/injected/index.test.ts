import { InjectedProvider } from './index';
import { 
  createMockSolanaProvider, 
  createMockEthereumProvider,
  setupWindowMock,
  cleanupWindowMock,
  MockSolanaProvider,
  MockEthereumProvider,
} from '../../test-utils/mockWindow';
import { AddressType } from '@phantom/client';
import { base64urlDecode, stringToBase64url, base64urlEncode } from '../../utils/base64url';

// Mock the @solana/web3.js module
jest.mock('@solana/web3.js', () => ({
  VersionedTransaction: {
    deserialize: jest.fn(),
  },
}));

describe('InjectedProvider', () => {
  let provider: InjectedProvider;
  let mockSolanaProvider: MockSolanaProvider;
  let mockEthereumProvider: MockEthereumProvider;

  beforeEach(() => {
    cleanupWindowMock();
    provider = new InjectedProvider();
  });

  afterEach(() => {
    cleanupWindowMock();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Solana wallet', async () => {
      const mockPublicKey = 'GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH';
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockResolvedValue({
          publicKey: { toString: () => mockPublicKey },
        }),
      });
      setupWindowMock({ solana: mockSolanaProvider });

      const result = await provider.connect();

      expect(mockSolanaProvider.connect).toHaveBeenCalled();
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.SOLANA,
        address: mockPublicKey,
      });
      expect(provider.isConnected()).toBe(true);
    });

    it('should connect to Ethereum wallet', async () => {
      const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65';
      mockEthereumProvider = createMockEthereumProvider({
        request: jest.fn().mockResolvedValue([mockAddress]),
      });
      setupWindowMock({ ethereum: mockEthereumProvider });

      const result = await provider.connect();

      expect(mockEthereumProvider.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0]).toEqual({
        addressType: AddressType.ETHEREUM,
        address: mockAddress,
      });
      expect(provider.isConnected()).toBe(true);
    });

    it('should handle multiple Ethereum addresses', async () => {
      const mockAddresses = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65',
        '0x1234567890123456789012345678901234567890',
      ];
      mockEthereumProvider = createMockEthereumProvider({
        request: jest.fn().mockResolvedValue(mockAddresses),
      });
      setupWindowMock({ ethereum: mockEthereumProvider });

      const result = await provider.connect();

      expect(result.addresses).toHaveLength(2);
      expect(result.addresses[0].addressType).toBe(AddressType.ETHEREUM);
      expect(result.addresses[1].addressType).toBe(AddressType.ETHEREUM);
    });

    it('should throw error when no Phantom wallet is found', async () => {
      setupWindowMock({});

      await expect(provider.connect()).rejects.toThrow('No supported wallet provider found');
    });

    it('should throw error when no supported provider is found', async () => {
      // @ts-ignore
      global.window.phantom = {};

      await expect(provider.connect()).rejects.toThrow('No supported wallet provider found');
    });

    it('should handle Solana connection error', async () => {
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockRejectedValue(new Error('User rejected')),
      });
      setupWindowMock({ solana: mockSolanaProvider });

      await expect(provider.connect()).rejects.toThrow('Failed to connect to Solana wallet: Error: User rejected');
    });

    it('should handle Ethereum connection error', async () => {
      mockEthereumProvider = createMockEthereumProvider({
        request: jest.fn().mockRejectedValue(new Error('User denied')),
      });
      setupWindowMock({ ethereum: mockEthereumProvider });

      await expect(provider.connect()).rejects.toThrow('Failed to connect to Ethereum wallet: Error: User denied');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Solana wallet', async () => {
      const mockPublicKey = 'GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH';
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockResolvedValue({
          publicKey: { toString: () => mockPublicKey },
        }),
        disconnect: jest.fn().mockResolvedValue(undefined),
      });
      setupWindowMock({ solana: mockSolanaProvider });

      await provider.connect();
      await provider.disconnect();

      expect(mockSolanaProvider.disconnect).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
      expect(await provider.getAddresses()).toEqual([]);
    });

    it('should handle disconnect when Solana provider has no disconnect method', async () => {
      const mockPublicKey = 'GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH';
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockResolvedValue({
          publicKey: { toString: () => mockPublicKey },
        }),
        disconnect: undefined,
      });
      setupWindowMock({ solana: mockSolanaProvider });

      await provider.connect();
      await provider.disconnect();

      expect(provider.isConnected()).toBe(false);
    });

    it('should disconnect from Ethereum wallet', async () => {
      mockEthereumProvider = createMockEthereumProvider({
        request: jest.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65']),
      });
      setupWindowMock({ ethereum: mockEthereumProvider });

      await provider.connect();
      await provider.disconnect();

      // Ethereum doesn't have a standard disconnect method
      expect(provider.isConnected()).toBe(false);
      expect(await provider.getAddresses()).toEqual([]);
    });
  });

  describe('signMessage', () => {
    describe('Solana', () => {
      beforeEach(async () => {
        const mockPublicKey = 'GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH';
        mockSolanaProvider = createMockSolanaProvider({
          connect: jest.fn().mockResolvedValue({
            publicKey: { toString: () => mockPublicKey },
          }),
        });
        setupWindowMock({ solana: mockSolanaProvider });
        await provider.connect();
      });

      it('should sign a message on Solana', async () => {
        const message = 'Hello Phantom!';
        const messageBase64url = stringToBase64url(message);
        const mockSignature = new Uint8Array([1, 2, 3, 4, 5]);

        mockSolanaProvider.signMessage.mockResolvedValue({
          signature: mockSignature,
        });

        const result = await provider.signMessage(null, {
          message: messageBase64url,
          networkId: 'solana:mainnet',
        });

        expect(mockSolanaProvider.signMessage).toHaveBeenCalledWith(
          new TextEncoder().encode(message)
        );
        expect(result).toBe(base64urlEncode(mockSignature));
      });

      it('should handle Solana devnet', async () => {
        const message = 'Test message';
        const messageBase64url = stringToBase64url(message);
        const mockSignature = new Uint8Array([10, 20, 30]);

        mockSolanaProvider.signMessage.mockResolvedValue({
          signature: mockSignature,
        });

        const result = await provider.signMessage(null, {
          message: messageBase64url,
          networkId: 'solana:devnet',
        });

        expect(mockSolanaProvider.signMessage).toHaveBeenCalled();
        expect(result).toBe(base64urlEncode(mockSignature));
      });
    });

    describe('Ethereum', () => {
      beforeEach(async () => {
        mockEthereumProvider = createMockEthereumProvider({
          request: jest.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65']),
        });
        setupWindowMock({ ethereum: mockEthereumProvider });
        await provider.connect();
      });

      it('should sign a message on Ethereum', async () => {
        const message = 'Hello Ethereum!';
        const messageBase64url = stringToBase64url(message);
        const mockSignature = '0x1234567890abcdef';

        mockEthereumProvider.request.mockResolvedValue(mockSignature);

        const result = await provider.signMessage(null, {
          message: messageBase64url,
          networkId: 'ethereum:mainnet',
        });

        expect(mockEthereumProvider.request).toHaveBeenCalledWith({
          method: 'personal_sign',
          params: [message, '0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65'],
        });

        // Verify hex to base64url conversion
        const expectedBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]);
        expect(result).toBe(base64urlEncode(expectedBytes));
      });

      it('should handle Polygon network', async () => {
        const message = 'Hello Polygon!';
        const messageBase64url = stringToBase64url(message);
        const mockSignature = '0xabcdef';

        mockEthereumProvider.request.mockResolvedValue(mockSignature);

        const result = await provider.signMessage(null, {
          message: messageBase64url,
          networkId: 'polygon:mainnet',
        });

        expect(mockEthereumProvider.request).toHaveBeenCalledWith({
          method: 'personal_sign',
          params: [message, '0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65'],
        });
      });
    });

    it('should throw error when not connected', async () => {
      await expect(provider.signMessage(null, {
        message: 'test',
        networkId: 'solana:mainnet',
      })).rejects.toThrow('Wallet not connected');
    });

    it('should throw error for unsupported network', async () => {
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockResolvedValue({
          publicKey: { toString: () => 'test' },
        }),
      });
      setupWindowMock({ solana: mockSolanaProvider });
      await provider.connect();

      await expect(provider.signMessage(null, {
        message: 'test',
        networkId: 'bitcoin:mainnet',
      })).rejects.toThrow('Network bitcoin:mainnet is not supported for injected wallets');
    });

    it('should throw error when no address available for Ethereum', async () => {
      mockEthereumProvider = createMockEthereumProvider({
        request: jest.fn().mockResolvedValue([]),
      });
      setupWindowMock({ ethereum: mockEthereumProvider });
      await provider.connect();

      await expect(provider.signMessage(null, {
        message: 'test',
        networkId: 'ethereum:mainnet',
      })).rejects.toThrow('No address available');
    });
  });

  describe('signAndSendTransaction', () => {
    const { VersionedTransaction } = require('@solana/web3.js');

    describe('Solana', () => {
      beforeEach(async () => {
        const mockPublicKey = 'GfJ4JhQXbUMwh7x8e7YFHC3yLz5FJGvjurQrNxFWkeYH';
        mockSolanaProvider = createMockSolanaProvider({
          connect: jest.fn().mockResolvedValue({
            publicKey: { toString: () => mockPublicKey },
          }),
        });
        setupWindowMock({ solana: mockSolanaProvider });
        await provider.connect();
      });

      it('should sign and send a VersionedTransaction', async () => {
        const mockTxBytes = new Uint8Array([1, 2, 3, 4, 5]);
        const transactionBase64url = base64urlEncode(mockTxBytes);
        const mockVersionedTx = { serialize: jest.fn() };
        const mockSignature = 'mockSignature123';

        VersionedTransaction.deserialize.mockReturnValue(mockVersionedTx);
        mockSolanaProvider.signAndSendTransaction.mockResolvedValue({
          signature: mockSignature,
        });

        const result = await provider.signAndSendTransaction(null, {
          transaction: transactionBase64url,
          networkId: 'solana:mainnet',
        });

        expect(VersionedTransaction.deserialize).toHaveBeenCalledWith(mockTxBytes);
        expect(mockSolanaProvider.signAndSendTransaction).toHaveBeenCalledWith(mockVersionedTx);
        expect(result).toEqual({
          rawTransaction: mockSignature,
        });
      });

      it('should fall back to Kit transaction format when VersionedTransaction fails', async () => {
        const mockTxBytes = new Uint8Array([1, 2, 3, 4, 5]);
        const transactionBase64url = base64urlEncode(mockTxBytes);
        const mockSignature = 'mockSignature456';

        VersionedTransaction.deserialize.mockImplementation(() => {
          throw new Error('Invalid transaction');
        });
        mockSolanaProvider.signAndSendTransaction.mockResolvedValue({
          signature: mockSignature,
        });

        const result = await provider.signAndSendTransaction(null, {
          transaction: transactionBase64url,
          networkId: 'solana:mainnet',
        });

        expect(mockSolanaProvider.signAndSendTransaction).toHaveBeenCalledWith({
          messageBytes: mockTxBytes,
          signatures: expect.any(Map),
        });
        expect(result).toEqual({
          rawTransaction: mockSignature,
        });
      });
    });

    describe('Ethereum', () => {
      beforeEach(async () => {
        mockEthereumProvider = createMockEthereumProvider({
          request: jest.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b844Bc9e7595f6cE65']),
        });
        setupWindowMock({ ethereum: mockEthereumProvider });
        await provider.connect();
      });

      it('should sign and send an Ethereum transaction', async () => {
        const mockTxBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
        const transactionBase64url = base64urlEncode(mockTxBytes);
        const mockTxHash = '0xabcdef1234567890';

        mockEthereumProvider.request.mockResolvedValue(mockTxHash);

        const result = await provider.signAndSendTransaction(null, {
          transaction: transactionBase64url,
          networkId: 'ethereum:mainnet',
        });

        expect(mockEthereumProvider.request).toHaveBeenCalledWith({
          method: 'eth_sendTransaction',
          params: ['0x12345678'],
        });
        expect(result).toEqual({
          rawTransaction: mockTxHash,
        });
      });
    });

    it('should throw error when not connected', async () => {
      await expect(provider.signAndSendTransaction(null, {
        transaction: 'test',
        networkId: 'solana:mainnet',
      })).rejects.toThrow('Wallet not connected');
    });

    it('should throw error for unsupported network', async () => {
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockResolvedValue({
          publicKey: { toString: () => 'test' },
        }),
      });
      setupWindowMock({ solana: mockSolanaProvider });
      await provider.connect();

      await expect(provider.signAndSendTransaction(null, {
        transaction: 'test',
        networkId: 'bitcoin:mainnet',
      })).rejects.toThrow('Network bitcoin:mainnet is not supported for injected wallets');
    });
  });

  describe('getAddresses', () => {
    it('should return empty array when not connected', async () => {
      const addresses = await provider.getAddresses();
      expect(addresses).toEqual([]);
    });

    it('should return addresses after connection', async () => {
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockResolvedValue({
          publicKey: { toString: () => 'test-address' },
        }),
      });
      setupWindowMock({ solana: mockSolanaProvider });

      await provider.connect();
      const addresses = await provider.getAddresses();

      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toBe('test-address');
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(provider.isConnected()).toBe(false);
    });

    it('should return true after connection', async () => {
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockResolvedValue({
          publicKey: { toString: () => 'test' },
        }),
      });
      setupWindowMock({ solana: mockSolanaProvider });

      await provider.connect();
      expect(provider.isConnected()).toBe(true);
    });

    it('should return false after disconnection', async () => {
      mockSolanaProvider = createMockSolanaProvider({
        connect: jest.fn().mockResolvedValue({
          publicKey: { toString: () => 'test' },
        }),
      });
      setupWindowMock({ solana: mockSolanaProvider });

      await provider.connect();
      await provider.disconnect();
      expect(provider.isConnected()).toBe(false);
    });
  });
});