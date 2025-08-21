import { EmbeddedSolanaBridge } from './EmbeddedSolanaBridge';
import { Transaction } from '@solana/web3.js';
import { NetworkId } from '@phantom/constants';
import { AddressType } from '@phantom/client';

// Mock Solana Web3.js
jest.mock('@solana/web3.js', () => ({
  PublicKey: jest.fn().mockImplementation((key: string) => ({
    toString: () => key,
    toBase58: () => key,
  })),
  Transaction: jest.fn(),
}));

describe('EmbeddedSolanaBridge', () => {
  let mockEmbeddedProvider: any;
  let bridge: EmbeddedSolanaBridge;

  beforeEach(() => {
    mockEmbeddedProvider = {
      getAddresses: jest.fn().mockReturnValue([
        { addressType: AddressType.solana, address: '11111111111111111111111111111112' }
      ]),
      isConnected: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    bridge = new EmbeddedSolanaBridge(mockEmbeddedProvider, NetworkId.SOLANA_MAINNET);
  });

  describe('connect', () => {
    it('should connect and return public key', async () => {
      mockEmbeddedProvider.connect.mockResolvedValue();
      mockEmbeddedProvider.getAddresses.mockReturnValue([
        { addressType: AddressType.solana, address: '11111111111111111111111111111112' },
      ]);

      const result = await bridge.connect();

      expect(mockEmbeddedProvider.connect).toHaveBeenCalled();
      expect(result.publicKey).toEqual(expect.any(Object)); // Mock PublicKey
    });

    it('should throw error if no solana addresses available', async () => {
      mockEmbeddedProvider.connect.mockResolvedValue();
      mockEmbeddedProvider.getAddresses.mockReturnValue([
        { addressType: 'ethereum', address: '0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E' },
      ]);

      await expect(bridge.connect()).rejects.toThrow('No Solana addresses available');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from embedded provider', async () => {
      mockEmbeddedProvider.disconnect.mockResolvedValue();

      await bridge.disconnect();

      expect(mockEmbeddedProvider.disconnect).toHaveBeenCalled();
    });
  });

  describe('signMessage', () => {
    it('should sign message with utf8 encoding', async () => {
      const mockSignature = 'base64signature';
      mockEmbeddedProvider.signMessage.mockResolvedValue({
        signature: mockSignature,
      });

      const message = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = await bridge.signMessage(message, 'utf8');

      expect(mockEmbeddedProvider.signMessage).toHaveBeenCalledWith({
        message: 'Hello',
        networkId: NetworkId.SOLANA_MAINNET,
      });
      expect(result.signature).toBeInstanceOf(Uint8Array);
    });

    it('should sign message with hex encoding', async () => {
      const mockSignature = 'base64signature';
      mockEmbeddedProvider.signMessage.mockResolvedValue({
        signature: mockSignature,
      });

      const message = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = await bridge.signMessage(message, 'hex');

      expect(mockEmbeddedProvider.signMessage).toHaveBeenCalledWith({
        message: '48656c6c6f', // "Hello" in hex
        networkId: NetworkId.SOLANA_MAINNET,
      });
      expect(result.signature).toBeInstanceOf(Uint8Array);
    });

    it('should default to utf8 encoding', async () => {
      const mockSignature = 'base64signature';
      mockEmbeddedProvider.signMessage.mockResolvedValue({
        signature: mockSignature,
      });

      const message = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      await bridge.signMessage(message);

      expect(mockEmbeddedProvider.signMessage).toHaveBeenCalledWith({
        message: 'Hello',
        networkId: NetworkId.SOLANA_MAINNET,
      });
    });
  });

  describe('signTransaction', () => {
    it('should throw error for embedded wallets', () => {
      const mockTransaction = new Transaction();
      
      expect(() => bridge.signTransaction(mockTransaction))
        .toThrow('signTransaction not supported for embedded wallets - use signAndSendTransaction');
    });
  });

  describe('signAllTransactions', () => {
    it('should throw error for embedded wallets', () => {
      const mockTransactions = [new Transaction(), new Transaction()];
      
      expect(() => bridge.signAllTransactions(mockTransactions))
        .toThrow('signAllTransactions not supported for embedded wallets');
    });
  });

  describe('signAndSendTransaction', () => {
    it('should sign and send transaction', async () => {
      const mockTxHash = 'signature123456';
      mockEmbeddedProvider.signAndSendTransaction.mockResolvedValue({
        hash: mockTxHash,
      });

      const mockTransaction = new Transaction();
      const result = await bridge.signAndSendTransaction(mockTransaction);

      expect(mockEmbeddedProvider.signAndSendTransaction).toHaveBeenCalledWith({
        transaction: mockTransaction,
        networkId: NetworkId.SOLANA_MAINNET,
      });
      expect(result).toEqual({ signature: mockTxHash });
    });
  });

  describe('switchNetwork', () => {
    it('should switch to valid solana network', async () => {
      const eventListener = jest.fn();
      bridge.on = jest.fn((event, listener) => {
        if (event === 'networkChanged') {
          eventListener.mockImplementation(listener);
        }
      });

      await bridge.switchNetwork(NetworkId.SOLANA_DEVNET);

      // Test internal state change by checking if it uses the new network
      const mockSignature = 'base64signature';
      mockEmbeddedProvider.signMessage.mockResolvedValue({
        signature: mockSignature,
      });

      await bridge.signMessage(new Uint8Array([72, 101, 108, 108, 111]));

      expect(mockEmbeddedProvider.signMessage).toHaveBeenCalledWith({
        message: 'Hello',
        networkId: NetworkId.SOLANA_DEVNET,
      });
    });

    it('should throw error for non-solana network', async () => {
      await expect(bridge.switchNetwork('eip155:1' as any))
        .rejects.toThrow('Invalid Solana network: eip155:1');
    });
  });

  describe('properties', () => {
    it('should return correct standard properties', () => {
      mockEmbeddedProvider.getAddresses.mockReturnValue([
        { addressType: AddressType.solana, address: '11111111111111111111111111111112' },
      ]);
      mockEmbeddedProvider.isConnected.mockReturnValue(true);

      expect(bridge.isPhantom).toBe(true);
      expect(bridge.publicKey).toEqual(expect.any(Object)); // Mock PublicKey
      expect(bridge.isConnected).toBe(true);
    });

    it('should return null publicKey when no solana addresses', () => {
      mockEmbeddedProvider.getAddresses.mockReturnValue([
        { addressType: 'ethereum', address: '0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E' },
      ]);

      expect(bridge.publicKey).toBe(null);
    });
  });
});