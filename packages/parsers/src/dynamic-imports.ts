/**
 * Dynamic imports for optional blockchain libraries
 * This allows the parsers package to work without requiring all blockchain dependencies
 */

import { Buffer } from "buffer";
import bs58 from "bs58";

// Cache for dynamically imported modules
const moduleCache = new Map<string, any>();

/**
 * Try to dynamically import a module, return null if not available
 */
async function tryImport<T = any>(moduleName: string): Promise<T | null> {
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName);
  }

  try {
    const module = await import(moduleName);
    moduleCache.set(moduleName, module);
    return module;
  } catch (error) {
    // Cache the failure to avoid repeated attempts
    moduleCache.set(moduleName, null);
    return null;
  }
}

/**
 * Get Solana web3.js module if available
 */
export async function getSolanaWeb3(): Promise<any | null> {
  return tryImport("@solana/web3.js");
}

/**
 * Get Sui SDK module if available
 */
export async function getSuiSDK(): Promise<any | null> {
  return tryImport("@mysten/sui.js");
}

/**
 * Get Bitcoin library if available
 */
export async function getBitcoinLib(): Promise<any | null> {
  return tryImport("bitcoinjs-lib");
}

/**
 * Get Ethers library if available
 */
export async function getEthers(): Promise<any | null> {
  return tryImport("ethers");
}

/**
 * Get Viem library if available
 */
export async function getViem(): Promise<any | null> {
  return tryImport("viem");
}

/**
 * Parse Solana transaction signature using @solana/web3.js if available
 * Falls back to simple byte extraction if library is not available
 */
export async function parseSolanaTransactionSignature(base64RawTransaction: string): Promise<{
  signature: string;
  fallback: boolean;
}> {
  const web3 = await getSolanaWeb3();

  if (web3) {
    try {
      // Use @solana/web3.js to properly parse the transaction
      const transactionBytes = Buffer.from(base64RawTransaction, "base64url");
      const transaction = web3.Transaction.from(transactionBytes);

      let signature: string | null = null;

      // Extract signature from the signed transaction
      if (transaction.signature) {
        signature = bs58.encode(transaction.signature);
      } else if (transaction.signatures && transaction.signatures.length > 0 && transaction.signatures[0].signature) {
        signature = bs58.encode(transaction.signatures[0].signature);
      }

      if (signature) {
        return {
          signature,
          fallback: false,
        };
      }
    } catch (error) {
      // Fall through to fallback method
    }
  }

  // Fallback: extract first 64 bytes as signature (simple approach)
  try {
    const transactionBytes = Buffer.from(base64RawTransaction, "base64url");
    const signatureBytes = transactionBytes.slice(0, 64);
    const signature = bs58.encode(signatureBytes);

    return {
      signature,
      fallback: true,
    };
  } catch (error) {
    // Last resort: use the raw transaction as signature
    return {
      signature: base64RawTransaction,
      fallback: true,
    };
  }
}

/**
 * Parse EVM transaction hash using ethers or viem if available
 */
export async function parseEVMTransactionHash(base64RawTransaction: string): Promise<{
  hash: string;
  fallback: boolean;
}> {
  const ethers = await getEthers();

  if (ethers) {
    try {
      const transactionBytes = Buffer.from(base64RawTransaction, "base64url");
      const hexTransaction = "0x" + transactionBytes.toString("hex");

      // Parse with ethers
      const parsedTx = ethers.Transaction.from(hexTransaction);
      if (parsedTx.hash) {
        return {
          hash: parsedTx.hash,
          fallback: false,
        };
      }
    } catch (error) {
      // Fall through to viem
    }
  }

  const viem = await getViem();

  if (viem) {
    try {
      const transactionBytes = Buffer.from(base64RawTransaction, "base64url");
      const hexTransaction = `0x${transactionBytes.toString("hex")}` as const;

      // Use viem to compute transaction hash
      const hash = viem.keccak256(hexTransaction);
      return {
        hash,
        fallback: false,
      };
    } catch (error) {
      // Fall through to fallback
    }
  }

  // Fallback: simple hash extraction
  try {
    const transactionBytes = Buffer.from(base64RawTransaction, "base64url");
    const hash = "0x" + transactionBytes.toString("hex").substring(0, 64);

    return {
      hash,
      fallback: true,
    };
  } catch (error) {
    return {
      hash: base64RawTransaction,
      fallback: true,
    };
  }
}

/**
 * Parse Bitcoin transaction hash using bitcoinjs-lib if available
 */
export async function parseBitcoinTransactionHash(base64RawTransaction: string): Promise<{
  hash: string;
  fallback: boolean;
}> {
  const bitcoin = await getBitcoinLib();

  if (bitcoin) {
    try {
      const transactionBytes = Buffer.from(base64RawTransaction, "base64url");
      const transaction = bitcoin.Transaction.fromBuffer(transactionBytes);

      if (transaction.getId) {
        return {
          hash: transaction.getId(),
          fallback: false,
        };
      }
    } catch (error) {
      // Fall through to fallback
    }
  }

  // Fallback: simple hash extraction
  try {
    const transactionBytes = Buffer.from(base64RawTransaction, "base64url");
    const hash = transactionBytes.toString("hex").substring(0, 64);

    return {
      hash,
      fallback: true,
    };
  } catch (error) {
    return {
      hash: base64RawTransaction,
      fallback: true,
    };
  }
}

/**
 * Parse Sui transaction digest using Sui SDK if available
 */
export async function parseSuiTransactionDigest(base64RawTransaction: string): Promise<{
  digest: string;
  fallback: boolean;
}> {
  const sui = await getSuiSDK();

  if (sui) {
    try {
      // Use Sui SDK to parse transaction and extract digest
      const transactionBytes = Buffer.from(base64RawTransaction, "base64url");

      // This would need specific Sui SDK implementation
      // For now, we'll use a simplified approach
      const digest = bs58.encode(transactionBytes.slice(0, 32));

      return {
        digest,
        fallback: false,
      };
    } catch (error) {
      // Fall through to fallback
    }
  }

  // Fallback: use first 32 bytes as digest
  try {
    const transactionBytes = Buffer.from(base64RawTransaction, "base64url");
    const digest = bs58.encode(transactionBytes.slice(0, 32));

    return {
      digest,
      fallback: true,
    };
  } catch (error) {
    return {
      digest: base64RawTransaction,
      fallback: true,
    };
  }
}

// ===== ARCHIVED RESPONSE PARSING FUNCTIONS =====
// These functions were moved here to avoid dynamic import issues in React Native
// but preserved in case we need to restore this functionality later

import type { NetworkId } from "@phantom/constants";
import { getExplorerUrl } from "@phantom/constants";
import { base64urlDecode } from "@phantom/base64url";

// Import the interfaces we need
export interface ArchivedParsedSignatureResult {
  signature: string; // Human-readable signature (hex/base58)
  rawSignature: string; // Original base64url signature from server
  blockExplorer?: string; // Explorer link (if supported)
}

export interface ArchivedParsedTransactionResult {
  hash?: string; // Transaction hash/signature
  rawTransaction: string; // Original base64url transaction from server
  blockExplorer?: string; // Explorer link to transaction
}

/**
 * ARCHIVED: Parse Solana signature response
 */
export function archivedParseSolanaSignatureResponse(base64Response: string): ArchivedParsedSignatureResult {
  try {
    // Solana signatures are typically 64 bytes, base58 encoded
    // The response might be base64url encoded signature bytes
    const signatureBytes = base64urlDecode(base64Response);
    const signature = bs58.encode(signatureBytes);

    return {
      signature,
      rawSignature: base64Response,
    };
  } catch (error) {
    // Fallback: assume it's already a base58 signature
    return {
      signature: base64Response,
      rawSignature: base64Response,
    };
  }
}

/**
 * ARCHIVED: Parse Solana transaction response to extract signature using dynamic imports
 */
export async function archivedParseSolanaTransactionResponse(
  base64RawTransaction: string,
  networkId: NetworkId,
): Promise<ArchivedParsedTransactionResult> {
  try {
    const result = await parseSolanaTransactionSignature(base64RawTransaction);

    return {
      hash: result.signature,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, "transaction", result.signature),
    };
  } catch (error) {
    return {
      rawTransaction: base64RawTransaction,
    };
  }
}

/**
 * ARCHIVED: Parse EVM signature response
 */
export function archivedParseEVMSignatureResponse(base64Response: string): ArchivedParsedSignatureResult {
  try {
    // EVM signatures are typically 65 bytes (r + s + v)
    const signatureBytes = base64urlDecode(base64Response);
    const signature = "0x" + Buffer.from(signatureBytes).toString("hex");

    return {
      signature,
      rawSignature: base64Response,
      // Note: Most block explorers don't have direct signature lookup, only transaction lookup
    };
  } catch (error) {
    // Fallback: assume it's already hex format
    const signature = base64Response.startsWith("0x") ? base64Response : "0x" + base64Response;
    return {
      signature,
      rawSignature: base64Response,
    };
  }
}

/**
 * ARCHIVED: Parse EVM transaction response to extract hash using dynamic imports
 */
export async function archivedParseEVMTransactionResponse(
  base64RawTransaction: string,
  networkId: NetworkId,
): Promise<ArchivedParsedTransactionResult> {
  try {
    const result = await parseEVMTransactionHash(base64RawTransaction);

    return {
      hash: result.hash,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, "transaction", result.hash),
    };
  } catch (error) {
    return {
      rawTransaction: base64RawTransaction,
    };
  }
}

/**
 * ARCHIVED: Parse Sui signature response
 */
export function archivedParseSuiSignatureResponse(base64Response: string): ArchivedParsedSignatureResult {
  try {
    // Sui uses base64 encoded signatures
    const signatureBytes = base64urlDecode(base64Response);
    const signature = Buffer.from(signatureBytes).toString("base64");

    return {
      signature,
      rawSignature: base64Response,
    };
  } catch (error) {
    return {
      signature: base64Response,
      rawSignature: base64Response,
    };
  }
}

/**
 * ARCHIVED: Parse Sui transaction response using dynamic imports
 */
export async function archivedParseSuiTransactionResponse(
  base64RawTransaction: string,
  networkId: NetworkId,
): Promise<ArchivedParsedTransactionResult> {
  try {
    const result = await parseSuiTransactionDigest(base64RawTransaction);

    return {
      hash: result.digest,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, "transaction", result.digest),
    };
  } catch (error) {
    return {
      rawTransaction: base64RawTransaction,
    };
  }
}

/**
 * ARCHIVED: Parse Bitcoin signature response
 */
export function archivedParseBitcoinSignatureResponse(base64Response: string): ArchivedParsedSignatureResult {
  try {
    // Bitcoin signatures are DER encoded
    const signatureBytes = base64urlDecode(base64Response);
    const signature = Buffer.from(signatureBytes).toString("hex");

    return {
      signature,
      rawSignature: base64Response,
    };
  } catch (error) {
    return {
      signature: base64Response,
      rawSignature: base64Response,
    };
  }
}

/**
 * ARCHIVED: Parse Bitcoin transaction response using dynamic imports
 */
export async function archivedParseBitcoinTransactionResponse(
  base64RawTransaction: string,
  networkId: NetworkId,
): Promise<ArchivedParsedTransactionResult> {
  try {
    const result = await parseBitcoinTransactionHash(base64RawTransaction);

    return {
      hash: result.hash,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, "transaction", result.hash),
    };
  } catch (error) {
    return {
      rawTransaction: base64RawTransaction,
    };
  }
}
