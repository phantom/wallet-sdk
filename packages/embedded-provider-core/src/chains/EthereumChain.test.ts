import { EmbeddedEthereumChain } from "./EthereumChain";
import { NetworkId } from "@phantom/constants";
import type { EmbeddedProvider } from "../embedded-provider";

describe("EmbeddedEthereumChain", () => {
  let mockProvider: jest.Mocked<EmbeddedProvider>;
  let ethereumChain: EmbeddedEthereumChain;

  beforeEach(() => {
    // Create a mock provider with all required methods
    mockProvider = {
      isConnected: jest.fn().mockReturnValue(true),
      getAddresses: jest
        .fn()
        .mockReturnValue([{ addressType: "Ethereum", address: "0x1234567890abcdef1234567890abcdef12345678" }]),
      signAndSendTransaction: jest.fn().mockResolvedValue({
        hash: "0xabcdef1234567890",
        rawTransaction: "0xsignedtx",
      }),
      signTransaction: jest.fn().mockResolvedValue({
        rawTransaction: "dGVzdA", // base64url encoded "test"
      }),
      signMessage: jest.fn().mockResolvedValue({
        signature: "0xsignature",
      }),
      signTypedDataV4: jest.fn().mockResolvedValue({
        signature: "0xtypedsignature",
      }),
      disconnect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    ethereumChain = new EmbeddedEthereumChain(mockProvider);
  });

  describe("sendTransaction with chainId", () => {
    it("should switch chain when chainId is provided as hex string", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
        chainId: "0x89", // Polygon mainnet (137 in decimal)
      };

      // Spy on switchChain method
      const switchChainSpy = jest.spyOn(ethereumChain, "switchChain");

      await ethereumChain.sendTransaction(transaction);

      // Verify switchChain was called with the correct numeric chainId
      expect(switchChainSpy).toHaveBeenCalledWith(137);

      // Verify signAndSendTransaction was called with Polygon network
      expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith({
        transaction,
        networkId: NetworkId.POLYGON_MAINNET,
      });
    });

    it("should switch chain when chainId is provided as number", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
        chainId: 137, // Polygon mainnet as number
      };

      const switchChainSpy = jest.spyOn(ethereumChain, "switchChain");

      await ethereumChain.sendTransaction(transaction);

      expect(switchChainSpy).toHaveBeenCalledWith(137);
      expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith({
        transaction,
        networkId: NetworkId.POLYGON_MAINNET,
      });
    });

    it("should use current chain when no chainId is provided", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
      };

      const switchChainSpy = jest.spyOn(ethereumChain, "switchChain");

      await ethereumChain.sendTransaction(transaction);

      // switchChain should not be called
      expect(switchChainSpy).not.toHaveBeenCalled();

      // Should use default Ethereum mainnet
      expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith({
        transaction,
        networkId: NetworkId.ETHEREUM_MAINNET,
      });
    });

    it("should handle Base mainnet chainId (0x2105 / 8453)", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
        chainId: "0x2105", // Base mainnet
      };

      const switchChainSpy = jest.spyOn(ethereumChain, "switchChain");

      await ethereumChain.sendTransaction(transaction);

      expect(switchChainSpy).toHaveBeenCalledWith(8453);
      expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith({
        transaction,
        networkId: NetworkId.BASE_MAINNET,
      });
    });

    it("should handle Arbitrum mainnet chainId (0xa4b1 / 42161)", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
        chainId: "0xa4b1", // Arbitrum mainnet
      };

      const switchChainSpy = jest.spyOn(ethereumChain, "switchChain");

      await ethereumChain.sendTransaction(transaction);

      expect(switchChainSpy).toHaveBeenCalledWith(42161);
      expect(mockProvider.signAndSendTransaction).toHaveBeenCalledWith({
        transaction,
        networkId: NetworkId.ARBITRUM_ONE,
      });
    });

    it("should throw error when transaction has no hash", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
      };

      // Mock signAndSendTransaction to return no hash
      mockProvider.signAndSendTransaction.mockResolvedValueOnce({
        hash: undefined,
        rawTransaction: "0xsignedtx",
      } as any);

      await expect(ethereumChain.sendTransaction(transaction)).rejects.toThrow("Transaction not submitted");
    });
  });

  describe("signTransaction with chainId", () => {
    it("should use chainId network when provided as hex string", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
        chainId: "0x89", // Polygon mainnet
      };

      await ethereumChain.signTransaction(transaction);

      // Should use Polygon network for signing
      expect(mockProvider.signTransaction).toHaveBeenCalledWith({
        transaction,
        networkId: NetworkId.POLYGON_MAINNET,
      });
    });

    it("should use chainId network when provided as number", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
        chainId: 137, // Polygon mainnet
      };

      await ethereumChain.signTransaction(transaction);

      expect(mockProvider.signTransaction).toHaveBeenCalledWith({
        transaction,
        networkId: NetworkId.POLYGON_MAINNET,
      });
    });

    it("should use current network when no chainId is provided", async () => {
      const transaction = {
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        value: "0x9184e72a000",
      };

      await ethereumChain.signTransaction(transaction);

      // Should use default Ethereum mainnet
      expect(mockProvider.signTransaction).toHaveBeenCalledWith({
        transaction,
        networkId: NetworkId.ETHEREUM_MAINNET,
      });
    });
  });

  describe("switchChain", () => {
    it("should update currentNetworkId and emit chainChanged event", async () => {
      const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

      await ethereumChain.switchChain(137); // Polygon mainnet

      // Check that currentNetworkId was updated
      const chainId = await ethereumChain.getChainId();
      expect(chainId).toBe(137);

      // Check that chainChanged event was emitted with hex format
      expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");
    });

    it("should throw error for unsupported chainId", () => {
      expect(() => ethereumChain.switchChain(999999)).toThrow("Unsupported chainId: 999999");
    });

    describe("supported networks", () => {
      it("should switch to Ethereum Mainnet (1 / 0x1)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(1);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(1);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x1");
      });

      it("should switch to Ethereum Sepolia (11155111 / 0xaa36a7)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(11155111);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(11155111);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0xaa36a7");
      });

      it("should switch to Polygon Mainnet (137 / 0x89)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(137);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(137);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");
      });

      it("should switch to Polygon Amoy (80002 / 0x13882)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(80002);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(80002);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x13882");
      });

      it("should switch to Base Mainnet (8453 / 0x2105)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(8453);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(8453);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x2105");
      });

      it("should switch to Base Sepolia (84532 / 0x14a34)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(84532);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(84532);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x14a34");
      });

      it("should switch to Arbitrum One (42161 / 0xa4b1)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(42161);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(42161);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0xa4b1");
      });

      it("should switch to Arbitrum Sepolia (421614 / 0x66eee)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(421614);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(421614);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x66eee");
      });

      it("should switch to Monad Mainnet (143 / 0x8f)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(143);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(143);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x8f");
      });

      it("should switch to Monad Testnet (10143 / 0x279f)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain(10143);

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(10143);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x279f");
      });
    });

    describe("hex string chainId support", () => {
      it("should accept hex string with 0x prefix (0x89 for Polygon)", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain("0x89"); // Polygon as hex string

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(137); // Should convert to decimal
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");
      });

      it("should handle all supported networks as hex strings", async () => {
        const testCases = [
          { hex: "0x1", decimal: 1, name: "Ethereum Mainnet" },
          { hex: "0xaa36a7", decimal: 11155111, name: "Ethereum Sepolia" },
          { hex: "0x89", decimal: 137, name: "Polygon Mainnet" },
          { hex: "0x13882", decimal: 80002, name: "Polygon Amoy" },
          { hex: "0x2105", decimal: 8453, name: "Base Mainnet" },
          { hex: "0x14a34", decimal: 84532, name: "Base Sepolia" },
          { hex: "0xa4b1", decimal: 42161, name: "Arbitrum One" },
          { hex: "0x66eee", decimal: 421614, name: "Arbitrum Sepolia" },
          { hex: "0x8f", decimal: 143, name: "Monad Mainnet" },
          { hex: "0x279f", decimal: 10143, name: "Monad Testnet" },
        ];

        for (const { hex, decimal } of testCases) {
          const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

          await ethereumChain.switchChain(hex);

          const chainId = await ethereumChain.getChainId();
          expect(chainId).toBe(decimal);
          expect(emitSpy).toHaveBeenCalledWith("chainChanged", hex);

          emitSpy.mockRestore();
        }
      });

      it("should throw error for unsupported hex chainId", () => {
        expect(() => ethereumChain.switchChain("0xf423f")).toThrow("Unsupported chainId: 0xf423f");
      });

      it("should handle uppercase hex strings", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain("0X89"); // Uppercase X

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(137);
        // Event should be lowercase
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");
      });

      it("should handle hex strings with uppercase letters", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain("0xA4B1"); // Arbitrum with uppercase

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(42161);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0xa4b1");
      });

      it("should handle decimal strings by converting to number", async () => {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");
        await ethereumChain.switchChain("137"); // Polygon as decimal string

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(137); // Should parse as decimal, not hex
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");
      });

      it("should handle various decimal string formats", async () => {
        const testCases = [
          { decimal: "1", expectedDecimal: 1, expectedHex: "0x1" },
          { decimal: "137", expectedDecimal: 137, expectedHex: "0x89" },
          { decimal: "8453", expectedDecimal: 8453, expectedHex: "0x2105" },
          { decimal: "42161", expectedDecimal: 42161, expectedHex: "0xa4b1" },
        ];

        for (const { decimal, expectedDecimal, expectedHex } of testCases) {
          const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

          await ethereumChain.switchChain(decimal);

          const chainId = await ethereumChain.getChainId();
          expect(chainId).toBe(expectedDecimal);
          expect(emitSpy).toHaveBeenCalledWith("chainChanged", expectedHex);

          emitSpy.mockRestore();
        }
      });
    });
  });

  describe("wallet_switchEthereumChain RPC method", () => {
    it("should handle wallet_switchEthereumChain with hex chainId", async () => {
      const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

      // Call via request method (EIP-1193 standard)
      await ethereumChain.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x89" }], // Polygon mainnet in hex
      });

      const chainId = await ethereumChain.getChainId();
      expect(chainId).toBe(137);
      expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");
    });

    it("should handle wallet_switchEthereumChain for all supported networks", async () => {
      const testCases = [
        { hex: "0x1", decimal: 1, name: "Ethereum Mainnet" },
        { hex: "0xaa36a7", decimal: 11155111, name: "Ethereum Sepolia" },
        { hex: "0x89", decimal: 137, name: "Polygon Mainnet" },
        { hex: "0x13882", decimal: 80002, name: "Polygon Amoy" },
        { hex: "0x2105", decimal: 8453, name: "Base Mainnet" },
        { hex: "0x14a34", decimal: 84532, name: "Base Sepolia" },
        { hex: "0xa4b1", decimal: 42161, name: "Arbitrum One" },
        { hex: "0x66eee", decimal: 421614, name: "Arbitrum Sepolia" },
        { hex: "0x8f", decimal: 143, name: "Monad Mainnet" },
        { hex: "0x279f", decimal: 10143, name: "Monad Testnet" },
      ];

      for (const { hex, decimal } of testCases) {
        const emitSpy = jest.spyOn((ethereumChain as any).eventEmitter, "emit");

        await ethereumChain.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hex }],
        });

        const chainId = await ethereumChain.getChainId();
        expect(chainId).toBe(decimal);
        expect(emitSpy).toHaveBeenCalledWith("chainChanged", hex);

        emitSpy.mockRestore();
      }
    });
  });

  describe("chainId property", () => {
    it("should return chainId in hex format", async () => {
      await ethereumChain.switchChain(137); // Polygon

      const hexChainId = (ethereumChain as any).chainId;
      expect(hexChainId).toBe("0x89");
    });

    it("should update when chain is switched", async () => {
      await ethereumChain.switchChain(1); // Ethereum
      expect((ethereumChain as any).chainId).toBe("0x1");

      await ethereumChain.switchChain(8453); // Base
      expect((ethereumChain as any).chainId).toBe("0x2105");
    });
  });
});
