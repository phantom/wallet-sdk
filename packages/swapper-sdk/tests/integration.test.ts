import { SwapperSDK, NetworkId, TOKENS } from "../src";

describe("SwapperSDK Integration Tests", () => {
  let sdk: SwapperSDK;
  
  // Test addresses with funds
  const EVM_ADDRESS = "0x97b9d2102a9a65a26e1ee82d59e42d1b73b68689";
  const SOLANA_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"; // Binance

  beforeAll(() => {
    sdk = new SwapperSDK({
      apiUrl: "https://api.phantom.app",
      options: {
        debug: true,
      },
    });
  });

  describe("Solana Swaps", () => {
    it("should get quotes for SOL to USDC swap", async () => {
      const quotes = await sdk.getQuotes({
        sellToken: TOKENS.SOLANA_MAINNET.SOL,
        buyToken: TOKENS.SOLANA_MAINNET.USDC,
        sellAmount: "100000000", // 0.1 SOL
        from: {
          address: SOLANA_ADDRESS,
          networkId: NetworkId.SOLANA_MAINNET,
        },
        slippageTolerance: 0.5,
      });

      expect(quotes).toBeDefined();
      expect(quotes.type).toBe("solana");
      expect(quotes.quotes).toBeDefined();
      expect(Array.isArray(quotes.quotes)).toBe(true);
      expect(quotes.quotes.length).toBeGreaterThan(0);

      const firstQuote = quotes.quotes[0];
      expect(firstQuote.sellAmount).toBeDefined();
      expect(firstQuote.buyAmount).toBeDefined();
      expect(firstQuote.baseProvider).toBeDefined();
    }, 30000);

    it("should get quotes for USDC to SOL swap", async () => {
      const quotes = await sdk.getQuotes({
        sellToken: TOKENS.SOLANA_MAINNET.USDC,
        buyToken: TOKENS.SOLANA_MAINNET.SOL,
        sellAmount: "1000000", // 1 USDC
        from: {
          address: SOLANA_ADDRESS,
          networkId: NetworkId.SOLANA_MAINNET,
        },
        slippageTolerance: 0.5,
      });

      expect(quotes).toBeDefined();
      expect(quotes.type).toBe("solana");
      expect(quotes.quotes).toBeDefined();
      expect(Array.isArray(quotes.quotes)).toBe(true);
    }, 30000);
  });

  describe("Ethereum Swaps", () => {
    it("should get quotes for ETH to USDC swap", async () => {
      const quotes = await sdk.getQuotes({
        sellToken: TOKENS.ETHEREUM_MAINNET.ETH,
        buyToken: TOKENS.ETHEREUM_MAINNET.USDC,
        sellAmount: "1000000000000000000", // 1 ETH
        from: {
          address: EVM_ADDRESS,
          networkId: NetworkId.ETHEREUM_MAINNET,
        },
        slippageTolerance: 0.5,
      });

      expect(quotes).toBeDefined();
      expect(quotes.type).toBe("eip155");
      expect(quotes.quotes).toBeDefined();
      expect(Array.isArray(quotes.quotes)).toBe(true);
      expect(quotes.quotes.length).toBeGreaterThan(0);

      const firstQuote = quotes.quotes[0] as any;
      expect(firstQuote.gas).toBeDefined();
      expect(firstQuote.transactionData).toBeDefined();
      expect(firstQuote.exchangeAddress).toBeDefined();
    }, 30000);

    it("should get quotes for USDC to WETH swap", async () => {
      const quotes = await sdk.getQuotes({
        sellToken: TOKENS.ETHEREUM_MAINNET.USDC,
        buyToken: TOKENS.ETHEREUM_MAINNET.WETH,
        sellAmount: "1000000000", // 1000 USDC
        from: {
          address: EVM_ADDRESS,
          networkId: NetworkId.ETHEREUM_MAINNET,
        },
        slippageTolerance: 0.5,
      });

      expect(quotes).toBeDefined();
      expect(quotes.type).toBe("eip155");
      expect(quotes.quotes.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Base Swaps", () => {
    it("should get quotes for ETH to USDC swap on Base", async () => {
      const quotes = await sdk.getQuotes({
        sellToken: TOKENS.BASE_MAINNET.ETH,
        buyToken: TOKENS.BASE_MAINNET.USDC,
        sellAmount: "100000000000000000", // 0.1 ETH
        from: {
          address: EVM_ADDRESS,
          networkId: NetworkId.BASE_MAINNET,
        },
        slippageTolerance: 0.5,
      });

      expect(quotes).toBeDefined();
      expect(quotes.type).toBe("eip155");
      expect(quotes.quotes.length).toBeGreaterThan(0);

      const firstQuote = quotes.quotes[0];
      expect(firstQuote.baseProvider).toBeDefined();
      expect(firstQuote.buyAmount).toBeDefined();
    }, 30000);
  });

  describe("Cross-Chain Bridges", () => {
    it("should get bridge quotes from Ethereum to Solana (USDC)", async () => {
      const quotes = await sdk.getQuotes({
        sellToken: TOKENS.ETHEREUM_MAINNET.USDC,
        buyToken: TOKENS.SOLANA_MAINNET.USDC,
        sellAmount: "10000000", // 10 USDC
        from: {
          address: EVM_ADDRESS,
          networkId: NetworkId.ETHEREUM_MAINNET,
        },
        to: {
          address: SOLANA_ADDRESS,
          networkId: NetworkId.SOLANA_MAINNET,
        },
        slippageTolerance: 1.0,
      });

      expect(quotes).toBeDefined();
      expect(quotes.type).toBe("xchain");
      expect(quotes.quotes).toBeDefined();
      
      if (quotes.quotes.length > 0) {
        const firstQuote = quotes.quotes[0] as any;
        expect(firstQuote.steps).toBeDefined();
        expect(Array.isArray(firstQuote.steps)).toBe(true);
      }
    }, 30000);

    it("should get bridge quotes from Base to Solana (USDC)", async () => {
      const quotes = await sdk.getQuotes({
        sellToken: TOKENS.BASE_MAINNET.USDC,
        buyToken: TOKENS.SOLANA_MAINNET.USDC,
        sellAmount: "5000000", // 5 USDC
        from: {
          address: EVM_ADDRESS,
          networkId: NetworkId.BASE_MAINNET,
        },
        to: {
          address: SOLANA_ADDRESS,
          networkId: NetworkId.SOLANA_MAINNET,
        },
        slippageTolerance: 1.0,
      });

      expect(quotes).toBeDefined();
      expect(quotes.type).toBe("xchain");
    }, 30000);

    it("should get bridge quotes from Solana to Ethereum (USDC)", async () => {
      const quotes = await sdk.getQuotes({
        sellToken: TOKENS.SOLANA_MAINNET.USDC,
        buyToken: TOKENS.ETHEREUM_MAINNET.USDC,
        sellAmount: "10000000", // 10 USDC
        from: {
          address: SOLANA_ADDRESS,
          networkId: NetworkId.SOLANA_MAINNET,
        },
        to: {
          address: EVM_ADDRESS,
          networkId: NetworkId.ETHEREUM_MAINNET,
        },
        slippageTolerance: 1.0,
      });

      expect(quotes).toBeDefined();
      expect(quotes.type).toBe("xchain");
    }, 30000);
  });

  describe("SDK Operations", () => {
    it("should initialize a swap session", async () => {
      const result = await sdk.initializeSwap({
        type: "swap",
        network: NetworkId.SOLANA_MAINNET as any, // Will be transformed internally
        address: SOLANA_ADDRESS,
      });

      expect(result).toBeDefined();
    }, 10000);

    it("should get user permissions", async () => {
      const permissions = await sdk.getPermissions();
      
      expect(permissions).toBeDefined();
      expect(permissions.perps).toBeDefined();
      expect(typeof permissions.perps.actions).toBe("boolean");
    }, 10000);

    it("should get list of bridgeable tokens", async () => {
      const response = await sdk.getBridgeableTokens();
      
      expect(response).toBeDefined();
      expect(response.tokens).toBeDefined();
      expect(Array.isArray(response.tokens)).toBe(true);
      expect(response.tokens.length).toBeGreaterThan(0);
      
      const firstToken = response.tokens[0];
      expect(firstToken.chainId).toBeDefined();
      expect(firstToken.resourceType).toBeDefined();
    }, 10000);

    it("should get preferred bridge providers", async () => {
      const response = await sdk.getPreferredBridges();
      
      expect(response).toBeDefined();
      expect(response.providers).toBeDefined();
      expect(Array.isArray(response.providers)).toBe(true);
      
      if (response.providers.length > 0) {
        response.providers.forEach(provider => {
          expect(typeof provider).toBe('string');
        });
      }
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should handle invalid token pairs gracefully", async () => {
      try {
        await sdk.getQuotes({
          sellToken: {
            type: "address",
            address: "0x0000000000000000000000000000000000000000",
            networkId: NetworkId.ETHEREUM_MAINNET,
          },
          buyToken: TOKENS.ETHEREUM_MAINNET.USDC,
          sellAmount: "1000000",
          from: {
            address: EVM_ADDRESS,
            networkId: NetworkId.ETHEREUM_MAINNET,
          },
        });
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    }, 10000);
  });
});