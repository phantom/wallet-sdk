import {
  archivedParseSolanaSignatureResponse,
  archivedParseSolanaTransactionResponse,
  archivedParseEVMSignatureResponse,
  archivedParseEVMTransactionResponse,
  archivedParseSuiSignatureResponse,
  archivedParseSuiTransactionResponse,
  archivedParseBitcoinSignatureResponse,
  archivedParseBitcoinTransactionResponse,
} from "./dynamic-imports";
import { base64urlEncode } from "@phantom/base64url";
import { NetworkId } from "@phantom/constants";

describe("Archived Response Parsing Functions", () => {
  describe("archivedParseSolanaSignatureResponse", () => {
    it("should parse Solana signature response", () => {
      const mockSignatureBytes = new Uint8Array(64).fill(42);
      const base64Response = base64urlEncode(mockSignatureBytes);

      const result = archivedParseSolanaSignatureResponse(base64Response);

      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(base64Response);
    });

    it("should handle parsing errors gracefully", () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = archivedParseSolanaSignatureResponse(invalidBase64);

      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(invalidBase64);
    });
  });

  describe("archivedParseSolanaTransactionResponse", () => {
    it("should parse Solana transaction response", async () => {
      const mockTransactionBytes = new Uint8Array(200);
      mockTransactionBytes.fill(55, 0, 64);
      const base64Response = base64urlEncode(mockTransactionBytes);

      const result = await archivedParseSolanaTransactionResponse(base64Response, NetworkId.SOLANA_MAINNET);

      expect(result.hash).toBeDefined();
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("solscan.io");
    });

    it("should handle errors gracefully", async () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = await archivedParseSolanaTransactionResponse(invalidBase64, NetworkId.SOLANA_MAINNET);

      expect(result.rawTransaction).toBe(invalidBase64);
    });
  });

  describe("archivedParseEVMSignatureResponse", () => {
    it("should parse EVM signature response", () => {
      const mockSignatureBytes = new Uint8Array(65).fill(33);
      const base64Response = base64urlEncode(mockSignatureBytes);

      const result = archivedParseEVMSignatureResponse(base64Response);

      expect(result.signature.startsWith("0x")).toBe(true);
      expect(result.signature.length).toBe(132);
      expect(result.rawSignature).toBe(base64Response);
    });

    it("should handle EVM signature parsing correctly", () => {
      // Since base64urlDecode is very forgiving, test actual parsing behavior
      const testInput = "0x@#$%invalid@#$%";

      const result = archivedParseEVMSignatureResponse(testInput);

      // The function processes the input - this verifies it doesn't crash
      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(testInput);
    });
  });

  describe("archivedParseEVMTransactionResponse", () => {
    it("should parse EVM transaction response", async () => {
      const mockTransactionBytes = new Uint8Array(100).fill(77);
      const base64Response = base64urlEncode(mockTransactionBytes);

      const result = await archivedParseEVMTransactionResponse(base64Response, NetworkId.ETHEREUM_MAINNET);

      expect(result.hash.startsWith("0x")).toBe(true);
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("etherscan.io");
    });

    it("should handle errors gracefully", async () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = await archivedParseEVMTransactionResponse(invalidBase64, NetworkId.ETHEREUM_MAINNET);

      expect(result.rawTransaction).toBe(invalidBase64);
    });
  });

  describe("archivedParseSuiSignatureResponse", () => {
    it("should parse Sui signature response", () => {
      const mockSignatureBytes = new Uint8Array(64).fill(88);
      const base64Response = base64urlEncode(mockSignatureBytes);

      const result = archivedParseSuiSignatureResponse(base64Response);

      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(base64Response);
    });

    it("should handle parsing errors gracefully", () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = archivedParseSuiSignatureResponse(invalidBase64);

      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(invalidBase64);
    });
  });

  describe("archivedParseSuiTransactionResponse", () => {
    it("should parse Sui transaction response", async () => {
      const mockTransactionBytes = new Uint8Array(100).fill(99);
      const base64Response = base64urlEncode(mockTransactionBytes);

      const result = await archivedParseSuiTransactionResponse(base64Response, NetworkId.SUI_MAINNET);

      expect(result.hash).toBeDefined();
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("explorer.sui.io");
    });

    it("should handle errors gracefully", async () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = await archivedParseSuiTransactionResponse(invalidBase64, NetworkId.SUI_MAINNET);

      expect(result.rawTransaction).toBe(invalidBase64);
    });
  });

  describe("archivedParseBitcoinSignatureResponse", () => {
    it("should parse Bitcoin signature response", () => {
      const mockSignatureBytes = new Uint8Array(64).fill(123);
      const base64Response = base64urlEncode(mockSignatureBytes);

      const result = archivedParseBitcoinSignatureResponse(base64Response);

      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(base64Response);
    });

    it("should handle parsing errors gracefully", () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = archivedParseBitcoinSignatureResponse(invalidBase64);

      expect(result.signature).toBeDefined();
      expect(result.rawSignature).toBe(invalidBase64);
    });
  });

  describe("archivedParseBitcoinTransactionResponse", () => {
    it("should parse Bitcoin transaction response", async () => {
      const mockTransactionBytes = new Uint8Array(100).fill(111);
      const base64Response = base64urlEncode(mockTransactionBytes);

      const result = await archivedParseBitcoinTransactionResponse(base64Response, NetworkId.BITCOIN_MAINNET);

      expect(result.hash).toBeDefined();
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("blockstream.info");
    });

    it("should handle errors gracefully", async () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = await archivedParseBitcoinTransactionResponse(invalidBase64, NetworkId.BITCOIN_MAINNET);

      expect(result.rawTransaction).toBe(invalidBase64);
    });
  });
});
