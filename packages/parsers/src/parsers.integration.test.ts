/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
import { parseToKmsTransaction } from "./index";
import { base64urlDecode } from "@phantom/base64url";

// Load environment variables
try {
  require("dotenv").config();
} catch (e) {
  // dotenv not available, continue without it
}

// Conditional imports for optional dependencies
let web3js: typeof import("@solana/web3.js") | null = null;
let solanaKit: typeof import("@solana/kit") | null = null;

try {
  web3js = require("@solana/web3.js");
} catch (error) {
  console.warn("@solana/web3.js not available for integration tests");
}

try {
  solanaKit = require("@solana/kit");
} catch (error) {
  console.warn("@solana/kit not available for integration tests");
}

// Skip integration tests if RPC URL is not provided
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const shouldRunIntegrationTests = !!RPC_URL && (web3js || solanaKit);

describe("Parsers Integration Tests", () => {
  beforeAll(() => {
    if (!shouldRunIntegrationTests) {
      console.warn("Skipping integration tests - missing RPC_URL or Solana dependencies");
    }
  });

  describe("Solana Transaction Parsing (Real Transactions)", () => {
    let connection: any;
    let keypair: any;

    beforeEach(() => {
      if (!web3js) return;

      // Create connection
      connection = new web3js.Connection(RPC_URL);

      // Generate a random keypair for testing (no real funds needed)
      keypair = web3js.Keypair.generate();
    });

    it("should parse real VersionedTransaction from @solana/web3.js", async () => {
      if (!web3js) {
        console.warn("Skipping test - @solana/web3.js not available");
        return;
      }

      try {
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();

        // Create a simple transfer instruction (self-transfer for testing)
        const transferInstruction = web3js.SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: keypair.publicKey,
          lamports: 1000, // Very small amount
        });

        // Create VersionedTransaction
        const messageV0 = new web3js.TransactionMessage({
          payerKey: keypair.publicKey,
          recentBlockhash: blockhash,
          instructions: [transferInstruction],
        }).compileToV0Message();

        const versionedTransaction = new web3js.VersionedTransaction(messageV0);

        // Test parser
        const result = await parseToKmsTransaction(versionedTransaction, "solana:mainnet");

        expect(result).toBeDefined();
        expect(result.originalFormat).toBe("@solana/web3.js");
        expect(result.parsed).toBeDefined();

        // Verify the data can be decoded
        const decoded = base64urlDecode(result.parsed);
        expect(decoded).toBeInstanceOf(Uint8Array);
        expect(decoded.length).toBeGreaterThan(0);

        console.log("✅ VersionedTransaction parsed successfully:", {
          originalFormat: result.originalFormat,
          base64urlLength: result.parsed?.length,
          decodedBytesLength: decoded.length,
        });
      } catch (error) {
        console.error("VersionedTransaction test failed:", error);
        throw error;
      }
    }, 30000); // 30 second timeout for network calls

    it("should parse real legacy Transaction from @solana/web3.js", async () => {
      if (!web3js) {
        console.warn("Skipping test - @solana/web3.js not available");
        return;
      }

      try {
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();

        // Create a legacy transaction
        const legacyTransaction = new web3js.Transaction({
          recentBlockhash: blockhash,
          feePayer: keypair.publicKey,
        }).add(
          web3js.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: 1000, // Very small amount
          }),
        );

        // Test parser
        const result = await parseToKmsTransaction(legacyTransaction, "solana:mainnet");

        expect(result).toBeDefined();
        expect(result.originalFormat).toBe("@solana/web3.js");
        expect(result.parsed).toBeDefined();

        // Verify the data can be decoded
        const decoded = base64urlDecode(result.parsed);
        expect(decoded).toBeInstanceOf(Uint8Array);
        expect(decoded.length).toBeGreaterThan(0);

        console.log("✅ Legacy Transaction parsed successfully:", {
          originalFormat: result.originalFormat,
          base64urlLength: result.parsed.length,
          decodedBytesLength: decoded.length,
        });
      } catch (error) {
        console.error("Legacy Transaction test failed:", error);
        throw error;
      }
    }, 30000); // 30 second timeout for network calls

    it("should parse real @solana/kit transaction", async () => {
      if (!solanaKit) {
        console.warn("Skipping test - @solana/kit not available");
        return;
      }

      try {
        // Create Solana RPC using @solana/kit
        const rpc = solanaKit.createSolanaRpc(RPC_URL);
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

        // Create a transaction message using @solana/kit
        const transactionMessage = solanaKit.pipe(
          solanaKit.createTransactionMessage({ version: 0 }),
          tx => solanaKit.setTransactionMessageFeePayer(solanaKit.address(keypair.publicKey.toBase58()), tx),
          tx => solanaKit.setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        );

        // Compile to transaction
        const kitTransaction = solanaKit.compileTransaction(transactionMessage);

        // Test parser
        const result = await parseToKmsTransaction(kitTransaction, "solana:mainnet");

        expect(result).toBeDefined();
        expect(result.originalFormat).toBe("@solana/kit");
        expect(result.parsed).toBeDefined();

        // Verify the data can be decoded
        const decoded = base64urlDecode(result.parsed);
        expect(decoded).toBeInstanceOf(Uint8Array);
        expect(decoded.length).toBeGreaterThan(0);

        console.log("✅ @solana/kit transaction parsed successfully:", {
          originalFormat: result.originalFormat,
          base64urlLength: result.parsed.length,
          decodedBytesLength: decoded.length,
        });
      } catch (error) {
        console.error("@solana/kit transaction test failed:", error);
        throw error;
      }
    }, 30000); // 30 second timeout for network calls

    it("should handle all three transaction types without errors", async () => {
      if (!web3js) {
        console.warn("Skipping comprehensive test - @solana/web3.js not available");
        return;
      }

      const results: Array<{ type: string; result: any }> = [];

      try {
        // Get recent blockhash once for all transactions
        const { blockhash } = await connection.getLatestBlockhash();

        // Test VersionedTransaction
        if (web3js) {
          const transferInstruction = web3js.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: 1000,
          });

          const messageV0 = new web3js.TransactionMessage({
            payerKey: keypair.publicKey,
            recentBlockhash: blockhash,
            instructions: [transferInstruction],
          }).compileToV0Message();

          const versionedTransaction = new web3js.VersionedTransaction(messageV0);
          const versionedResult = await parseToKmsTransaction(versionedTransaction, "solana:mainnet");
          results.push({ type: "VersionedTransaction", result: versionedResult });
        }

        // Test legacy Transaction
        if (web3js) {
          const legacyTransaction = new web3js.Transaction({
            recentBlockhash: blockhash,
            feePayer: keypair.publicKey,
          }).add(
            web3js.SystemProgram.transfer({
              fromPubkey: keypair.publicKey,
              toPubkey: keypair.publicKey,
              lamports: 1000,
            }),
          );

          const legacyResult = await parseToKmsTransaction(legacyTransaction, "solana:mainnet");
          results.push({ type: "Legacy Transaction", result: legacyResult });
        }

        // Test @solana/kit transaction
        if (solanaKit) {
          const rpc = solanaKit.createSolanaRpc(RPC_URL);
          const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

          const transactionMessage = solanaKit.pipe(
            solanaKit.createTransactionMessage({ version: 0 }),
            tx => solanaKit.setTransactionMessageFeePayer(solanaKit.address(keypair.publicKey.toBase58()), tx),
            tx => solanaKit.setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          );

          const kitTransaction = solanaKit.compileTransaction(transactionMessage);
          const kitResult = await parseToKmsTransaction(kitTransaction, "solana:mainnet");
          results.push({ type: "@solana/kit Transaction", result: kitResult });
        }

        // Verify all results
        expect(results.length).toBeGreaterThan(0);

        for (const { type, result } of results) {
          expect(result).toBeDefined();
          expect(result.parsed).toBeDefined();
          expect(result.originalFormat).toBeDefined();
          expect(typeof result.parsed).toBe("string");
          expect(result.parsed.length).toBeGreaterThan(0);

          // Verify the data can be decoded
          const decoded = base64urlDecode(result.parsed);
          expect(decoded).toBeInstanceOf(Uint8Array);
          expect(decoded.length).toBeGreaterThan(0);

          console.log(
            `✅ ${type} - Format: ${result.originalFormat}, Base64URL Length: ${result.parsed.length}, Decoded Length: ${decoded.length}`,
          );
        }

        console.log(`\n🎉 All ${results.length} transaction types parsed successfully!`);
      } catch (error) {
        console.error("Comprehensive test failed:", error);
        console.error("Results so far:", results);
        throw error;
      }
    }, 60000); // 60 second timeout for comprehensive test
  });

  describe("Error Handling", () => {
    it("should handle network timeouts gracefully", async () => {
      if (!web3js) {
        console.warn("Skipping error handling test - @solana/web3.js not available");
        return;
      }

      // Create a connection with very short timeout
      const slowConnection = new web3js.Connection("https://api.mainnet-beta.solana.com", {
        commitment: "confirmed",
        httpAgent: false,
        fetch: (url: string, options: any) => {
          return Promise.race([
            fetch(url, { ...options, timeout: 1 }), // Very short timeout
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100)),
          ]);
        },
      });

      try {
        // This should timeout, but we'll catch it and still test parsing with mock data
        await slowConnection.getLatestBlockhash();
      } catch (error) {
        // Expected timeout - now test with mock transaction
        const keypair = web3js.Keypair.generate();
        // Generate a proper mock blockhash (32 bytes base58 encoded)
        const mockBlockhash = web3js.Keypair.generate().publicKey.toBase58();
        const mockTransaction = new web3js.Transaction({
          recentBlockhash: mockBlockhash,
          feePayer: keypair.publicKey,
        }).add(
          web3js.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: 1000,
          }),
        );

        // This should work even if network failed
        const result = await parseToKmsTransaction(mockTransaction, "solana:mainnet");
        expect(result).toBeDefined();
        expect(result.originalFormat).toBe("@solana/web3.js");

        console.log("✅ Parser works independently of network issues");
      }
    }, 10000);
  });
});

// Skip tests if dependencies are not available
if (!shouldRunIntegrationTests) {
  describe.skip("Parsers Integration Tests - Skipped", () => {
    it("should skip integration tests when dependencies are missing", () => {
      console.log(
        "Integration tests skipped - install @solana/web3.js and @solana/kit and set SOLANA_RPC_URL to run these tests",
      );
    });
  });
}
