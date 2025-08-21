import { renderHook } from '@testing-library/react';
import { usePhantomConnector } from './usePhantomConnector';
import { usePhantom } from '../PhantomProvider';
import { PhantomConnector } from '@phantom/phantom-connector';
import { NetworkId } from '@phantom/constants';

// Mock dependencies
jest.mock('../PhantomProvider');
jest.mock('@phantom/phantom-connector');

const mockUsePhantom = usePhantom as jest.MockedFunction<typeof usePhantom>;
const MockedPhantomConnector = PhantomConnector as jest.MockedClass<typeof PhantomConnector>;

describe('usePhantomConnector', () => {
  let mockProvider: any;
  let mockSdk: any;
  let mockConnector: any;

  beforeEach(() => {
    mockProvider = {
      getAddresses: jest.fn(),
      isConnected: jest.fn(),
      signMessage: jest.fn(),
      signAndSendTransaction: jest.fn(),
    };

    mockSdk = {
      getCurrentProvider: jest.fn().mockReturnValue(mockProvider),
      isConnected: jest.fn().mockReturnValue(true),
      getAddresses: jest.fn().mockResolvedValue([]),
      getWalletId: jest.fn().mockReturnValue('mock-wallet-id'),
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
    mockUsePhantom.mockReturnValue(undefined);

    expect(() => {
      renderHook(() => usePhantomConnector());
    }).toThrow('usePhantomConnector must be used within a PhantomProvider');
  });

  it('should return null connector when no sdk', () => {
    mockUsePhantom.mockReturnValue({
      sdk: null as any,
      isConnected: false,
      addresses: [],
      walletId: null,
      error: null,
      currentProviderType: null,
      isPhantomAvailable: false,
      updateConnectionState: jest.fn(),
    });

    const { result } = renderHook(() => usePhantomConnector());

    expect(result.current.connector).toBeNull();
  });

  it('should create connector for embedded provider', () => {
    mockUsePhantom.mockReturnValue({
      sdk: mockSdk,
      isConnected: true,
      addresses: [],
      walletId: 'mock-wallet-id',
      error: null,
      currentProviderType: 'embedded',
      isPhantomAvailable: true,
      updateConnectionState: jest.fn(),
    });

    const { result } = renderHook(() => usePhantomConnector());

    expect(MockedPhantomConnector).toHaveBeenCalledWith(mockProvider, 'embedded');
    expect(result.current.connector).toBe(mockConnector);
  });

  it('should create connector for injected provider', () => {
    mockUsePhantom.mockReturnValue({
      sdk: mockSdk,
      isConnected: true,
      addresses: [],
      walletId: 'mock-wallet-id',
      error: null,
      currentProviderType: 'injected',
      isPhantomAvailable: true,
      updateConnectionState: jest.fn(),
    });

    renderHook(() => usePhantomConnector());

    expect(MockedPhantomConnector).toHaveBeenCalledWith(mockProvider, 'injected');
  });

  describe('getEthereumProvider', () => {
    beforeEach(() => {
      mockUsePhantom.mockReturnValue({
        sdk: mockSdk,
        isConnected: true,
        addresses: [],
        walletId: 'mock-wallet-id',
        error: null,
        currentProviderType: 'embedded',
        isPhantomAvailable: true,
        updateConnectionState: jest.fn(),
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
        sdk: mockSdk,
        isConnected: true,
        addresses: [],
        walletId: 'mock-wallet-id',
        error: null,
        currentProviderType: 'embedded',
        isPhantomAvailable: true,
        updateConnectionState: jest.fn(),
      });
    });

    it('should call connector.getSolanaProvider with networkId', async () => {
      const mockSolProvider = { signMessage: jest.fn() };
      mockConnector.getSolanaProvider.mockResolvedValue(mockSolProvider);

      const { result } = renderHook(() => usePhantomConnector());
      const solProvider = await result.current.getSolanaProvider(NetworkId.SOLANA_DEVNET);

      expect(mockConnector.getSolanaProvider).toHaveBeenCalledWith(NetworkId.SOLANA_DEVNET);
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
        sdk: mockSdk,
        isConnected: true,
        addresses: [],
        walletId: 'mock-wallet-id',
        error: null,
        currentProviderType: 'embedded',
        isPhantomAvailable: true,
        updateConnectionState: jest.fn(),
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
      sdk: mockSdk,
      isConnected: true,
      addresses: [],
      walletId: 'mock-wallet-id',
      error: null,
      currentProviderType: 'embedded',
      isPhantomAvailable: true,
      updateConnectionState: jest.fn(),
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