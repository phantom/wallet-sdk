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
      getAddresses: jest.fn().mockReturnValue([
        { addressType: "Ethereum", address: "0x1234567890abcdef1234567890abcdef12345678" },
      ]),
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

      // Check that chainChanged event was emitted
      expect(emitSpy).toHaveBeenCalledWith("chainChanged", "0x89");
    });

    it("should throw error for unsupported chainId", () => {
      expect(() => ethereumChain.switchChain(999999)).toThrow("Unsupported chainId: 999999");
    });
  });
});
