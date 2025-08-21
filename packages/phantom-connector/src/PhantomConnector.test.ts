import { PhantomConnector } from './PhantomConnector';
import { EmbeddedEthereumBridge } from './bridges/EmbeddedEthereumBridge';
import { EmbeddedSolanaBridge } from './bridges/EmbeddedSolanaBridge';
import { NetworkId } from '@phantom/constants';
import { AddressType } from '@phantom/client';

// Mock @solana/web3.js to avoid ESM issues
jest.mock('@solana/web3.js', () => ({
  PublicKey: jest.fn(),
  Transaction: jest.fn(),
  VersionedTransaction: jest.fn(),
}));

// Mock the bridges
jest.mock('./bridges/EmbeddedEthereumBridge');
jest.mock('./bridges/EmbeddedSolanaBridge');

const MockedEmbeddedEthereumBridge = EmbeddedEthereumBridge as jest.MockedClass<typeof EmbeddedEthereumBridge>;
const MockedEmbeddedSolanaBridge = EmbeddedSolanaBridge as jest.MockedClass<typeof EmbeddedSolanaBridge>;

describe('PhantomConnector', () => {
  let mockProvider: any;
  let connector: PhantomConnector;

  beforeEach(() => {
    mockProvider = {
      getAddresses: jest.fn(),
      isConnected: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('embedded wallet integration', () => {
    beforeEach(() => {
      connector = new PhantomConnector(mockProvider, 'embedded');
    });

    describe('getEthereumProvider', () => {
      it('should create an EmbeddedEthereumBridge for embedded wallets', async () => {
        const mockBridge = {
          switchChain: jest.fn(),
        };
        MockedEmbeddedEthereumBridge.mockImplementation(() => mockBridge as any);

        const result = await connector.getEthereumProvider(1);

        expect(MockedEmbeddedEthereumBridge).toHaveBeenCalledWith(mockProvider, 'eip155:1');
        expect(result).toBe(mockBridge);
      });

      it('should switch chains on existing bridge', async () => {
        const mockBridge = {
          switchChain: jest.fn(),
        };
        MockedEmbeddedEthereumBridge.mockImplementation(() => mockBridge as any);

        // First call creates the bridge
        await connector.getEthereumProvider(1);
        
        // Second call should reuse and switch
        await connector.getEthereumProvider(137);

        expect(mockBridge.switchChain).toHaveBeenCalledWith(137);
      });

      it('should map chainId to networkId correctly', async () => {
        const mockBridge = {
          switchChain: jest.fn(),
        };
        MockedEmbeddedEthereumBridge.mockImplementation(() => mockBridge as any);

        await connector.getEthereumProvider(137); // Polygon

        expect(MockedEmbeddedEthereumBridge).toHaveBeenCalledWith(mockProvider, 'eip155:137');
      });
    });

    describe('getSolanaProvider', () => {
      it('should create an EmbeddedSolanaBridge for embedded wallets', async () => {
        const mockBridge = {
          switchNetwork: jest.fn(),
        };
        MockedEmbeddedSolanaBridge.mockImplementation(() => mockBridge as any);

        const result = await connector.getSolanaProvider(NetworkId.SOLANA_MAINNET);

        expect(MockedEmbeddedSolanaBridge).toHaveBeenCalledWith(mockProvider, NetworkId.SOLANA_MAINNET);
        expect(result).toBe(mockBridge);
      });

      it('should switch networks on existing bridge', async () => {
        const mockBridge = {
          switchNetwork: jest.fn(),
        };
        MockedEmbeddedSolanaBridge.mockImplementation(() => mockBridge as any);

        // First call creates the bridge
        await connector.getSolanaProvider(NetworkId.SOLANA_MAINNET);
        
        // Second call should reuse and switch
        await connector.getSolanaProvider(NetworkId.SOLANA_DEVNET);

        expect(mockBridge.switchNetwork).toHaveBeenCalledWith(NetworkId.SOLANA_DEVNET);
      });
    });
  });

  describe('injected wallet integration', () => {
    beforeEach(() => {
      connector = new PhantomConnector(mockProvider, 'injected');
    });

    describe('getEthereumProvider', () => {
      it('should use injected ethereum provider directly', async () => {
        const mockEthProvider = {
          request: jest.fn().mockResolvedValue(null),
        };
        mockProvider.getInjectedEthereumProvider = jest.fn().mockReturnValue(mockEthProvider);

        const result = await connector.getEthereumProvider(137);

        expect(mockProvider.getInjectedEthereumProvider).toHaveBeenCalled();
        expect(mockEthProvider.request).toHaveBeenCalledWith({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x89' }] // 137 in hex
        });
        expect(result).toBe(mockEthProvider);
      });
    });

    describe('getSolanaProvider', () => {
      it('should use injected solana provider directly', async () => {
        const mockSolProvider = {
          switchNetwork: jest.fn(),
        };
        mockProvider.getInjectedSolanaProvider = jest.fn().mockReturnValue(mockSolProvider);

        const result = await connector.getSolanaProvider(NetworkId.SOLANA_DEVNET);

        expect(mockProvider.getInjectedSolanaProvider).toHaveBeenCalled();
        expect(mockSolProvider.switchNetwork).toHaveBeenCalledWith(NetworkId.SOLANA_DEVNET);
        expect(result).toBe(mockSolProvider);
      });

      it('should skip network switching if not supported', async () => {
        const mockSolProvider = {
          // No switchNetwork method
        };
        mockProvider.getInjectedSolanaProvider = jest.fn().mockReturnValue(mockSolProvider);

        const result = await connector.getSolanaProvider(NetworkId.SOLANA_DEVNET);

        expect(result).toBe(mockSolProvider);
      });
    });
  });

  describe('getSupportedChains', () => {
    beforeEach(() => {
      connector = new PhantomConnector(mockProvider, 'embedded');
    });

    it('should return chains based on available addresses', () => {
      mockProvider.getAddresses.mockReturnValue([
        { addressType: AddressType.solana, address: '11111111111111111111111111111112' },
        { addressType: AddressType.ethereum, address: '0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E' },
      ]);

      const chains = connector.getSupportedChains();

      expect(chains).toHaveLength(5); // 2 Solana + 3 Ethereum chains
      expect(chains.filter(c => c.chainType === 'solana')).toHaveLength(2);
      expect(chains.filter(c => c.chainType === 'ethereum')).toHaveLength(3);
      
      const mainnetChains = chains.filter(c => c.isActive);
      expect(mainnetChains).toHaveLength(2); // Solana mainnet and Ethereum mainnet
    });

    it('should return only Solana chains if no Ethereum address', () => {
      mockProvider.getAddresses.mockReturnValue([
        { addressType: AddressType.solana, address: '11111111111111111111111111111112' },
      ]);

      const chains = connector.getSupportedChains();

      expect(chains).toHaveLength(2);
      expect(chains.every(c => c.chainType === 'solana')).toBe(true);
    });

    it('should return empty array if no addresses', () => {
      mockProvider.getAddresses.mockReturnValue([]);

      const chains = connector.getSupportedChains();

      expect(chains).toHaveLength(0);
    });
  });
});