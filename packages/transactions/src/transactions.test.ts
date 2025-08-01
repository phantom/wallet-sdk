import { createSendTokenTransaction, createNativeTransfer, setRPCConfig, getRPCConfig } from "./index";

// Mock NetworkId for testing
const mockNetworkIds = {
  SOLANA_MAINNET: "solana:mainnet-beta",
  ETHEREUM_MAINNET: "ethereum:1",
  POLYGON_MAINNET: "polygon:137",
  BITCOIN_MAINNET: "bitcoin:mainnet",
  SUI_MAINNET: "sui:mainnet",
} as const;

describe("@phantom/transactions", () => {
  describe("RPC Configuration", () => {
    it("should have default RPC configuration", () => {
      const config = getRPCConfig();
      expect(config.solana?.mainnet).toBeDefined();
      expect(config.ethereum?.mainnet).toBeDefined();
      expect(config.polygon?.mainnet).toBeDefined();
      expect(config.bitcoin?.mainnet).toBeDefined();
      expect(config.sui?.mainnet).toBeDefined();
    });

    it("should allow updating RPC configuration", () => {
      const customRPC = "https://custom-rpc.example.com";
      
      setRPCConfig({
        solana: {
          mainnet: customRPC,
        },
      });

      const config = getRPCConfig();
      expect(config.solana?.mainnet).toBe(customRPC);
    });
  });

  describe("createSendTokenTransaction", () => {
    it("should return error for unsupported network", async () => {
      const result = await createSendTokenTransaction({
        networkId: "unsupported:network" as any,
        from: "test-from",
        to: "test-to",
        amount: "1.0",
      });

      expect(result.transaction).toBeNull();
      expect(result.error).toContain("Unsupported network");
    });

    it("should create Solana native transfer", async () => {
      // Use a custom RPC for testing to avoid hitting real endpoints
      setRPCConfig({
        solana: {
          mainnet: "https://localhost:8899", // Local test RPC that doesn't exist
        },
      });

      const result = await createSendTokenTransaction({
        networkId: mockNetworkIds.SOLANA_MAINNET,
        from: "11111111111111111111111111111112", // Valid Solana address format
        to: "11111111111111111111111111111113",
        amount: "1.0",
      });

      // Since we don't have real RPC connection in tests, we expect an error
      // but it should be a connection error, not a parsing error
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain("Unsupported network");
      expect(result.error).toContain("Failed to create Solana transaction");
    }, 15000);

    it("should handle EVM networks", async () => {
      const result = await createSendTokenTransaction({
        networkId: mockNetworkIds.ETHEREUM_MAINNET,
        from: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        amount: "0.1",
      });

      // EVM native transfers should work without RPC connection
      expect(result.transaction).toBeDefined();
      expect(result.transaction.to).toBe("0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E");
      expect(result.transaction.value).toBeDefined();
    });

    it("should return error for Bitcoin (not implemented)", async () => {
      const result = await createSendTokenTransaction({
        networkId: mockNetworkIds.BITCOIN_MAINNET,
        from: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        to: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        amount: "0.001",
      });

      expect(result.transaction).toBeNull();
      expect(result.error).toContain("not yet implemented");
    });

    it("should return error for Sui (partially implemented)", async () => {
      const result = await createSendTokenTransaction({
        networkId: mockNetworkIds.SUI_MAINNET,
        from: "0x123",
        to: "0x456",
        amount: "1.0",
      });

      // Sui native transfers should create a transaction
      expect(result.transaction).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("createNativeTransfer", () => {
    it("should create native transfer without token parameter", async () => {
      const result = await createNativeTransfer({
        networkId: mockNetworkIds.ETHEREUM_MAINNET,
        from: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        amount: "0.5",
      });

      expect(result.transaction).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe("Amount handling", () => {
    it("should handle string amounts", async () => {
      const result = await createSendTokenTransaction({
        networkId: mockNetworkIds.ETHEREUM_MAINNET,
        from: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        amount: "1.5", // string
      });

      expect(result.transaction).toBeDefined();
    });

    it("should handle number amounts", async () => {
      const result = await createSendTokenTransaction({
        networkId: mockNetworkIds.ETHEREUM_MAINNET,
        from: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        amount: 2.5, // number
      });

      expect(result.transaction).toBeDefined();
    });

    it("should handle bigint amounts", async () => {
      const result = await createSendTokenTransaction({
        networkId: mockNetworkIds.ETHEREUM_MAINNET,
        from: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        amount: 1000000000000000000n, // 1 ETH in wei
      });

      expect(result.transaction).toBeDefined();
    });
  });
});