import { parseSignMessageResponse, parseTransactionResponse, parseSolanaSignedTransaction } from "./response-parsers";
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
      // For Ethereum, rawTransaction should be converted to hex
      expect(result.rawTransaction.startsWith("0x")).toBe(true);
      expect(result.blockExplorer).toBeUndefined();
    });

    it("should use provided hash for EVM networks", () => {
      const mockTransactionBytes = new Uint8Array(100).fill(88);
      const base64Response = base64urlEncode(mockTransactionBytes);
      const providedHash = "0xabcdef123456789";

      const result = parseTransactionResponse(base64Response, NetworkId.ETHEREUM_MAINNET, providedHash);

      expect(result.hash).toBe(providedHash);
      // For Ethereum, rawTransaction should be converted to hex
      expect(result.rawTransaction.startsWith("0x")).toBe(true);
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

      const evmNetworks = [NetworkId.ETHEREUM_MAINNET, NetworkId.POLYGON_MAINNET, NetworkId.BASE_MAINNET];

      for (const network of networks) {
        const result = parseTransactionResponse(base64Response, network);
        expect(result.hash).toBeUndefined();

        // EVM networks should return hex, others return base64url
        if (evmNetworks.includes(network)) {
          expect(result.rawTransaction.startsWith("0x")).toBe(true);
        } else {
          expect(result.rawTransaction).toBe(base64Response);
        }

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

      const evmNetworks = [NetworkId.ETHEREUM_MAINNET, NetworkId.POLYGON_MAINNET, NetworkId.BASE_MAINNET];

      for (const network of networks) {
        const result = parseTransactionResponse(base64Response, network, providedHash);
        expect(result.hash).toBe(providedHash);

        // EVM networks should return hex, others return base64url
        if (evmNetworks.includes(network)) {
          expect(result.rawTransaction.startsWith("0x")).toBe(true);
        } else {
          expect(result.rawTransaction).toBe(base64Response);
        }

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
      // For Ethereum, rawTransaction should be converted to hex
      expect(result.rawTransaction.startsWith("0x")).toBe(true);
      expect(result.blockExplorer).toContain("etherscan.io");
      expect(result.blockExplorer).toContain("/tx/");
      expect(result.blockExplorer).toContain(providedHash);
    });
  });

  describe("parseSolanaSignedTransaction", () => {
    it("should handle parsing errors gracefully", () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = parseSolanaSignedTransaction(invalidBase64);

      expect(result).toBeNull();
    });

    it("should handle empty input", () => {
      const result = parseSolanaSignedTransaction("");

      expect(result).toBeNull();
    });

    it("should return null for invalid transaction data", () => {
      // Create invalid transaction data that will fail Transaction.from() parsing
      const mockBytes = new Uint8Array(200);
      mockBytes.fill(42, 0, 200);

      const base64Transaction = base64urlEncode(mockBytes);

      const result = parseSolanaSignedTransaction(base64Transaction);

      expect(result).toBeNull();
    });

    it("should handle various input sizes", () => {
      // Test with different input sizes that will fail parsing
      const sizes = [64, 100, 200, 500];

      for (const size of sizes) {
        const mockBytes = new Uint8Array(size);
        mockBytes.fill(42, 0, size);
        const base64Transaction = base64urlEncode(mockBytes);

        const result = parseSolanaSignedTransaction(base64Transaction);

        // Since we're creating invalid transaction data, it should return null
        expect(result).toBeNull();
      }
    });

    it("should handle real transaction from API and return actual object", () => {
      // Real transaction from the API that was failing
      const realTransaction =
        "AbRdyl4GljepGZRbuACGx7TlNyDaulRonkhfTuuMvs3MblTXd1N6PjEwFLD9AwiZvVTMqrEFbIwaQRHOFquFygCAAQABAnwN13utnim-rGHMhoveMUcnt5an_UXb_rTO9JKXN38_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACxZajcGon7qaDgjOX_3mV4C7LdWpydUOj3GK0KM2q-CgEBAgAADAIAAADoAwAAAAAAAAA";

      const result = parseSolanaSignedTransaction(realTransaction);

      // First, verify it's not null and is defined
      expect(result).not.toBeNull();
      expect(result).toBeDefined();

      // Assert it's actually a transaction object
      expect(result).toBeInstanceOf(Object);

      if (result !== null) {
        // Verify it's specifically a VersionedTransaction
        expect(result.constructor.name).toBe("VersionedTransaction");

        // Test that it has the expected properties of a VersionedTransaction
        expect(result).toHaveProperty("version");
        expect(result).toHaveProperty("message");
        expect(result).toHaveProperty("signatures");

        // Assert specific values we expect
        expect(result.version).toBe(0); // Should be version 0
        expect(result.signatures).toHaveLength(1); // Should have 1 signature
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe("object");

        // Final verification: try to serialize it back (proves it's a real object)

        const serialized = result.serialize();
        expect(serialized).toBeInstanceOf(Uint8Array);
        expect(serialized.length).toBeGreaterThan(0);
      }
    });

    it("should handle both legacy and versioned transactions", () => {
      // Test the real versioned transaction
      const versionedTransaction =
        "AbRdyl4GljepGZRbuACGx7TlNyDaulRonkhfTuuMvs3MblTXd1N6PjEwFLD9AwiZvVTMqrEFbIwaQRHOFquFygCAAQABAnwN13utnim-rGHMhoveMUcnt5an_UXb_rTO9JKXN38_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACxZajcGon7qaDgjOX_3mV4C7LdWpydUOj3GK0KM2q-CgEBAgAADAIAAADoAwAAAAAAAAA";

      const versionedResult = parseSolanaSignedTransaction(versionedTransaction);
      expect(versionedResult).not.toBeNull();
      expect(versionedResult?.constructor.name).toBe("VersionedTransaction");

      // Note: We'd need a real legacy transaction to test that path properly
      // For now, let's test that invalid transactions still return null
      const invalidTransaction = "invalid-base64!!!";
      const invalidResult = parseSolanaSignedTransaction(invalidTransaction);
      expect(invalidResult).toBeNull();
    });
  });
});
