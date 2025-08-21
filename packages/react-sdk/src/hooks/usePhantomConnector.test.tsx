import { renderHook } from '@testing-library/react';
import { usePhantomConnector } from './usePhantomConnector';
import { usePhantom } from './usePhantom';
import { PhantomConnector } from '@phantom/phantom-connector';

// Mock dependencies
jest.mock('./usePhantom');
jest.mock('@phantom/phantom-connector');

const mockUsePhantom = usePhantom as jest.MockedFunction<typeof usePhantom>;
const MockedPhantomConnector = PhantomConnector as jest.MockedClass<typeof PhantomConnector>;

describe('usePhantomConnector', () => {
  let mockProvider: any;
  let mockConnector: any;

  beforeEach(() => {
    mockProvider = {
      getAddresses: jest.fn(),
      isConnected: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
    };

    mockConnector = {
      getEthereumProvider: jest.fn(),
      getSolanaProvider: jest.fn(),
      getSupportedChains: jest.fn(),
    };

    MockedPhantomConnector.mockImplementation(() => mockConnector);

    jest.clearAllMocks();
  });

  it('should throw error when used outside PhantomProvider', () => {
    mockUsePhantom.mockReturnValue(null);

    expect(() => {
      renderHook(() => usePhantomConnector());
    }).toThrow('usePhantomConnector must be used within a PhantomProvider');
  });

  it('should return null connector when no provider', () => {
    mockUsePhantom.mockReturnValue({
      provider: null,
      providerType: 'embedded',
      connect: jest.fn(),
      disconnect: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
      accounts: [],
      isConnected: false,
    });

    const { result } = renderHook(() => usePhantomConnector());

    expect(result.current.connector).toBeNull();
  });

  it('should create connector for embedded provider', () => {
    mockUsePhantom.mockReturnValue({
      provider: mockProvider,
      providerType: 'embedded',
      connect: jest.fn(),
      disconnect: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
      accounts: [],
      isConnected: true,
    });

    const { result } = renderHook(() => usePhantomConnector());

    expect(MockedPhantomConnector).toHaveBeenCalledWith(mockProvider, 'embedded');
    expect(result.current.connector).toBe(mockConnector);
  });

  it('should create connector for injected provider', () => {
    mockUsePhantom.mockReturnValue({
      provider: mockProvider,
      providerType: 'injected',
      connect: jest.fn(),
      disconnect: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
      accounts: [],
      isConnected: true,
    });

    const { result } = renderHook(() => usePhantomConnector());

    expect(MockedPhantomConnector).toHaveBeenCalledWith(mockProvider, 'injected');
  });

  describe('getEthereumProvider', () => {
    beforeEach(() => {
      mockUsePhantom.mockReturnValue({
        provider: mockProvider,
        providerType: 'embedded',
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        accounts: [],
        isConnected: true,
      });
    });

    it('should call connector.getEthereumProvider with chainId', async () => {
      const mockEthProvider = { request: jest.fn() };
      mockConnector.getEthereumProvider.mockResolvedValue(mockEthProvider);

      const { result } = renderHook(() => usePhantomConnector());
      const ethProvider = await result.current.getEthereumProvider(137);

      expect(mockConnector.getEthereumProvider).toHaveBeenCalledWith(137);
      expect(ethProvider).toBe(mockEthProvider);
    });

    it('should use default chainId when not provided', async () => {
      const mockEthProvider = { request: jest.fn() };
      mockConnector.getEthereumProvider.mockResolvedValue(mockEthProvider);

      const { result } = renderHook(() => usePhantomConnector());
      await result.current.getEthereumProvider();

      expect(mockConnector.getEthereumProvider).toHaveBeenCalledWith(undefined);
    });

    it('should throw error when no connector available', async () => {
      mockUsePhantom.mockReturnValue({
        provider: null,
        providerType: 'embedded',
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        accounts: [],
        isConnected: false,
      });

      const { result } = renderHook(() => usePhantomConnector());

      await expect(result.current.getEthereumProvider()).rejects.toThrow(
        'No connector available - wallet not connected'
      );
    });
  });

  describe('getSolanaProvider', () => {
    beforeEach(() => {
      mockUsePhantom.mockReturnValue({
        provider: mockProvider,
        providerType: 'embedded',
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        accounts: [],
        isConnected: true,
      });
    });

    it('should call connector.getSolanaProvider with networkId', async () => {
      const mockSolProvider = { signMessage: jest.fn() };
      mockConnector.getSolanaProvider.mockResolvedValue(mockSolProvider);

      const { result } = renderHook(() => usePhantomConnector());
      const solProvider = await result.current.getSolanaProvider('solana:devnet');

      expect(mockConnector.getSolanaProvider).toHaveBeenCalledWith('solana:devnet');
      expect(solProvider).toBe(mockSolProvider);
    });

    it('should use default networkId when not provided', async () => {
      const mockSolProvider = { signMessage: jest.fn() };
      mockConnector.getSolanaProvider.mockResolvedValue(mockSolProvider);

      const { result } = renderHook(() => usePhantomConnector());
      await result.current.getSolanaProvider();

      expect(mockConnector.getSolanaProvider).toHaveBeenCalledWith(undefined);
    });

    it('should throw error when no connector available', async () => {
      mockUsePhantom.mockReturnValue({
        provider: null,
        providerType: 'embedded',
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        accounts: [],
        isConnected: false,
      });

      const { result } = renderHook(() => usePhantomConnector());

      await expect(result.current.getSolanaProvider()).rejects.toThrow(
        'No connector available - wallet not connected'
      );
    });
  });

  describe('getSupportedChains', () => {
    beforeEach(() => {
      mockUsePhantom.mockReturnValue({
        provider: mockProvider,
        providerType: 'embedded',
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        accounts: [],
        isConnected: true,
      });
    });

    it('should return supported chains from connector', () => {
      const mockChains = [
        { chainType: 'solana', networkId: 'solana:mainnet-beta', name: 'Solana', isActive: true },
        { chainType: 'ethereum', networkId: 'eip155:1', chainId: 1, name: 'Ethereum', isActive: true },
      ];
      mockConnector.getSupportedChains.mockReturnValue(mockChains);

      const { result } = renderHook(() => usePhantomConnector());
      const chains = result.current.getSupportedChains();

      expect(mockConnector.getSupportedChains).toHaveBeenCalled();
      expect(chains).toBe(mockChains);
    });

    it('should return empty array when no connector', () => {
      mockUsePhantom.mockReturnValue({
        provider: null,
        providerType: 'embedded',
        connect: jest.fn(),
        disconnect: jest.fn(),
        signMessage: jest.fn(),
        signAndSendTransaction: jest.fn(),
        accounts: [],
        isConnected: false,
      });

      const { result } = renderHook(() => usePhantomConnector());
      const chains = result.current.getSupportedChains();

      expect(chains).toEqual([]);
    });
  });

  it('should memoize connector instance', () => {
    const phantomContext = {
      provider: mockProvider,
      providerType: 'embedded',
      connect: jest.fn(),
      disconnect: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
      accounts: [],
      isConnected: true,
    };

    mockUsePhantom.mockReturnValue(phantomContext);

    const { result, rerender } = renderHook(() => usePhantomConnector());
    const firstConnector = result.current.connector;

    rerender();
    const secondConnector = result.current.connector;

    expect(firstConnector).toBe(secondConnector);
    expect(MockedPhantomConnector).toHaveBeenCalledTimes(1);
  });
});