import { discoverEthereumWallets, discoverSolanaWallets, discoverWallets } from "./discovery";
import { AddressType } from "@phantom/client";

// Setup global mocks
beforeEach(() => {
  // jsdom provides window, so we mock its methods instead of replacing it
  if (typeof window !== "undefined") {
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
    window.dispatchEvent = jest.fn();
  }

  if (typeof navigator !== "undefined") {
    // @ts-ignore
    navigator.wallets = undefined;
  }

  jest.clearAllMocks();
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
    jest.useRealTimers();

    let announceHandler: ((event: CustomEvent) => void) | null = null;

    // Capture the event handler when it's registered
    (window.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
      }
    });

    const promise = discoverEthereumWallets();

    // Wait a bit for the handler to be set up
    await new Promise(resolve => setTimeout(resolve, 10));

    // Simulate wallet announcements
    if (announceHandler) {
      const handler = announceHandler as (event: CustomEvent) => void;
      handler({
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

      handler({
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

    // Wait for the 400ms timeout in discoverEthereumWallets
    await new Promise(resolve => setTimeout(resolve, 400));

    const result = await promise;

    expect(window.addEventListener).toHaveBeenCalledWith("eip6963:announceProvider", expect.any(Function));
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "eip6963:requestProvider" }));

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "metamask-io",
      name: "MetaMask",
      icon: "https://metamask.io/icon.png",
      addressTypes: [AddressType.ethereum],
      discovery: "eip6963",
      rdns: "io.metamask",
    });
    expect(result[0].providers?.ethereum).toBeDefined();
    expect(result[1]).toMatchObject({
      id: "wallet-coinbase-com",
      name: "Coinbase Wallet",
      icon: "https://coinbase.com/icon.png",
      addressTypes: [AddressType.ethereum],
      discovery: "eip6963",
      rdns: "com.coinbase.wallet",
    });
    expect(result[1].providers?.ethereum).toBeDefined();

    expect(window.removeEventListener).toHaveBeenCalled();
  });

  it("should skip Phantom wallets from EIP-6963 discovery", async () => {
    jest.useRealTimers();

    let announceHandler: ((event: CustomEvent) => void) | null = null;

    (window.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
      }
    });

    const promise = discoverEthereumWallets();

    await new Promise(resolve => setTimeout(resolve, 10));

    if (announceHandler) {
      const handler = announceHandler as (event: CustomEvent) => void;
      // Simulate Phantom announcement
      handler({
        detail: {
          info: {
            uuid: "phantom-uuid",
            name: "Phantom",
            icon: "https://phantom.app/icon.png",
            rdns: "app.phantom",
          },
          provider: {},
        },
      } as CustomEvent);

      // Also test with name variation
      handler({
        detail: {
          info: {
            uuid: "phantom-uuid-2",
            name: "Phantom Wallet",
            icon: "https://phantom.app/icon.png",
            rdns: "com.phantom",
          },
          provider: {},
        },
      } as CustomEvent);

      // Add a non-Phantom wallet to ensure it's still discovered
      handler({
        detail: {
          info: {
            uuid: "metamask-uuid",
            name: "MetaMask",
            icon: "https://metamask.io/icon.png",
            rdns: "io.metamask",
          },
          provider: {},
        },
      } as CustomEvent);
    }

    await new Promise(resolve => setTimeout(resolve, 400));

    const result = await promise;

    // Should only have MetaMask, not Phantom
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("MetaMask");
    expect(result[0].id).toBe("metamask-io");
  });

  it("should use wallet name as ID when rdns is not available", async () => {
    jest.useRealTimers();

    let announceHandler: ((event: CustomEvent) => void) | null = null;

    (window.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
        // Call handler in next tick to simulate wallet announcement
        setTimeout(() => {
          if (announceHandler) {
            const handler = announceHandler as (event: CustomEvent) => void;
            handler({
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
        }, 0);
      }
    });

    const promise = discoverEthereumWallets();

    // Wait for the 400ms timeout in discoverEthereumWallets
    await new Promise(resolve => setTimeout(resolve, 450));

    const result = await promise;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("my-custom-wallet");
    expect(result[0].name).toBe("My Custom Wallet");
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

    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockReturnValue({
        get: () => mockWallets,
      }),
    };

    const wallets = await discoverSolanaWallets();

    expect((navigator as any).wallets.getWallets).toHaveBeenCalled();
    expect(wallets).toHaveLength(2);
    expect(wallets[0]).toMatchObject({
      id: "backpack",
      name: "Backpack",
      icon: "https://backpack.app/icon.png",
      addressTypes: [AddressType.solana],
      discovery: "standard",
    });
    expect(wallets[0].providers?.solana).toBeDefined();
    expect(wallets[1]).toMatchObject({
      id: "solflare",
      name: "Solflare",
      icon: "https://solflare.com/icon.png",
      addressTypes: [AddressType.solana],
      discovery: "standard",
    });
    expect(wallets[1].providers?.solana).toBeDefined();
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

    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockReturnValue({
        get: () => mockWallets,
      }),
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

    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockReturnValue({
        get: () => mockWallets,
      }),
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].name).toBe("Backpack");
  });

  it("should handle wallets with just 'solana' chain identifier", async () => {
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

    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockReturnValue({
        get: () => mockWallets,
      }),
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].name).toBe("Generic Wallet");
  });

  it("should handle errors gracefully when getWallets fails", async () => {
    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockReturnValue({
        get: () => {
          throw new Error("API not available");
        },
      }),
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toEqual([]);
  });

  it("should return empty array when wallets API is not available", async () => {
    // @ts-ignore
    navigator.wallets = undefined;

    const wallets = await discoverSolanaWallets();

    expect(wallets).toEqual([]);
  });

  it("should return empty array when getWallets is not a function", async () => {
    // @ts-ignore
    navigator.wallets = {
      getWallets: "not a function" as any,
    };

    const wallets = await discoverSolanaWallets();

    expect(wallets).toEqual([]);
  });
});

describe("discoverWallets", () => {
  it("should merge Solana and Ethereum wallets", async () => {
    jest.useRealTimers();

    // Setup Wallet Standard
    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockReturnValue({
        get: () => [
          {
            name: "Backpack",
            icon: "https://backpack.app/icon.png",
            version: "1.0.0",
            chains: ["solana:mainnet"],
            features: ["standard:connect"],
            accounts: [],
          },
        ],
      }),
    };

    // Setup EIP-6963 - capture handler when it's registered
    let announceHandler: ((event: CustomEvent) => void) | null = null;

    (window.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
        // Call handler immediately after it's registered to simulate wallet announcement
        setTimeout(() => {
          if (announceHandler) {
            const handler = announceHandler as (event: CustomEvent) => void;
            handler({
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
    const promise = discoverWallets();

    // Wait for the 400ms timeout in discoverEthereumWallets
    await new Promise(resolve => setTimeout(resolve, 450));

    const result = await promise;

    expect(result).toHaveLength(2);
    expect(result.find(w => w.id === "backpack")).toBeDefined();
    expect(result.find(w => w.id === "metamask-io")).toBeDefined();
  });

  it("should merge multi-chain wallets", async () => {
    jest.useRealTimers();

    // Setup Wallet Standard with a wallet that supports Solana
    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockReturnValue({
        get: () => [
          {
            name: "Multi Chain Wallet",
            icon: "https://example.com/icon.png",
            version: "1.0.0",
            chains: ["solana:mainnet"],
            features: ["standard:connect"],
            accounts: [],
          },
        ],
      }),
    };

    // Setup EIP-6963 with the same wallet (different ID but same name)
    let announceHandler: ((event: CustomEvent) => void) | null = null;

    (window.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
        setTimeout(() => {
          if (announceHandler) {
            const handler = announceHandler as (event: CustomEvent) => void;
            handler({
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

    const promise = discoverWallets();

    // Wait for the 400ms timeout in discoverEthereumWallets
    await new Promise(resolve => setTimeout(resolve, 450));

    const result = await promise;

    // Should have two separate entries since IDs are different
    expect(result).toHaveLength(2);
  });

  it("should merge wallets with same ID from different sources", async () => {
    jest.useRealTimers();

    // Setup Wallet Standard
    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockReturnValue({
        get: () => [
          {
            name: "Test Wallet",
            icon: "https://example.com/icon1.png",
            version: "1.0.0",
            chains: ["solana:mainnet"],
            features: ["standard:connect"],
            accounts: [],
          },
        ],
      }),
    };

    // Setup EIP-6963 with wallet that will have same ID
    let announceHandler: ((event: CustomEvent) => void) | null = null;

    (window.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      if (event === "eip6963:announceProvider") {
        announceHandler = handler;
        setTimeout(() => {
          if (announceHandler) {
            const handler = announceHandler as (event: CustomEvent) => void;
            handler({
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

    const promise = discoverWallets();

    // Wait for the 400ms timeout in discoverEthereumWallets
    await new Promise(resolve => setTimeout(resolve, 450));

    const result = await promise;

    // Should merge into one wallet with both address types
    expect(result).toHaveLength(1);
    expect(result[0].addressTypes).toContain(AddressType.solana);
    expect(result[0].addressTypes).toContain(AddressType.ethereum);
  });

  it("should return empty array when no wallets are discovered", async () => {
    // @ts-ignore
    navigator.wallets = {
      getWallets: jest.fn().mockResolvedValue([]),
    };

    const result = await discoverWallets();

    expect(result).toEqual([]);
  });
});
