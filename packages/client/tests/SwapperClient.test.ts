import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { SwapperClient } from "../src/SwapperClient";
import { PhantomClient } from "../src/PhantomClient";
import { NetworkId } from "../src/caip2-mappings";
import { AddressType } from "../src";
import type { SignedTransaction } from "../src/types";

jest.mock("../src/PhantomClient");

describe("SwapperClient", () => {
  let swapperClient: SwapperClient;
  let mockPhantomClient: jest.Mocked<PhantomClient>;
  let mockSwapperSDK: any;

  beforeEach(() => {
    mockPhantomClient = {
      getWalletAddresses: jest.fn(),
      signAndSendTransaction: jest.fn(),
    } as any;

    mockSwapperSDK = {
      getQuotes: jest.fn(),
      getBridgeableTokens: jest.fn(),
      getIntentsStatus: jest.fn(),
      initializeBridge: jest.fn(),
    };

    swapperClient = new SwapperClient(mockPhantomClient);
    // Override the swapperSDK instance with our mock
    (swapperClient as any).swapperSDK = mockSwapperSDK;
  });

  describe("swap", () => {
    it("should successfully execute a swap on Solana", async () => {
      const walletId = "test-wallet-id";
      const transactionData = "base64EncodedTransaction";
      const signedTransaction: SignedTransaction = {
        rawTransaction: "signedBase64Transaction",
      };

      // Mock wallet addresses retrieval (returns all addresses)
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: AddressType.solana, address: "SoLaNaAdDrEsS123" },
        { addressType: AddressType.ethereum, address: "0xEthAddress123" },
        { addressType: AddressType.bitcoinSegwit, address: "bc1qAddress123" },
      ]);

      // Mock quote response
      mockSwapperSDK.getQuotes.mockResolvedValue({
        type: "swap",
        quotes: [
          {
            sellAmount: "1000000",
            buyAmount: "2000000",
            slippageTolerance: 0.01,
            priceImpact: 0.005,
            sources: [],
            fees: [],
            baseProvider: { id: "jupiter", name: "Jupiter" },
            transactionData: [transactionData],
          },
        ],
      });

      // Mock sign and send
      mockPhantomClient.signAndSendTransaction.mockResolvedValue(signedTransaction);

      const result = await swapperClient.swap({
        walletId,
        sellToken: {
          type: "native",
          networkId: NetworkId.SOLANA_MAINNET,
        },
        buyToken: {
          type: "address",
          address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
          networkId: NetworkId.SOLANA_MAINNET,
        },
        sellAmount: "1000000",
        slippageTolerance: 0.01,
      });

      expect(result).toBe(signedTransaction);
      expect(mockPhantomClient.getWalletAddresses).toHaveBeenCalledWith(walletId);
      expect(mockSwapperSDK.getQuotes).toHaveBeenCalled();
      expect(mockPhantomClient.signAndSendTransaction).toHaveBeenCalledWith({
        walletId,
        transaction: transactionData,
        networkId: NetworkId.SOLANA_MAINNET,
      });
    });

    it("should successfully execute a swap on Ethereum", async () => {
      const walletId = "test-wallet-id";
      const transactionData = "0xEvmTransactionData";
      const signedTransaction: SignedTransaction = {
        rawTransaction: "0xSignedEvmTransaction",
      };

      // Mock wallet addresses retrieval
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: AddressType.solana, address: "SoLaNaAdDrEsS123" },
        { addressType: AddressType.ethereum, address: "0xEthereumAddress123" },
      ]);

      // Mock quote response with EVM structure
      mockSwapperSDK.getQuotes.mockResolvedValue({
        type: "swap",
        quotes: [
          {
            sellAmount: "1000000000000000000",
            buyAmount: "2000000000",
            slippageTolerance: 0.01,
            priceImpact: 0.005,
            sources: [],
            fees: [],
            baseProvider: { id: "uniswap", name: "Uniswap" },
            allowanceTarget: "0xAllowanceTarget",
            approvalExactAmount: "0", // No approval needed
            exchangeAddress: "0xExchangeAddress",
            value: "0",
            transactionData: transactionData,
            gas: 200000,
          },
        ],
      });

      // Mock sign and send
      mockPhantomClient.signAndSendTransaction.mockResolvedValue(signedTransaction);

      const result = await swapperClient.swap({
        walletId,
        sellToken: {
          type: "native",
          networkId: NetworkId.ETHEREUM_MAINNET,
        },
        buyToken: {
          type: "address",
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
          networkId: NetworkId.ETHEREUM_MAINNET,
        },
        sellAmount: "1000000000000000000",
        slippageTolerance: 0.01,
      });

      expect(result).toBe(signedTransaction);
      expect(mockPhantomClient.getWalletAddresses).toHaveBeenCalledWith(walletId);
      expect(mockPhantomClient.signAndSendTransaction).toHaveBeenCalledWith({
        walletId,
        transaction: transactionData,
        networkId: NetworkId.ETHEREUM_MAINNET,
      });
    });

    it("should handle retry logic when getting quotes fails", async () => {
      const walletId = "test-wallet-id";

      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: AddressType.solana, address: "SoLaNaAdDrEsS123" },
      ]);

      // Mock quote failures then success
      mockSwapperSDK.getQuotes
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockResolvedValueOnce({
          type: "swap",
          quotes: [
            {
              sellAmount: "1000000",
              buyAmount: "2000000",
              slippageTolerance: 0.01,
              priceImpact: 0.005,
              sources: [],
              fees: [],
              baseProvider: { id: "jupiter", name: "Jupiter" },
              transactionData: ["base64Transaction"],
            },
          ],
        });

      mockPhantomClient.signAndSendTransaction.mockResolvedValue({
        rawTransaction: "signed",
      });

      // Reduce delays for testing
      (swapperClient as any).defaultRetryOptions = {
        maxAttempts: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffFactor: 2,
      };

      const result = await swapperClient.swap({
        walletId,
        sellToken: {
          type: "native",
          networkId: NetworkId.SOLANA_MAINNET,
        },
        buyToken: {
          type: "address",
          address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          networkId: NetworkId.SOLANA_MAINNET,
        },
        sellAmount: "1000000",
      });

      expect(result.rawTransaction).toBe("signed");
      expect(mockSwapperSDK.getQuotes).toHaveBeenCalledTimes(3);
    });

    it("should throw error when no quotes are available", async () => {
      const walletId = "test-wallet-id";
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: AddressType.solana, address: "address" },
      ]);

      mockSwapperSDK.getQuotes.mockResolvedValue({
        type: "swap",
        quotes: [],
      });

      await expect(
        swapperClient.swap({
          walletId,
          sellToken: {
            type: "native",
            networkId: NetworkId.SOLANA_MAINNET,
          },
          buyToken: {
            type: "address",
            address: "token",
            networkId: NetworkId.SOLANA_MAINNET,
          },
          sellAmount: "1000000",
        })
      ).rejects.toThrow("No swap quotes available");
    });

    it("should throw error when wallet has no address for the network", async () => {
      const walletId = "test-wallet-id";
      
      // Mock wallet addresses - only has Ethereum address
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: AddressType.ethereum, address: "0xEthAddress" },
      ]);

      await expect(
        swapperClient.swap({
          walletId,
          sellToken: {
            type: "native",
            networkId: NetworkId.SOLANA_MAINNET,
          },
          buyToken: {
            type: "address",
            address: "token",
            networkId: NetworkId.SOLANA_MAINNET,
          },
          sellAmount: "1000000",
        })
      ).rejects.toThrow("No Solana address found for wallet test-wallet-id");
    });
  });

  describe("bridge", () => {
    it("should successfully execute a bridge transaction", async () => {
      const walletId = "test-wallet-id";
      const transactionData = "0xBridgeTransaction";
      const signedTransaction: SignedTransaction = {
        rawTransaction: "0xSignedBridge",
      };

      // Mock wallet addresses for both networks
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: AddressType.ethereum, address: "0xEthAddress" },
        { addressType: AddressType.solana, address: "SolanaAddress" },
      ]);

      // Mock bridge quote
      mockSwapperSDK.getQuotes.mockResolvedValue({
        type: "bridge",
        quotes: [
          {
            sellAmount: "1000000000",
            buyAmount: "2000000",
            slippageTolerance: 0.01,
            priceImpact: 0.005,
            sources: [],
            fees: [],
            baseProvider: { id: "wormhole", name: "Wormhole" },
            allowanceTarget: "0xBridgeAllowance",
            approvalExactAmount: "0",
            exchangeAddress: "0xBridgeExchange",
            value: "0",
            transactionData: transactionData,
            gas: 300000,
          },
        ],
      });

      mockPhantomClient.signAndSendTransaction.mockResolvedValue(signedTransaction);

      const result = await swapperClient.bridge({
        walletId,
        sellToken: {
          type: "address",
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
          networkId: NetworkId.ETHEREUM_MAINNET,
        },
        buyToken: {
          type: "address",
          address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
          networkId: NetworkId.SOLANA_MAINNET,
        },
        sellAmount: "1000000000",
        destinationNetworkId: NetworkId.SOLANA_MAINNET,
        slippageTolerance: 0.01,
      });

      expect(result).toBe(signedTransaction);
      expect(mockPhantomClient.getWalletAddresses).toHaveBeenCalledWith(walletId);
      expect(mockSwapperSDK.getQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { address: "0xEthAddress", networkId: NetworkId.ETHEREUM_MAINNET },
          to: { address: "SolanaAddress", networkId: NetworkId.SOLANA_MAINNET },
        })
      );
    });

    it("should throw error for multi-step bridge transactions", async () => {
      const walletId = "test-wallet-id";
      
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: AddressType.ethereum, address: "0xAddr1" },
        { addressType: AddressType.solana, address: "SolAddr" },
      ]);

      // Mock cross-chain quote with steps
      mockSwapperSDK.getQuotes.mockResolvedValue({
        type: "bridge",
        quotes: [
          {
            sellAmount: "1000000000",
            buyAmount: "2000000",
            slippageTolerance: 0.01,
            executionDuration: 600,
            steps: [
              { type: "swap", provider: "uniswap" },
              { type: "bridge", provider: "wormhole" },
            ],
            baseProvider: { id: "multi", name: "Multi-step" },
          },
        ],
      });

      await expect(
        swapperClient.bridge({
          walletId,
          sellToken: {
            type: "address",
            address: "0xToken",
            networkId: NetworkId.ETHEREUM_MAINNET,
          },
          buyToken: {
            type: "address",
            address: "SolToken",
            networkId: NetworkId.SOLANA_MAINNET,
          },
          sellAmount: "1000000000",
          destinationNetworkId: NetworkId.SOLANA_MAINNET,
        })
      ).rejects.toThrow("Multi-step bridge transactions are not yet supported");
    });
  });

  describe("helper methods", () => {
    it("should get bridgeable tokens", async () => {
      const mockTokens = {
        tokens: ["solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
      };
      
      mockSwapperSDK.getBridgeableTokens.mockResolvedValue(mockTokens);
      
      const result = await swapperClient.getBridgeableTokens();
      
      expect(result).toBe(mockTokens);
      expect(mockSwapperSDK.getBridgeableTokens).toHaveBeenCalled();
    });

    it("should get bridge status", async () => {
      const requestId = "bridge-request-123";
      const mockStatus = {
        status: "pending",
        details: "Processing bridge",
        inTxHashes: ["0xHash1"],
        txHashes: [],
        time: 1234567890,
        originChainId: 1,
        destinationChainId: 101,
      };
      
      mockSwapperSDK.getIntentsStatus.mockResolvedValue(mockStatus);
      
      const result = await swapperClient.getBridgeStatus(requestId);
      
      expect(result).toBe(mockStatus);
      expect(mockSwapperSDK.getIntentsStatus).toHaveBeenCalledWith({ requestId });
    });

    it("should initialize bridge", async () => {
      const walletId = "test-wallet";
      const mockResponse = {
        depositAddress: "bridge:deposit:address",
        orderAssetId: 123,
        usdcPrice: "1.0",
      };
      
      mockPhantomClient.getWalletAddresses.mockResolvedValue([
        { addressType: AddressType.ethereum, address: "0xEthAddr" },
        { addressType: AddressType.solana, address: "SolanaDestAddr" },
      ]);
      
      mockSwapperSDK.initializeBridge.mockResolvedValue(mockResponse);
      
      const result = await swapperClient.initializeBridge(
        walletId,
        "ethereum:0xUSDC",
        "solana:USDC",
        NetworkId.SOLANA_MAINNET
      );
      
      expect(result).toBe(mockResponse);
      expect(mockSwapperSDK.initializeBridge).toHaveBeenCalledWith({
        sellToken: "ethereum:0xUSDC",
        buyToken: "solana:USDC",
        takerDestination: "SolanaDestAddr",
      });
    });
  });
});