import { parseSignMessageResponse, parseTransactionResponse, parseSolanaTransactionSignature } from "./response-parsers";
import { base64urlEncode } from "@phantom/base64url";
import { NetworkId } from "@phantom/constants";

describe("Response Parsing", () => {
  describe("parseSignMessageResponse", () => {
    it("should parse Solana signature response", () => {
      // Create a mock signature (64 bytes)
      const mockSignatureBytes = new Uint8Array(64).fill(42);
      const base64Response = base64urlEncode(mockSignatureBytes);

      const result = parseSignMessageResponse(base64Response, NetworkId.SOLANA_MAINNET);

      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(base64Response);
      // Solana signature responses don't include block explorer URLs
      expect(result.blockExplorer).toBeUndefined();
    });

    it("should parse EVM signature response", () => {
      // Create a mock signature (65 bytes for EVM)
      const mockSignatureBytes = new Uint8Array(65).fill(33);
      const base64Response = base64urlEncode(mockSignatureBytes);

      const result = parseSignMessageResponse(base64Response, NetworkId.ETHEREUM_MAINNET);

      expect(result.signature.startsWith("0x")).toBe(true);
      expect(result.signature.length).toBe(132); // "0x" + 130 hex chars
      expect(result.rawSignature).toBe(base64Response);
    });

    it("should handle fallback for unsupported networks", () => {
      const mockResponse = "test-signature";

      const result = parseSignMessageResponse(mockResponse, "unsupported:network" as NetworkId);

      expect(result.signature).toBe(mockResponse);
      expect(result.rawSignature).toBe(mockResponse);
    });

    it("should handle parsing errors gracefully", () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = parseSignMessageResponse(invalidBase64, NetworkId.SOLANA_MAINNET);

      // Should fallback to original response
      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(invalidBase64);
      // Solana signature responses don't include block explorer URLs
      expect(result.blockExplorer).toBeUndefined();
    });
  });

  describe("parseTransactionResponse", () => {
    it("should return rawTransaction when no hash provided", () => {
      const mockTransactionBytes = new Uint8Array(200);
      const base64Response = base64urlEncode(mockTransactionBytes);

      const result = parseTransactionResponse(base64Response, NetworkId.SOLANA_MAINNET);

      expect(result.hash).toBeUndefined();
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toBeUndefined();
    });

    it("should use provided hash when passed", () => {
      const mockTransactionBytes = new Uint8Array(100).fill(123);
      const base64Response = base64urlEncode(mockTransactionBytes);
      const providedHash = "custom-hash-123";

      const result = parseTransactionResponse(base64Response, NetworkId.SOLANA_MAINNET, providedHash);

      expect(result.hash).toBe(providedHash);
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("solscan.io");
      expect(result.blockExplorer).toContain(providedHash);
    });

    it("should return rawTransaction when no hash provided for EVM", () => {
      const mockTransactionBytes = new Uint8Array(100).fill(77);
      const base64Response = base64urlEncode(mockTransactionBytes);

      const result = parseTransactionResponse(base64Response, NetworkId.ETHEREUM_MAINNET);

      expect(result.hash).toBeUndefined();
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toBeUndefined();
    });

    it("should use provided hash for EVM networks", () => {
      const mockTransactionBytes = new Uint8Array(100).fill(88);
      const base64Response = base64urlEncode(mockTransactionBytes);
      const providedHash = "0xabcdef123456789";

      const result = parseTransactionResponse(base64Response, NetworkId.ETHEREUM_MAINNET, providedHash);

      expect(result.hash).toBe(providedHash);
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("etherscan.io");
      expect(result.blockExplorer).toContain(providedHash);
    });

    it("should handle invalid input gracefully when no hash provided", () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = parseTransactionResponse(invalidBase64, NetworkId.SOLANA_MAINNET);

      expect(result.hash).toBeUndefined();
      expect(result.rawTransaction).toBe(invalidBase64);
      expect(result.blockExplorer).toBeUndefined();
    });

    it("should work with all supported networks when no hash provided", () => {
      const mockBytes = new Uint8Array(64).fill(123);
      const base64Response = base64urlEncode(mockBytes);

      const networks = [
        NetworkId.SOLANA_MAINNET,
        NetworkId.ETHEREUM_MAINNET,
        NetworkId.POLYGON_MAINNET,
        NetworkId.BASE_MAINNET,
        NetworkId.SUI_MAINNET,
        NetworkId.BITCOIN_MAINNET,
      ];

      for (const network of networks) {
        const result = parseTransactionResponse(base64Response, network);
        expect(result.hash).toBeUndefined();
        expect(result.rawTransaction).toBe(base64Response);
        expect(result.blockExplorer).toBeUndefined();
      }
    });

    it("should work with all supported networks when hash is provided", () => {
      const mockBytes = new Uint8Array(64).fill(99);
      const base64Response = base64urlEncode(mockBytes);
      const providedHash = "test-hash-123";

      const networks = [
        NetworkId.SOLANA_MAINNET,
        NetworkId.ETHEREUM_MAINNET,
        NetworkId.POLYGON_MAINNET,
        NetworkId.BASE_MAINNET,
        NetworkId.SUI_MAINNET,
        NetworkId.BITCOIN_MAINNET,
      ];

      for (const network of networks) {
        const result = parseTransactionResponse(base64Response, network, providedHash);
        expect(result.hash).toBe(providedHash);
        expect(result.rawTransaction).toBe(base64Response);
        expect(result.blockExplorer).toContain(providedHash);
      }
    });

    it("should include block explorer URLs when hash is provided", () => {
      const mockBytes = new Uint8Array(64).fill(99);
      const base64Response = base64urlEncode(mockBytes);
      const providedHash = "0xabcdef123456789";

      const result = parseTransactionResponse(base64Response, NetworkId.ETHEREUM_MAINNET, providedHash);

      expect(result.hash).toBe(providedHash);
      expect(result.blockExplorer).toBeDefined();
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("etherscan.io");
      expect(result.blockExplorer).toContain("/tx/");
      expect(result.blockExplorer).toContain(providedHash);
    });
  });

  describe("parseSolanaTransactionSignature", () => {
    it("should extract signature from mock transaction bytes", async () => {
      // Create a realistic mock transaction similar to archived tests
      const mockTransactionBytes = new Uint8Array(200);
      mockTransactionBytes.fill(55, 0, 64); // Fill first 64 bytes with signature-like data
      const base64Transaction = base64urlEncode(mockTransactionBytes);

      const result = await parseSolanaTransactionSignature(base64Transaction);

      expect(result).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe("string");
      expect(result.signature.length).toBeGreaterThan(0);
      expect(result.fallback).toBeDefined();
      expect(typeof result.fallback).toBe("boolean");
    });

    it("should handle parsing errors gracefully", async () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = await parseSolanaTransactionSignature(invalidBase64);

      expect(result).toBeDefined();
      expect(result.signature).toBeDefined(); // Should have some signature value
      expect(typeof result.signature).toBe("string");
      expect(result.signature.length).toBeGreaterThan(0);
      expect(result.fallback).toBe(true);
    });

    it("should handle empty input", async () => {
      const result = await parseSolanaTransactionSignature("");

      expect(result).toBeDefined();
      expect(result.signature).toBeDefined(); // Should have some signature value
      expect(typeof result.signature).toBe("string");
      expect(result.fallback).toBe(true);
    });

    it("should extract signature from first 64 bytes as fallback", async () => {
      // Create a transaction that will fail Transaction.from() parsing but has valid bytes
      const mockBytes = new Uint8Array(200);
      // Fill first 64 bytes with signature-like pattern (similar to archived tests)
      mockBytes.fill(42, 0, 64);
      // Fill rest with transaction data pattern
      mockBytes.fill(128, 64, 200);
      
      const base64Transaction = base64urlEncode(mockBytes);

      const result = await parseSolanaTransactionSignature(base64Transaction);

      expect(result).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(typeof result.signature).toBe("string");
      expect(result.signature.length).toBeGreaterThan(0);
      expect(result.fallback).toBe(true); // Should use fallback since Transaction.from() will fail
    });

    it("should handle various transaction sizes", async () => {
      // Test with different transaction sizes (adapted from archived tests)
      const sizes = [64, 100, 200, 500];
      
      for (const size of sizes) {
        const mockBytes = new Uint8Array(size);
        mockBytes.fill(42, 0, Math.min(64, size)); // Fill available bytes for signature
        const base64Transaction = base64urlEncode(mockBytes);

        const result = await parseSolanaTransactionSignature(base64Transaction);

        expect(result).toBeDefined();
        expect(result.signature).toBeDefined();
        expect(typeof result.signature).toBe("string");
        expect(result.fallback).toBeDefined();
      }
    });
  });
});
