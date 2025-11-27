import { discoverEthereumWallets, discoverSolanaWallets, discoverWallets } from "./discovery";
import { AddressType } from "@phantom/client";

// Mock window and navigator
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  ethereum: undefined as any,
};

const mockNavigator = {
  wallets: undefined as any,
};

// Setup global mocks
beforeEach(() => {
  // @ts-ignore
  global.window = mockWindow;
  // @ts-ignore
  global.navigator = mockNavigator;

  jest.clearAllMocks();
  mockWindow.addEventListener.mockClear();
  mockWindow.removeEventListener.mockClear();
  mockWindow.dispatchEvent.mockClear();
  mockWindow.ethereum = undefined;
  mockNavigator.wallets = undefined;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("discoverEthereumWallets", () => {
  it("should return empty array when window is undefined", async () => {
    // @ts-ignore
    global.window = undefined;

    const wallets = await discoverEthereumWallets();
    expect(wallets).toEqual([]);
  });

  it("should discover wallets via EIP-6963 events", async () => {
    jest.useFakeTimers();

    let announceHandler: ((event: CustomEvent) => void) | null = null;

    // Capture the event handler when it's registered
    mockWindow.addEventListener.mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
      }
    });

    const promise = discoverEthereumWallets();

    // Handler is set up synchronously, so we can call it immediately
    // Simulate wallet announcements
    if (announceHandler) {
      announceHandler({
        detail: {
          info: {
            uuid: "test-uuid-1",
            name: "MetaMask",
            icon: "https://metamask.io/icon.png",
            rdns: "io.metamask",
          },
          provider: {},
        },
      } as CustomEvent);

      announceHandler({
        detail: {
          info: {
            uuid: "test-uuid-2",
            name: "Coinbase Wallet",
            icon: "https://coinbase.com/icon.png",
            rdns: "com.coinbase.wallet",
          },
          provider: {},
        },
      } as CustomEvent);
    }

    // Fast-forward time to trigger setTimeout
    jest.advanceTimersByTime(100);

    const result = await promise;

    expect(mockWindow.addEventListener).toHaveBeenCalledWith(
      "eip6963:announceProvider",
      expect.any(Function)
    );
    expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "eip6963:requestProvider" })
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "metamask-io",
      name: "MetaMask",
      icon: "https://metamask.io/icon.png",
      addressTypes: [AddressType.ethereum],
    });
    expect(result[1]).toMatchObject({
      id: "wallet-com-coinbase",
      name: "Coinbase Wallet",
      icon: "https://coinbase.com/icon.png",
      addressTypes: [AddressType.ethereum],
    });

    expect(mockWindow.removeEventListener).toHaveBeenCalled();
  });

  it("should use wallet name as ID when rdns is not available", async () => {
    let announceHandler: ((event: CustomEvent) => void) | null = null;

    mockWindow.addEventListener.mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
      }
    });

    const promise = discoverEthereumWallets();

    await new Promise(resolve => setTimeout(resolve, 10));

    if (announceHandler) {
      announceHandler({
        detail: {
          info: {
            uuid: "test-uuid",
            name: "My Custom Wallet",
            icon: "https://example.com/icon.png",
            rdns: "", // No rdns
          },
          provider: {},
        },
      } as CustomEvent);
    }

    const result = await promise;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("my-custom-wallet");
    expect(result[0].name).toBe("My Custom Wallet");
  });

  it("should fallback to legacy window.ethereum when no EIP-6963 providers found", async () => {
    mockWindow.ethereum = {
      providerName: "Legacy Wallet",
      request: jest.fn(),
    };

    const result = await discoverEthereumWallets();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "legacy-wallet",
      name: "Legacy Wallet",
      addressTypes: [AddressType.ethereum],
    });
  });

  it("should use provider.name as fallback when providerName is not available", async () => {
    mockWindow.ethereum = {
      name: "Provider Name",
      request: jest.fn(),
    };

    const result = await discoverEthereumWallets();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Provider Name");
    expect(result[0].id).toBe("provider-name");
  });

  it("should use default name when no provider info is available", async () => {
    mockWindow.ethereum = {
      request: jest.fn(),
    };

    const result = await discoverEthereumWallets();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Ethereum Wallet");
    expect(result[0].id).toBe("ethereum");
  });

  it("should not use legacy fallback when EIP-6963 providers are found", async () => {
    let announceHandler: ((event: CustomEvent) => void) | null = null;

    mockWindow.addEventListener.mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
      }
    });

    mockWindow.ethereum = {
      providerName: "Legacy Wallet",
      request: jest.fn(),
    };

    const promise = discoverEthereumWallets();

    await new Promise(resolve => setTimeout(resolve, 10));

    if (announceHandler) {
      announceHandler({
        detail: {
          info: {
            uuid: "test-uuid",
            name: "EIP6963 Wallet",
            icon: "https://example.com/icon.png",
            rdns: "com.example.wallet",
          },
          provider: {},
        },
      } as CustomEvent);
    }

    const result = await promise;

    // Should only have the EIP-6963 wallet, not the legacy one
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("EIP6963 Wallet");
  });
});

describe("discoverSolanaWallets", () => {
  it("should return empty array when window is undefined", async () => {
    // @ts-ignore
    global.window = undefined;

    const wallets = await discoverSolanaWallets();
    expect(wallets).toEqual([]);
  });

  it("should return empty array when navigator is undefined", async () => {
    // @ts-ignore
    global.navigator = undefined;

    const wallets = await discoverSolanaWallets();
    expect(wallets).toEqual([]);
  });

  it("should discover wallets via Wallet Standard getWallets API", async () => {
    const mockWallets = [
      {
        name: "Backpack",
        icon: "https://backpack.app/icon.png",
        version: "1.0.0",
        chains: ["solana:mainnet", "solana:devnet"],
        features: ["standard:connect"],
        accounts: [],
      },
      {
        name: "Solflare",
        icon: "https://solflare.com/icon.png",
        version: "1.0.0",
        chains: ["solana:mainnet"],
        features: ["standard:connect"],
        accounts: [],
      },
    ];

    mockNavigator.wallets = {
      getWallets: jest.fn().mockResolvedValue(mockWallets),
    };

    const wallets = await discoverSolanaWallets();

    expect(mockNavigator.wallets.getWallets).toHaveBeenCalled();
    expect(wallets).toHaveLength(2);
    expect(wallets[0]).toMatchObject({
      id: "backpack",
      name: "Backpack",
      icon: "https://backpack.app/icon.png",
      addressTypes: [AddressType.solana],
      chains: ["solana:mainnet", "solana:devnet"],
    });
    expect(wallets[1]).toMatchObject({
      id: "solflare",
      name: "Solflare",
      icon: "https://solflare.com/icon.png",
      addressTypes: [AddressType.solana],
      chains: ["solana:mainnet"],
    });
  });

  it("should skip wallets that don't support Solana chains", async () => {
    const mockWallets = [
      {
        name: "Solana Wallet",
        icon: "https://example.com/icon.png",
        version: "1.0.0",
        chains: ["solana:mainnet"],
        features: ["standard:connect"],
        accounts: [],
      },
      {
        name: "Ethereum Only Wallet",
        icon: "https://example.com/icon.png",
        version: "1.0.0",
        chains: ["eip155:1"],
        features: ["standard:connect"],
        accounts: [],
      },
    ];

    mockNavigator.wallets = {
      getWallets: jest.fn().mockResolvedValue(mockWallets),
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].name).toBe("Solana Wallet");
  });

  it("should skip Phantom wallets", async () => {
    const mockWallets = [
      {
        name: "Phantom",
        icon: "https://phantom.app/icon.png",
        version: "1.0.0",
        chains: ["solana:mainnet"],
        features: ["standard:connect"],
        accounts: [],
      },
      {
        name: "Backpack",
        icon: "https://backpack.app/icon.png",
        version: "1.0.0",
        chains: ["solana:mainnet"],
        features: ["standard:connect"],
        accounts: [],
      },
    ];

    mockNavigator.wallets = {
      getWallets: jest.fn().mockResolvedValue(mockWallets),
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].name).toBe("Backpack");
  });

  it("should use default chains when wallet doesn't specify Solana chains", async () => {
    const mockWallets = [
      {
        name: "Generic Wallet",
        icon: "https://example.com/icon.png",
        version: "1.0.0",
        chains: ["solana"], // Just "solana" without network
        features: ["standard:connect"],
        accounts: [],
      },
    ];

    mockNavigator.wallets = {
      getWallets: jest.fn().mockResolvedValue(mockWallets),
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].chains).toEqual(["solana"]);
  });

  it("should handle errors gracefully when getWallets fails", async () => {
    mockNavigator.wallets = {
      getWallets: jest.fn().mockRejectedValue(new Error("API not available")),
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toEqual([]);
  });

  it("should return empty array when wallets API is not available", async () => {
    mockNavigator.wallets = undefined;

    const wallets = await discoverSolanaWallets();

    expect(wallets).toEqual([]);
  });

  it("should return empty array when getWallets is not a function", async () => {
    mockNavigator.wallets = {
      getWallets: "not a function",
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toEqual([]);
  });
});

describe("discoverWallets", () => {
  it("should merge Solana and Ethereum wallets", async () => {

    // Setup Wallet Standard
    mockNavigator.wallets = {
      getWallets: jest.fn().mockResolvedValue([
        {
          name: "Backpack",
          icon: "https://backpack.app/icon.png",
          version: "1.0.0",
          chains: ["solana:mainnet"],
          features: ["standard:connect"],
          accounts: [],
        },
      ]),
    };

    // Setup EIP-6963 - capture handler when it's registered
    let announceHandler: ((event: CustomEvent) => void) | null = null;

    mockWindow.addEventListener.mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
        // Call handler immediately after it's registered to simulate wallet announcement
        setTimeout(() => {
          if (announceHandler) {
            announceHandler({
              detail: {
                info: {
                  uuid: "test-uuid",
                  name: "MetaMask",
                  icon: "https://metamask.io/icon.png",
                  rdns: "io.metamask",
                },
                provider: {},
              },
            } as CustomEvent);
          }
        }, 0);
      }
    });

    // Wait for the promise to resolve (real timers handle the setTimeout)
    const result = await discoverWallets();

    expect(result).toHaveLength(2);
    expect(result.find(w => w.id === "backpack")).toBeDefined();
    expect(result.find(w => w.id === "metamask-io")).toBeDefined();
  });

  it("should merge multi-chain wallets", async () => {

    // Setup Wallet Standard with a wallet that supports Solana
    mockNavigator.wallets = {
      getWallets: jest.fn().mockResolvedValue([
        {
          name: "Multi Chain Wallet",
          icon: "https://example.com/icon.png",
          version: "1.0.0",
          chains: ["solana:mainnet"],
          features: ["standard:connect"],
          accounts: [],
        },
      ]),
    };

    // Setup EIP-6963 with the same wallet (different ID but same name)
    let announceHandler: ((event: CustomEvent) => void) | null = null;

    mockWindow.addEventListener.mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
        setTimeout(() => {
          if (announceHandler) {
            announceHandler({
              detail: {
                info: {
                  uuid: "test-uuid",
                  name: "Multi Chain Wallet",
                  icon: "https://example.com/icon.png",
                  rdns: "com.example.multichain",
                },
                provider: {},
              },
            } as CustomEvent);
          }
        }, 0);
      }
    });

    const result = await discoverWallets();

    // Should have two separate entries since IDs are different
    expect(result).toHaveLength(2);
  });

  it("should merge wallets with same ID from different sources", async () => {

    // Setup Wallet Standard
    mockNavigator.wallets = {
      getWallets: jest.fn().mockResolvedValue([
        {
          name: "Test Wallet",
          icon: "https://example.com/icon1.png",
          version: "1.0.0",
          chains: ["solana:mainnet"],
          features: ["standard:connect"],
          accounts: [],
        },
      ]),
    };

    // Setup EIP-6963 with wallet that will have same ID
    let announceHandler: ((event: CustomEvent) => void) | null = null;

    mockWindow.addEventListener.mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
        setTimeout(() => {
          if (announceHandler) {
            announceHandler({
              detail: {
                info: {
                  uuid: "test-uuid",
                  name: "Test Wallet",
                  icon: "https://example.com/icon2.png",
                  rdns: "", // Will use name-based ID
                },
                provider: {},
              },
            } as CustomEvent);
          }
        }, 0);
      }
    });

    const result = await discoverWallets();

    // Should merge into one wallet with both address types
    expect(result).toHaveLength(1);
    expect(result[0].addressTypes).toContain(AddressType.solana);
    expect(result[0].addressTypes).toContain(AddressType.ethereum);
    expect(result[0].chains).toContain("solana:mainnet");
    expect(result[0].chains).toContain("eip155:1");
  });

  it("should return empty array when no wallets are discovered", async () => {

    mockNavigator.wallets = {
      getWallets: jest.fn().mockResolvedValue([]),
    };

    const result = await discoverWallets();

    expect(result).toEqual([]);
  });
});

