import { createPublicClient, http, parseEther, parseUnits, formatUnits, getContract } from "viem";
import { mainnet, sepolia, polygon, polygonMumbai, arbitrum, arbitrumSepolia, optimism, optimismSepolia, base, baseSepolia, bsc, bscTestnet, avalanche, avalancheFuji } from "viem/chains";
import type { EVMTransactionBuilder, SendTokenTransactionParams, TransactionResult } from "../types";
import { getRPCUrl } from "../config";

// ERC-20 ABI for token transfers
const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
] as const;

export class EVMTransactionBuilderImpl implements EVMTransactionBuilder {
  private getChain(networkId: string) {
    const [, network] = networkId.toLowerCase().split(':');
    
    switch (network) {
      case '1': return mainnet;
      case '11155111': return sepolia;
      case '5': return sepolia; // Goerli deprecated, fallback to Sepolia
      case '137': return polygon;
      case '80001': return polygonMumbai;
      case '42161': return arbitrum;
      case '421614': return arbitrumSepolia;
      case '10': return optimism;
      case '11155420': return optimismSepolia;
      case '8453': return base;
      case '84532': return baseSepolia;
      case '56': return bsc;
      case '97': return bscTestnet;
      case '43114': return avalanche;
      case '43113': return avalancheFuji;
      default: return mainnet;
    }
  }

  private getPublicClient(networkId: string) {
    const chain = this.getChain(networkId);
    const rpcUrl = getRPCUrl(networkId);
    
    return createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  async createSendTokenTransaction(params: SendTokenTransactionParams): Promise<TransactionResult> {
    try {
      const publicClient = this.getPublicClient(params.networkId);

      // Handle native token transfer (ETH, MATIC, etc.)
      if (!params.token) {
        return this.createNativeTransfer(params);
      }

      // Handle ERC-20 token transfer
      return await this.createERC20Transfer(publicClient, params);
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create EVM transaction: ${error.message}`,
      };
    }
  }

  private createNativeTransfer(params: SendTokenTransactionParams): TransactionResult {
    try {
      // Convert amount to wei
      const value = typeof params.amount === 'string' 
        ? parseEther(params.amount)
        : typeof params.amount === 'bigint'
        ? params.amount
        : parseEther(params.amount.toString());

      const transaction = {
        to: params.to as `0x${string}`,
        value,
        // Gas limit and gas price will be estimated by the wallet
      };

      return {
        transaction,
      };
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create native transfer: ${error.message}`,
      };
    }
  }

  private async createERC20Transfer(publicClient: any, params: SendTokenTransactionParams): Promise<TransactionResult> {
    try {
      const tokenContract = getContract({
        address: params.token as `0x${string}`,
        abi: ERC20_ABI,
        client: publicClient,
      });

      // Get token decimals if not provided
      let decimals = params.decimals;
      if (!decimals) {
        try {
          decimals = await tokenContract.read.decimals();
        } catch (error) {
          decimals = 18; // Default to 18 decimals
        }
      }

      // Convert amount to token units
      const value = typeof params.amount === 'string'
        ? parseUnits(params.amount, decimals)
        : typeof params.amount === 'bigint'
        ? params.amount
        : parseUnits(params.amount.toString(), decimals);

      // Create transfer transaction data
      const transaction = {
        to: params.token as `0x${string}`,
        data: tokenContract.write.transfer.toString(), // This needs proper encoding
        // Note: This is a simplified version. In practice, you'd need to properly encode the function call
      };

      return {
        transaction: null,
        error: "ERC-20 token transfers need proper function encoding. Please implement contract call encoding.",
      };
    } catch (error: any) {
      return {
        transaction: null,
        error: `Failed to create ERC-20 transfer: ${error.message}`,
      };
    }
  }
}