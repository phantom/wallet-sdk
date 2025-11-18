import { isEthereumChain, getChainPrefix, isSolanaChain } from "./network";

describe("Network Utilities", () => {
  describe("isEthereumChain", () => {
    it("should return true for Ethereum mainnet", () => {
      expect(isEthereumChain("eip155:1")).toBe(true);
    });

    it("should return true for Polygon", () => {
      expect(isEthereumChain("eip155:137")).toBe(true);
    });

    it("should return true for Arbitrum", () => {
      expect(isEthereumChain("eip155:42161")).toBe(true);
    });

    it("should return true for Base", () => {
      expect(isEthereumChain("eip155:8453")).toBe(true);
    });

    it("should return true for eip155 with any case", () => {
      expect(isEthereumChain("EIP155:1")).toBe(true);
      expect(isEthereumChain("Eip155:1")).toBe(true);
    });

    it("should return false for Solana mainnet", () => {
      expect(isEthereumChain("solana:mainnet")).toBe(false);
    });

    it("should return false for Solana devnet", () => {
      expect(isEthereumChain("solana:devnet")).toBe(false);
    });

    it("should return false for Bitcoin", () => {
      expect(isEthereumChain("bitcoin:mainnet")).toBe(false);
    });

    it("should return false for Sui", () => {
      expect(isEthereumChain("sui:mainnet")).toBe(false);
    });
  });

  describe("getChainPrefix", () => {
    it("should extract eip155 prefix", () => {
      expect(getChainPrefix("eip155:1")).toBe("eip155");
    });

    it("should extract solana prefix", () => {
      expect(getChainPrefix("solana:mainnet")).toBe("solana");
    });

    it("should extract bitcoin prefix", () => {
      expect(getChainPrefix("bitcoin:mainnet")).toBe("bitcoin");
    });

    it("should extract sui prefix", () => {
      expect(getChainPrefix("sui:mainnet")).toBe("sui");
    });

    it("should lowercase the prefix", () => {
      expect(getChainPrefix("EIP155:1")).toBe("eip155");
      expect(getChainPrefix("SOLANA:MAINNET")).toBe("solana");
    });

    it("should handle network IDs without chain ID", () => {
      expect(getChainPrefix("eip155")).toBe("eip155");
    });
  });

  describe("isSolanaChain", () => {
    it("should return true for Solana mainnet", () => {
      expect(isSolanaChain("solana:mainnet")).toBe(true);
    });

    it("should return true for Solana devnet", () => {
      expect(isSolanaChain("solana:devnet")).toBe(true);
    });

    it("should return false for Ethereum mainnet", () => {
      expect(isSolanaChain("eip155:1")).toBe(false);
    });

    it("should return false for Bitcoin", () => {
      expect(isSolanaChain("bitcoin:mainnet")).toBe(false);
    });
  });
});
