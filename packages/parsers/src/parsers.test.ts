import { parseMessage, parseTransaction, parseSignMessageResponse, parseTransactionResponse } from "./index";
import { base64urlDecode, base64urlDecodeToString, base64urlEncode } from "@phantom/base64url";
import { NetworkId } from "@phantom/constants";

describe("Message Parser", () => {
  it("should parse string message to base64url", () => {
    const message = "Hello World";
    const result = parseMessage(message);

    // Verify it's valid base64url
    expect(result.base64url).toBeDefined();

    // Decode and verify content
    const decodedMessage = base64urlDecodeToString(result.base64url);
    expect(decodedMessage).toBe(message);
  });

  it("should handle empty message", () => {
    const message = "";
    const result = parseMessage(message);

    const decodedMessage = base64urlDecodeToString(result.base64url);
    expect(decodedMessage).toBe(message);
  });

  it("should handle unicode message", () => {
    const message = "Hello 🌍 World";
    const result = parseMessage(message);

    const decodedMessage = base64urlDecodeToString(result.base64url);
    expect(decodedMessage).toBe(message);
  });
});

describe("Solana Transaction Parser", () => {
  it("should parse @solana/kit transaction with messageBytes", async () => {
    const mockKitTransaction = {
      messageBytes: new Uint8Array([1, 2, 3, 4, 5]),
    };

    const result = await parseTransaction(mockKitTransaction, "solana:mainnet");

    expect(result.originalFormat).toBe("@solana/kit");
    expect(result.base64url).toBeDefined();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(mockKitTransaction.messageBytes);
  });

  it("should parse @solana/web3.js transaction with serialize method", async () => {
    const mockWeb3Transaction = {
      serialize: jest.fn().mockReturnValue(new Uint8Array([6, 7, 8, 9, 10])),
    };

    const result = await parseTransaction(mockWeb3Transaction, "solana:mainnet");

    expect(result.originalFormat).toBe("@solana/web3.js");
    expect(result.base64url).toBeDefined();
    expect(mockWeb3Transaction.serialize).toHaveBeenCalled();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(new Uint8Array([6, 7, 8, 9, 10]));
  });

  it("should parse @solana/web3.js legacy Transaction", async () => {
    const mockLegacyTransaction = {
      serialize: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5])),
    };

    const result = await parseTransaction(mockLegacyTransaction, "solana:mainnet");

    expect(result.originalFormat).toBe("@solana/web3.js");
    expect(result.base64url).toBeDefined();
    expect(mockLegacyTransaction.serialize).toHaveBeenCalledWith({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it("should parse @solana/web3.js VersionedTransaction", async () => {
    const mockVersionedTransaction = {
      serialize: jest.fn().mockReturnValue(new Uint8Array([10, 20, 30, 40, 50])),
    };

    const result = await parseTransaction(mockVersionedTransaction, "solana:mainnet");

    expect(result.originalFormat).toBe("@solana/web3.js");
    expect(result.base64url).toBeDefined();
    expect(mockVersionedTransaction.serialize).toHaveBeenCalledWith({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(new Uint8Array([10, 20, 30, 40, 50]));
  });

  it("should parse Solana transaction as raw bytes", async () => {
    const mockBytes = new Uint8Array([11, 12, 13, 14, 15]);

    const result = await parseTransaction(mockBytes, "solana:mainnet");

    expect(result.originalFormat).toBe("bytes");
    expect(result.base64url).toBeDefined();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(mockBytes);
  });

  it("should parse Solana transaction as base64 string", async () => {
    const base64String = Buffer.from([11, 12, 13, 14, 15]).toString("base64");

    const result = await parseTransaction(base64String, "solana:mainnet");

    expect(result.originalFormat).toBe("base64");
    expect(result.base64url).toBeDefined();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(new Uint8Array([11, 12, 13, 14, 15]));
  });

  it("should throw error for unsupported Solana transaction format", async () => {
    const invalidTransaction = { invalid: true };

    await expect(parseTransaction(invalidTransaction, "solana:mainnet")).rejects.toThrow(
      "Unsupported Solana transaction format",
    );
  });
});

describe("EVM Transaction Parser", () => {
  it("should parse Viem transaction object", async () => {
    const mockViemTransaction = {
      to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      value: 1000000000000000000n,
      data: "0x",
    };

    const result = await parseTransaction(mockViemTransaction, "ethereum:mainnet");

    expect(result.originalFormat).toBe("viem");
    expect(result.base64url).toBeDefined();
  });

  it("should parse ethers.js transaction with serialize method", async () => {
    const mockEthersTransaction = {
      serialize: jest.fn().mockReturnValue("0x0607080910"),
    };

    const result = await parseTransaction(mockEthersTransaction, "ethereum:mainnet");

    expect(result.originalFormat).toBe("ethers");
    expect(result.base64url).toBeDefined();
    expect(mockEthersTransaction.serialize).toHaveBeenCalled();
  });

  it("should parse EVM transaction as raw bytes", async () => {
    const mockBytes = new Uint8Array([1, 2, 3, 4, 5]);

    const result = await parseTransaction(mockBytes, "ethereum:mainnet");

    expect(result.originalFormat).toBe("bytes");
    expect(result.base64url).toBeDefined();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(mockBytes);
  });

  it("should parse EVM transaction as hex string", async () => {
    const hexString = "0x0102030405";

    const result = await parseTransaction(hexString, "ethereum:mainnet");

    expect(result.originalFormat).toBe("hex");
    expect(result.base64url).toBeDefined();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it("should work with all EVM networks", async () => {
    const mockBytes = new Uint8Array([1, 2, 3]);
    const evmNetworks = ["ethereum:mainnet", "polygon:mainnet", "optimism:mainnet", "arbitrum:mainnet", "base:mainnet"];

    for (const network of evmNetworks) {
      const result = await parseTransaction(mockBytes, network as any);
      expect(result.originalFormat).toBe("bytes");
      expect(result.base64url).toBeDefined();
    }
  });
});

describe("Sui Transaction Parser", () => {
  it("should parse Sui transaction with serialize method", async () => {
    const mockSuiTransaction = {
      serialize: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5])),
    };

    const result = await parseTransaction(mockSuiTransaction, "sui:mainnet");

    expect(result.originalFormat).toBe("sui-sdk");
    expect(result.base64url).toBeDefined();
    expect(mockSuiTransaction.serialize).toHaveBeenCalled();
  });

  it("should parse Sui transaction block with build method", async () => {
    const mockTransactionBlock = {
      build: jest.fn().mockResolvedValue({
        serialize: jest.fn().mockReturnValue(new Uint8Array([6, 7, 8, 9, 10])),
      }),
    };

    const result = await parseTransaction(mockTransactionBlock, "sui:mainnet");

    expect(result.originalFormat).toBe("transaction-block");
    expect(result.base64url).toBeDefined();
    expect(mockTransactionBlock.build).toHaveBeenCalled();
  });

  it("should parse Sui transaction as raw bytes", async () => {
    const mockBytes = new Uint8Array([11, 12, 13, 14, 15]);

    const result = await parseTransaction(mockBytes, "sui:mainnet");

    expect(result.originalFormat).toBe("bytes");
    expect(result.base64url).toBeDefined();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(mockBytes);
  });

  it("should throw error for unsupported Sui transaction format", async () => {
    const invalidTransaction = { invalid: true };

    await expect(parseTransaction(invalidTransaction, "sui:mainnet")).rejects.toThrow(
      "Unsupported Sui transaction format",
    );
  });
});

describe("Bitcoin Transaction Parser", () => {
  it("should parse bitcoinjs-lib transaction with toBuffer method", async () => {
    const mockBitcoinTransaction = {
      toBuffer: jest.fn().mockReturnValue(Buffer.from([1, 2, 3, 4, 5])),
    };

    const result = await parseTransaction(mockBitcoinTransaction, "bitcoin:mainnet");

    expect(result.originalFormat).toBe("bitcoinjs-lib");
    expect(result.base64url).toBeDefined();
    expect(mockBitcoinTransaction.toBuffer).toHaveBeenCalled();
  });

  it("should parse Bitcoin transaction as raw bytes", async () => {
    const mockBytes = new Uint8Array([6, 7, 8, 9, 10]);

    const result = await parseTransaction(mockBytes, "bitcoin:mainnet");

    expect(result.originalFormat).toBe("bytes");
    expect(result.base64url).toBeDefined();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(mockBytes);
  });

  it("should parse Bitcoin transaction as hex string", async () => {
    const hexString = "0102030405";

    const result = await parseTransaction(hexString, "bitcoin:mainnet");

    expect(result.originalFormat).toBe("hex");
    expect(result.base64url).toBeDefined();

    // Verify the encoded data matches
    const decoded = base64urlDecode(result.base64url);
    expect(decoded).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it("should throw error for unsupported Bitcoin transaction format", async () => {
    const invalidTransaction = { invalid: true };

    await expect(parseTransaction(invalidTransaction, "bitcoin:mainnet")).rejects.toThrow(
      "Unsupported Bitcoin transaction format",
    );
  });
});

describe("Network Support", () => {
  it("should throw error for unsupported network", async () => {
    const mockTransaction = new Uint8Array([1, 2, 3]);

    await expect(parseTransaction(mockTransaction, "unsupported:mainnet")).rejects.toThrow(
      "Unsupported network: unsupported",
    );
  });

  it("should handle different network formats correctly", async () => {
    const mockBytes = new Uint8Array([1, 2, 3]);

    // Test all supported networks
    const networks = [
      "solana:mainnet",
      "ethereum:mainnet",
      "polygon:mainnet",
      "optimism:mainnet",
      "arbitrum:mainnet",
      "base:mainnet",
      "sui:mainnet",
      "bitcoin:mainnet",
    ];

    for (const network of networks) {
      const result = await parseTransaction(mockBytes, network as any);
      expect(result.base64url).toBeDefined();
      expect(result.originalFormat).toBe("bytes");
    }
  });
});

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
    it("should parse Solana transaction response", async () => {
      // Create a mock transaction with signature at the beginning (64 bytes)
      const mockTransactionBytes = new Uint8Array(200);
      // Fill first 64 bytes with signature data
      mockTransactionBytes.fill(55, 0, 64);
      const base64Response = base64urlEncode(mockTransactionBytes);

      const result = await parseTransactionResponse(base64Response, NetworkId.SOLANA_MAINNET);

      expect(result.hash).toBeDefined();
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("solscan.io");
      expect(result.blockExplorer).toContain(result.hash);
    });

    it("should use provided hash when passed", async () => {
      const mockTransactionBytes = new Uint8Array(100).fill(123);
      const base64Response = base64urlEncode(mockTransactionBytes);
      const providedHash = "custom-hash-123";

      const result = await parseTransactionResponse(base64Response, NetworkId.SOLANA_MAINNET, providedHash);

      expect(result.hash).toBe(providedHash);
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("solscan.io");
      expect(result.blockExplorer).toContain(providedHash);
    });

    it("should parse EVM transaction response", async () => {
      const mockTransactionBytes = new Uint8Array(100).fill(77);
      const base64Response = base64urlEncode(mockTransactionBytes);

      const result = await parseTransactionResponse(base64Response, NetworkId.ETHEREUM_MAINNET);

      expect(result.hash.startsWith("0x")).toBe(true);
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("etherscan.io");
      expect(result.blockExplorer).toContain(result.hash);
    });

    it("should use provided hash for EVM networks", async () => {
      const mockTransactionBytes = new Uint8Array(100).fill(88);
      const base64Response = base64urlEncode(mockTransactionBytes);
      const providedHash = "0xabcdef123456789";

      const result = await parseTransactionResponse(base64Response, NetworkId.ETHEREUM_MAINNET, providedHash);

      expect(result.hash).toBe(providedHash);
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("etherscan.io");
      expect(result.blockExplorer).toContain(providedHash);
    });

    it("should handle parsing errors gracefully", async () => {
      const invalidBase64 = "invalid-base64!!!";

      const result = await parseTransactionResponse(invalidBase64, NetworkId.SOLANA_MAINNET);

      // Should fallback to original response
      expect(result.hash).toBeDefined();
      expect(result.rawTransaction).toBe(invalidBase64);
      expect(result.blockExplorer).toBeDefined();
    });

    it("should work with all supported networks", async () => {
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
        const result = await parseTransactionResponse(base64Response, network);
        expect(result.hash).toBeDefined();
        expect(result.hash).not.toBe("");
        expect(result.rawTransaction).toBe(base64Response);
      }
    });

    it("should work with all supported networks when hash is provided", async () => {
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
        const result = await parseTransactionResponse(base64Response, network, providedHash);
        expect(result.hash).toBe(providedHash);
        expect(result.rawTransaction).toBe(base64Response);
        expect(result.blockExplorer).toContain(providedHash);
      }
    });

    it("should include block explorer URLs when available", async () => {
      const mockBytes = new Uint8Array(64).fill(99);
      const base64Response = base64urlEncode(mockBytes);

      const result = await parseTransactionResponse(base64Response, NetworkId.ETHEREUM_MAINNET);

      expect(result.blockExplorer).toBeDefined();
      expect(result.rawTransaction).toBe(base64Response);
      expect(result.blockExplorer).toContain("etherscan.io");
      expect(result.blockExplorer).toContain("/tx/");
    });
  });
});
