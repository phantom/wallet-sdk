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

    it("should handle real transaction from API", () => {
      // Real transaction from the API that was failing
      const realTransaction = "AbRdyl4GljepGZRbuACGx7TlNyDaulRonkhfTuuMvs3MblTXd1N6PjEwFLD9AwiZvVTMqrEFbIwaQRHOFquFygCAAQABAnwN13utnim-rGHMhoveMUcnt5an_UXb_rTO9JKXN38_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACxZajcGon7qaDgjOX_3mV4C7LdWpydUOj3GK0KM2q-CgEBAgAADAIAAADoAwAAAAAAAAA";

      console.log("Testing real transaction:", realTransaction.substring(0, 50) + "...");
      
      const result = parseSolanaSignedTransaction(realTransaction);
      
      if (result === null) {
        console.log("❌ Real transaction parsing failed - returned null");
        
        // Let's try to understand why it's failing by testing the base64url decoding step
        try {
          const transactionBytes = Buffer.from(realTransaction, "base64url");
          console.log("✅ Base64url decoding successful. Length:", transactionBytes.length);
          console.log("First 20 bytes:", Array.from(transactionBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
          
          // Now let's see if it's a versioned transaction vs legacy transaction
          try {
            // Try parsing as legacy transaction first
            const { Transaction } = require("@solana/web3.js");
            const legacyTx = Transaction.from(transactionBytes);
            console.log("✅ Successfully parsed as Legacy Transaction");
            console.log("Signatures:", legacyTx.signatures.length);
            console.log("Instructions:", legacyTx.instructions.length);
          } catch (legacyError) {
            console.log("❌ Legacy Transaction parsing failed:", legacyError.message);
            
            // Try parsing as versioned transaction
            try {
              const { VersionedTransaction } = require("@solana/web3.js");
              const versionedTx = VersionedTransaction.deserialize(transactionBytes);
              console.log("✅ Successfully parsed as VersionedTransaction");
              console.log("Version:", versionedTx.version);
              console.log("Signatures:", versionedTx.signatures.length);
              console.log("Message type:", typeof versionedTx.message);
            } catch (versionedError) {
              console.log("❌ VersionedTransaction parsing also failed:", versionedError.message);
            }
          }
        } catch (base64Error) {
          console.log("❌ Base64url decoding failed:", base64Error.message);
        }
      } else {
        console.log("✅ Real transaction parsing successful!");
        console.log("Transaction type:", result.constructor.name);
        console.log("Signatures:", result.signatures?.length || 'N/A');
      }

      // Now we expect this to succeed since we handle both legacy and versioned transactions
      expect(result).not.toBeNull();
      expect(result).toBeDefined();
      
      // This should be a VersionedTransaction based on our debugging output
      if (result !== null) {
        expect(result.constructor.name).toBe("VersionedTransaction");
      }
    });

    it("should handle both legacy and versioned transactions", () => {
      // Test the real versioned transaction
      const versionedTransaction = "AbRdyl4GljepGZRbuACGx7TlNyDaulRonkhfTuuMvs3MblTXd1N6PjEwFLD9AwiZvVTMqrEFbIwaQRHOFquFygCAAQABAnwN13utnim-rGHMhoveMUcnt5an_UXb_rTO9JKXN38_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACxZajcGon7qaDgjOX_3mV4C7LdWpydUOj3GK0KM2q-CgEBAgAADAIAAADoAwAAAAAAAAA";
      
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
