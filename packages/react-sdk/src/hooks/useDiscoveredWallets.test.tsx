import { renderHook, waitFor } from "@testing-library/react";
import { useDiscoveredWallets } from "./useDiscoveredWallets";
import { PhantomProvider } from "../PhantomProvider";
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";
import type { InjectedWalletInfo } from "@phantom/browser-sdk";

// Mock BrowserSDK
jest.mock("@phantom/browser-sdk", () => {
  const actual = jest.requireActual("@phantom/browser-sdk");
  return {
    ...actual,
    BrowserSDK: jest.fn(),
  };
});

const MockBrowserSDK = BrowserSDK as jest.MockedClass<typeof BrowserSDK>;

describe("useDiscoveredWallets", () => {
  let mockSDK: {
    getDiscoveredWallets: jest.Mock;
    discoverWallets: jest.Mock;
    on: jest.Mock;
    off: jest.Mock;
    configureDebug: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSDK = {
      getDiscoveredWallets: jest.fn(),
      discoverWallets: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      configureDebug: jest.fn(),
    };

    MockBrowserSDK.mockImplementation(() => mockSDK as any);
  });

  const createWrapper = (config?: any) => {
    const defaultConfig = {
      providers: ["injected"],
      addressTypes: [AddressType.solana],
      ...config,
    };

    return ({ children }: { children: React.ReactNode }) => (
      <PhantomProvider config={defaultConfig}>{children}</PhantomProvider>
    );
  };

  it("should fetch discovered wallets when SDK is available", async () => {
    const mockWallets: InjectedWalletInfo[] = [
      {
        id: "metamask-io",
        name: "MetaMask",
        icon: "https://metamask.io/icon.png",
        addressTypes: [AddressType.ethereum],
      },
      {
        id: "backpack",
        name: "Backpack",
        icon: "https://backpack.app/icon.png",
        addressTypes: [AddressType.solana],
      },
    ];

    // Mock to return wallets immediately (discovery already complete)
    mockSDK.getDiscoveredWallets.mockReturnValue(mockWallets);

    const { result } = renderHook(() => useDiscoveredWallets(), {
      wrapper: createWrapper(),
    });

    // If wallets are available immediately, loading should be false quickly
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 1000 },
    );

    expect(result.current.wallets).toEqual(mockWallets);
    expect(result.current.error).toBe(null);
    expect(mockSDK.getDiscoveredWallets).toHaveBeenCalled();
  });

  it("should handle errors when fetching wallets fails", async () => {
    mockSDK.getDiscoveredWallets.mockImplementation(() => {
      throw new Error("Failed to get wallets");
    });

    const { result } = renderHook(() => useDiscoveredWallets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wallets).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Failed to get wallets");
  });

  it("should provide a refetch function", async () => {
    const mockWallets: InjectedWalletInfo[] = [
      {
        id: "metamask-io",
        name: "MetaMask",
        addressTypes: [AddressType.ethereum],
      },
    ];

    mockSDK.getDiscoveredWallets.mockReturnValue(mockWallets);

    const { result } = renderHook(() => useDiscoveredWallets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wallets).toEqual(mockWallets);

    // Update mock to return different wallets
    const updatedWallets: InjectedWalletInfo[] = [
      {
        id: "coinbase-wallet",
        name: "Coinbase Wallet",
        addressTypes: [AddressType.ethereum],
      },
    ];
    mockSDK.getDiscoveredWallets.mockReturnValue(updatedWallets);

    // Call refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.wallets).toEqual(updatedWallets);
    });
  });

  it("should set loading state during fetch and use discoverWallets when no wallets found", async () => {
    // Mock to return empty initially, then discoverWallets returns wallets
    const discoveredWallets = [
      {
        id: "test-wallet",
        name: "Test Wallet",
        addressTypes: [AddressType.solana],
      },
    ];
    mockSDK.getDiscoveredWallets.mockReturnValue([]);
    mockSDK.discoverWallets.mockImplementation(() => {
      // After discoverWallets is called, getDiscoveredWallets should return the wallets
      mockSDK.getDiscoveredWallets.mockReturnValue(discoveredWallets);
      return Promise.resolve(discoveredWallets);
    });

    const { result } = renderHook(() => useDiscoveredWallets(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 1000 },
    );

    expect(result.current.wallets).toHaveLength(1);
    expect(result.current.wallets[0].id).toBe("test-wallet");
    expect(mockSDK.discoverWallets).toHaveBeenCalled();
  });

  it("should handle empty wallets array", async () => {
    mockSDK.getDiscoveredWallets.mockReturnValue([]);
    mockSDK.discoverWallets.mockResolvedValue([]);

    const { result } = renderHook(() => useDiscoveredWallets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wallets).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(mockSDK.discoverWallets).toHaveBeenCalled();
  });

  it("should clear wallets and error when SDK becomes unavailable", async () => {
    const mockWallets: InjectedWalletInfo[] = [
      {
        id: "metamask-io",
        name: "MetaMask",
        addressTypes: [AddressType.ethereum],
      },
    ];

    mockSDK.getDiscoveredWallets.mockReturnValue(mockWallets);

    const { result } = renderHook(() => useDiscoveredWallets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.wallets).toEqual(mockWallets);
    });

    mockSDK.getDiscoveredWallets.mockImplementation(() => {
      throw new Error("SDK unavailable");
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.wallets).toEqual([]);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
