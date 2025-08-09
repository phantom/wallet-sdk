import { SwapperSDK } from "../src/swapper-sdk";
import { NetworkId } from "../src/types/networks";

describe("SwapperSDK", () => {
  let sdk: SwapperSDK;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    sdk = new SwapperSDK({
      apiUrl: "https://api.test.com",
      options: {
        debug: false,
      },
    });
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const defaultSdk = new SwapperSDK();
      expect(defaultSdk).toBeDefined();
    });

    it("should initialize with custom config", () => {
      const customSdk = new SwapperSDK({
        apiUrl: "https://custom.api.com",
        options: {
          organizationId: "test-org",
          countryCode: "US",
          debug: true,
        },
      });
      expect(customSdk).toBeDefined();
    });
  });

  describe("getQuotes", () => {
    it("should fetch quotes successfully", async () => {
      const mockResponse = {
        type: "solana",
        quotes: [],
        taker: {
          chainId: "solana:101",
          resourceType: "address" as const,
          address: "test-address",
        },
        buyToken: {
          chainId: "solana:101",
          resourceType: "address" as const,
          address: "buy-token",
        },
        sellToken: {
          chainId: "solana:101",
          resourceType: "nativeToken" as const,
          slip44: "501",
        },
        slippageTolerance: 0.5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await sdk.getQuotes({
        sellToken: {
          type: "native",
          networkId: NetworkId.SOLANA_MAINNET,
        },
        buyToken: {
          type: "address",
          address: "buy-token",
          networkId: NetworkId.SOLANA_MAINNET,
        },
        sellAmount: "1000000000",
        from: {
          address: "test-address",
          networkId: NetworkId.SOLANA_MAINNET,
        },
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when fetching quotes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: "INVALID_TOKEN_PAIR",
          message: "Tokens not swappable",
        }),
      } as Response);

      await expect(
        sdk.getQuotes({
          sellToken: {
            type: "native",
            networkId: NetworkId.SOLANA_MAINNET,
          },
          buyToken: {
            type: "address",
            address: "buy-token",
            networkId: NetworkId.SOLANA_MAINNET,
          },
          sellAmount: "1000000000",
          from: {
            address: "test-address",
            networkId: NetworkId.SOLANA_MAINNET,
          },
        })
      ).rejects.toMatchObject({
        code: "INVALID_TOKEN_PAIR",
        message: "Tokens not swappable",
        statusCode: 400,
      });
    });
  });

  describe("initializeSwap", () => {
    it("should initialize swap successfully", async () => {
      const mockResponse = {
        buyToken: {
          address: "token-address",
          chainId: "solana:101",
          symbol: "USDC",
          name: "USD Coin",
          decimals: 6,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await sdk.initializeSwap({
        type: "swap",
        network: "solana:101" as any,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getPermissions", () => {
    it("should fetch permissions successfully", async () => {
      const mockResponse = {
        perps: {
          actions: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await sdk.getPermissions();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getBridgeableTokens", () => {
    it("should fetch bridgeable tokens successfully", async () => {
      const mockResponse = {
        tokens: [
          {
            chainId: "solana:101",
            resourceType: "address" as const,
            address: "token1",
          },
          {
            chainId: "eip155:1",
            resourceType: "address" as const,
            address: "token2",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await sdk.getBridgeableTokens();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateHeaders", () => {
    it("should update headers", () => {
      expect(() => {
        sdk.updateHeaders({
          "X-Custom-Header": "value",
        });
      }).not.toThrow();
    });
  });
});