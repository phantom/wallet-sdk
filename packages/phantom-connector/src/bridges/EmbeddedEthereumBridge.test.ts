import { EmbeddedEthereumBridge } from './EmbeddedEthereumBridge';
import { NetworkId } from '@phantom/constants';
import { AddressType } from '@phantom/client';

describe('EmbeddedEthereumBridge', () => {
  let mockEmbeddedProvider: any;
  let bridge: EmbeddedEthereumBridge;

  beforeEach(() => {
    mockEmbeddedProvider = {
      getAddresses: jest.fn().mockReturnValue([
        { addressType: AddressType.ethereum, address: '0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E' }
      ]),
      isConnected: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
    };

    bridge = new EmbeddedEthereumBridge(mockEmbeddedProvider, NetworkId.ETHEREUM_MAINNET);
  });

  describe('standard EIP-1193 methods', () => {
    describe('eth_chainId', () => {
      it('should return current chainId in hex format', async () => {
        const result = await bridge.request({ method: 'eth_chainId' });
        expect(result).toBe('0x1'); // Chain 1 in hex
      });
    });

    describe('eth_accounts', () => {
      it('should return ethereum addresses', async () => {
        mockEmbeddedProvider.getAddresses.mockReturnValue([
          { addressType: AddressType.ethereum, address: '0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E' },
          { addressType: AddressType.solana, address: '11111111111111111111111111111112' }, // Should be filtered out
        ]);

        const result = await bridge.request({ method: 'eth_accounts' });
        
        expect(result).toEqual(['0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E']);
      });

      it('should return empty array if no ethereum addresses', async () => {
        mockEmbeddedProvider.getAddresses.mockReturnValue([
          { addressType: AddressType.solana, address: '11111111111111111111111111111112' },
        ]);

        const result = await bridge.request({ method: 'eth_accounts' });
        
        expect(result).toEqual([]);
      });
    });

    describe('personal_sign', () => {
      it('should sign message with embedded provider', async () => {
        const mockSignature = '0x1234567890abcdef';
        mockEmbeddedProvider.signMessage.mockResolvedValue({
          signature: mockSignature,
        });

        const result = await bridge.request({ 
          method: 'personal_sign', 
          params: ['Hello World', '0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E'] 
        });

        expect(mockEmbeddedProvider.signMessage).toHaveBeenCalledWith({
          message: 'Hello World',
          networkId: 'eip155:1',
        });
        expect(result).toBe(mockSignature);
      });
    });

    describe('eth_sendTransaction', () => {
      it('should send transaction with embedded provider', async () => {
        const mockTxHash = '0xabcdef1234567890';
        mockEmbeddedProvider.signAndSendTransaction.mockResolvedValue({
          hash: mockTxHash,
        });

        const txParams = {
          to: '0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E',
          value: '0x1BC16D674EC80000',
          data: '0x',
        };

        const result = await bridge.request({ 
          method: 'eth_sendTransaction', 
          params: [txParams] 
        });

        expect(mockEmbeddedProvider.signAndSendTransaction).toHaveBeenCalledWith({
          transaction: txParams,
          networkId: 'eip155:1',
        });
        expect(result).toBe(mockTxHash);
      });
    });

    describe('wallet_switchEthereumChain', () => {
      it('should switch chains and emit event', async () => {
        const eventListener = jest.fn();
        bridge.on('chainChanged', eventListener);
        
        // Mock addresses to make switchChain work
        mockEmbeddedProvider.getAddresses.mockReturnValue([
          { addressType: AddressType.ethereum, address: '0x123' }
        ]);

        await bridge.request({ 
          method: 'wallet_switchEthereumChain', 
          params: [{ chainId: '0x89' }] // Polygon
        });

        expect(bridge.chainId).toBe('0x89');
        expect(eventListener).toHaveBeenCalledWith({ chainId: '0x89' });
      });

      it('should throw error for unsupported chainId', async () => {
        await expect(bridge.request({ 
          method: 'wallet_switchEthereumChain', 
          params: [{ chainId: '0x999999' }] // Unsupported chain
        })).rejects.toThrow('Unsupported chainId: 10066329');
      });
    });

    describe('unsupported methods', () => {
      it('should throw error for unsupported methods', async () => {
        await expect(bridge.request({ 
          method: 'eth_signTypedData_v4', 
          params: [] 
        })).rejects.toThrow('Method eth_signTypedData_v4 not supported');
      });
    });
  });

  describe('properties', () => {
    it('should return correct standard properties', () => {
      mockEmbeddedProvider.getAddresses.mockReturnValue([
        { addressType: AddressType.ethereum, address: '0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E' },
      ]);
      mockEmbeddedProvider.isConnected.mockReturnValue(true);

      expect(bridge.isPhantom).toBe(true);
      expect(bridge.selectedAddress).toBe('0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E');
      expect(bridge.chainId).toBe('0x1');
      expect(bridge.isConnected).toBe(true);
    });

    it('should return null selectedAddress when no ethereum addresses', () => {
      mockEmbeddedProvider.getAddresses.mockReturnValue([]);

      expect(bridge.selectedAddress).toBe(null);
    });
  });

  describe('event handling', () => {
    it('should register and trigger event listeners', async () => {
      const chainChangedListener = jest.fn();
      const accountsChangedListener = jest.fn();
      
      bridge.on('chainChanged', chainChangedListener);
      bridge.on('accountsChanged', accountsChangedListener);

      // Mock addresses to make switchChain work
      mockEmbeddedProvider.getAddresses.mockReturnValue([
        { addressType: AddressType.ethereum, address: '0x123' }
      ]);
      
      // Trigger a chain switch
      await bridge.switchChain(137);

      expect(chainChangedListener).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const listener = jest.fn();
      
      bridge.on('chainChanged', listener);
      bridge.off('chainChanged', listener);

      // Mock addresses to make switchChain work
      mockEmbeddedProvider.getAddresses.mockReturnValue([
        { addressType: AddressType.ethereum, address: '0x123' }
      ]);
      
      // Trigger a chain switch
      await bridge.switchChain(137);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('network mapping', () => {
    it('should correctly map chainIds to networkIds', () => {
      const testCases = [
        { chainId: 1, networkId: 'eip155:1' },
        { chainId: 137, networkId: 'eip155:137' },
        { chainId: 10, networkId: 'eip155:10' },
        { chainId: 42161, networkId: 'eip155:42161' },
      ];

      testCases.forEach(({ chainId, networkId }) => {
        const bridge = new EmbeddedEthereumBridge(mockEmbeddedProvider, networkId as any);
        expect(bridge.chainId).toBe(`0x${chainId.toString(16)}`);
      });
    });
  });
});