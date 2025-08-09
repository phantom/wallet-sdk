import type { PhantomClient } from "./PhantomClient";
import SwapperSDK, {
  type GetQuotesParams,
  type SwapperSolanaQuoteRepresentation,
  type SwapperEvmQuoteRepresentation,
  type GenerateAndVerifyAddressResponse,
  type GetBridgeableTokensResponse,
  type GetIntentsStatusResponse,
  type Token,
  type SwapperNetworkId,
} from "@phantom/swapper-sdk";
import { getNetworkConfig } from "./constants";
import type { SignedTransaction } from "./types";
import type { NetworkId } from "./caip2-mappings";

// Re-export types that users will need
export type { Token } from "@phantom/swapper-sdk";

interface SwapParams {
  walletId: string;
  sellToken: Token;
  buyToken: Token;
  sellAmount: string;
  slippageTolerance?: number;
  autoSlippage?: boolean;
}

interface BridgeParams {
  walletId: string;
  sellToken: Token;
  buyToken: Token;
  sellAmount: string;
  destinationNetworkId: NetworkId;
  slippageTolerance?: number;
  autoSlippage?: boolean;
}

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export class SwapperClient {
  private phantomClient: PhantomClient;
  private swapperSDK: SwapperSDK;
  private defaultRetryOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  constructor(phantomClient: PhantomClient, swapperConfig?: { apiUrl?: string; debug?: boolean }) {
    this.phantomClient = phantomClient;
    this.swapperSDK = new SwapperSDK({
      apiUrl: swapperConfig?.apiUrl,
      options: { debug: swapperConfig?.debug },
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const opts = { ...this.defaultRetryOptions, ...options };
    let lastError: Error | undefined;
    let delay = opts.initialDelay!;

    for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === opts.maxAttempts) {
          break;
        }

        // Log retry attempt
        // console.log(`Attempt ${attempt} failed, retrying after ${delay}ms...`, error);
        await this.delay(delay);
        
        delay = Math.min(delay * opts.backoffFactor!, opts.maxDelay!);
      }
    }

    throw lastError || new Error("Max retry attempts reached");
  }

  private isEvmNetwork(networkId: NetworkId): boolean {
    return networkId.startsWith("eip155:");
  }

  private async approveTokenIfNeeded(
    walletId: string,
    quote: SwapperEvmQuoteRepresentation,
    networkId: NetworkId,
  ): Promise<void> {
    if (!quote.approvalExactAmount || quote.approvalExactAmount === "0") {
      return;
    }

    // Token approval required
    // console.log(`Token approval required. Amount: ${quote.approvalExactAmount}`);
    
    // TODO: Implement ERC20 approval transaction
    // This would involve:
    // 1. Creating an approval transaction for the token contract
    // 2. Signing and sending it via phantomClient.signAndSendTransaction
    // For now, we'll throw an error indicating manual approval is needed
    
    throw new Error(
      `Token approval required for ${quote.approvalExactAmount}. ` +
      `Please approve the token at ${quote.allowanceTarget} before swapping.`
    );
  }

  async swap(params: SwapParams): Promise<SignedTransaction> {
    try {
      // Get all wallet addresses (uses default derivation paths)
      const addresses = await this.phantomClient.getWalletAddresses(params.walletId);
      
      // Find the right address based on the network
      const networkConfig = getNetworkConfig(params.sellToken.networkId as NetworkId);
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${params.sellToken.networkId}`);
      }
      
      const walletAddress = addresses.find(
        addr => addr.addressType === networkConfig.addressFormat as any
      );
      
      if (!walletAddress) {
        throw new Error(
          `No ${networkConfig.addressFormat} address found for wallet ${params.walletId}`
        );
      }
      
      // Prepare quote parameters
      const quoteParams: GetQuotesParams = {
        sellToken: params.sellToken,
        buyToken: params.buyToken,
        sellAmount: params.sellAmount,
        from: {
          address: walletAddress.address,
          networkId: params.sellToken.networkId as SwapperNetworkId,
        },
        slippageTolerance: params.slippageTolerance,
        autoSlippage: params.autoSlippage,
      };

      // Get quotes with retry logic
      const quotesResponse = await this.retryWithBackoff(
        () => this.swapperSDK.getQuotes(quoteParams)
      );

      if (!quotesResponse.quotes || quotesResponse.quotes.length === 0) {
        throw new Error("No swap quotes available");
      }

      // Get the first (best) quote
      const quote = quotesResponse.quotes[0];
      
      // Handle different quote types
      let transactionData: string;
      
      if ("transactionData" in quote) {
        if (Array.isArray(quote.transactionData)) {
          // Solana quote
          const solanaQuote = quote as SwapperSolanaQuoteRepresentation;
          if (solanaQuote.transactionData.length === 0) {
            throw new Error("No transaction data in Solana quote");
          }
          transactionData = solanaQuote.transactionData[0];
        } else {
          // EVM quote
          const evmQuote = quote as SwapperEvmQuoteRepresentation;
          
          // Check if token approval is needed for EVM chains
          if (this.isEvmNetwork(params.sellToken.networkId as NetworkId)) {
            await this.approveTokenIfNeeded(params.walletId, evmQuote, params.sellToken.networkId as NetworkId);
          }
          
          transactionData = evmQuote.transactionData;
        }
      } else {
        throw new Error("Unsupported quote type - no transaction data found");
      }

      // Sign and send the transaction
      const result = await this.phantomClient.signAndSendTransaction({
        walletId: params.walletId,
        transaction: transactionData,
        networkId: params.sellToken.networkId as NetworkId,
      });

      return result;
    } catch (error) {
      // Log swap failure
      // console.error("Swap failed:", error);
      throw error;
    }
  }

  async bridge(params: BridgeParams): Promise<SignedTransaction> {
    try {
      // Get all wallet addresses
      const addresses = await this.phantomClient.getWalletAddresses(params.walletId);
      
      // Find source address
      const sourceNetworkConfig = getNetworkConfig(params.sellToken.networkId as NetworkId);
      if (!sourceNetworkConfig) {
        throw new Error(`Unsupported source network: ${params.sellToken.networkId}`);
      }
      
      const sourceAddress = addresses.find(
        addr => addr.addressType === sourceNetworkConfig.addressFormat as any
      );
      
      if (!sourceAddress) {
        throw new Error(
          `No ${sourceNetworkConfig.addressFormat} address found for wallet ${params.walletId}`
        );
      }
      
      // Find destination address
      const destNetworkConfig = getNetworkConfig(params.destinationNetworkId);
      if (!destNetworkConfig) {
        throw new Error(`Unsupported destination network: ${params.destinationNetworkId}`);
      }
      
      const destAddress = addresses.find(
        addr => addr.addressType === destNetworkConfig.addressFormat as any
      );
      
      if (!destAddress) {
        throw new Error(
          `No ${destNetworkConfig.addressFormat} address found for wallet ${params.walletId}`
        );
      }
      
      // Prepare quote parameters for bridge (cross-chain swap)
      const quoteParams: GetQuotesParams = {
        sellToken: params.sellToken,
        buyToken: params.buyToken,
        sellAmount: params.sellAmount,
        from: {
          address: sourceAddress.address,
          networkId: params.sellToken.networkId as SwapperNetworkId,
        },
        to: {
          address: destAddress.address,
          networkId: params.destinationNetworkId as SwapperNetworkId,
        },
        slippageTolerance: params.slippageTolerance,
        autoSlippage: params.autoSlippage,
      };

      // Get bridge quotes with retry logic
      const quotesResponse = await this.retryWithBackoff(
        () => this.swapperSDK.getQuotes(quoteParams)
      );

      if (!quotesResponse.quotes || quotesResponse.quotes.length === 0) {
        throw new Error("No bridge quotes available");
      }

      // Get the first (best) quote
      const quote = quotesResponse.quotes[0];
      
      // Handle different quote types for bridge
      let transactionData: string;
      
      if ("transactionData" in quote) {
        if (Array.isArray(quote.transactionData)) {
          // Solana bridge quote
          const solanaQuote = quote as SwapperSolanaQuoteRepresentation;
          if (solanaQuote.transactionData.length === 0) {
            throw new Error("No transaction data in Solana bridge quote");
          }
          transactionData = solanaQuote.transactionData[0];
        } else {
          // EVM bridge quote
          const evmQuote = quote as SwapperEvmQuoteRepresentation;
          
          // Check if token approval is needed for EVM chains
          if (this.isEvmNetwork(params.sellToken.networkId as NetworkId)) {
            await this.approveTokenIfNeeded(params.walletId, evmQuote, params.sellToken.networkId as NetworkId);
          }
          
          transactionData = evmQuote.transactionData;
        }
      } else if ("steps" in quote) {
        // Cross-chain quote with steps
        throw new Error(
          "Multi-step bridge transactions are not yet supported. " +
          "Please use the SwapperSDK directly for complex bridge operations."
        );
      } else {
        throw new Error("Unsupported bridge quote type");
      }

      // Sign and send the bridge transaction
      const result = await this.phantomClient.signAndSendTransaction({
        walletId: params.walletId,
        transaction: transactionData,
        networkId: params.sellToken.networkId as NetworkId,
      });

      return result;
    } catch (error) {
      // Log bridge failure  
      // console.error("Bridge failed:", error);
      throw error;
    }
  }

  async getBridgeableTokens(): Promise<GetBridgeableTokensResponse> {
    return this.swapperSDK.getBridgeableTokens();
  }

  async getBridgeStatus(requestId: string): Promise<GetIntentsStatusResponse> {
    return this.swapperSDK.getIntentsStatus({ requestId });
  }

  async initializeBridge(
    walletId: string,
    sellToken: string,
    buyToken: string,
    destinationNetworkId: NetworkId,
  ): Promise<GenerateAndVerifyAddressResponse> {
    // Get all wallet addresses
    const addresses = await this.phantomClient.getWalletAddresses(walletId);
    
    // Find destination address
    const destNetworkConfig = getNetworkConfig(destinationNetworkId);
    if (!destNetworkConfig) {
      throw new Error(`Unsupported destination network: ${destinationNetworkId}`);
    }
    
    const destAddress = addresses.find(
      addr => addr.addressType === destNetworkConfig.addressFormat
    );
    
    if (!destAddress) {
      throw new Error(
        `No ${destNetworkConfig.addressFormat} address found for wallet ${walletId}`
      );
    }
    
    return this.swapperSDK.initializeBridge({
      sellToken,
      buyToken,
      takerDestination: destAddress.address,
    });
  }
}