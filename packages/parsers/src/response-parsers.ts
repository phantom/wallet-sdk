/**
 * Chain-specific transaction and message response parsing
 * This module contains the specific parsing logic for each blockchain network
 */

import { base64urlDecode } from "@phantom/base64url";
import type { NetworkId } from "@phantom/constants";
import { getExplorerUrl } from "@phantom/constants";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";

/**
 * Convert base64url signature to hex format
 */
export function base64UrlSignatureToHex(base64UrlSignature: string): string {
  try {
    const signatureBytes = base64urlDecode(base64UrlSignature);
    return "0x" + Buffer.from(signatureBytes).toString("hex");
  } catch (error) {
    // Fallback: assume it's already hex format
    return base64UrlSignature.startsWith("0x") ? base64UrlSignature : "0x" + base64UrlSignature;
  }
}

/**
 * Extract signature from EIP-2718 encoded transaction
 * EIP-2718 defines a typed transaction envelope format
 */
export function extractSignatureFromEip2718(bytes: Uint8Array): { r: string; s: string; v: number } {
  try {
    // For type 2 (EIP-1559) transactions, the format is:
    // 0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList, yParity, r, s])
    // For type 1 (EIP-2930) transactions:
    // 0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, yParity, r, s])
    // For legacy transactions (type 0):
    // rlp([nonce, gasPrice, gasLimit, to, value, data, v, r, s])

    // This is a simplified extraction - for now we'll use viem if available
    // Otherwise we need to implement full RLP decoding

    // Try to use viem for proper decoding
    try {
      // Dynamic import to handle optional dependency
      const viem = require("viem");
      const transaction = viem.parseTransaction(bytes);

      return {
        r: transaction.r || "0x0",
        s: transaction.s || "0x0",
        v: transaction.v ? Number(transaction.v) : 0,
      };
    } catch (viemError) {
      // Fallback: return placeholder values
      // In production, proper RLP decoding should be implemented
      throw new Error("Failed to extract signature from EIP-2718 transaction. Viem is required for this operation.");
    }
  } catch (error) {
    throw new Error(`Failed to extract signature: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export interface ParsedSignatureResult {
  signature: string; // Human-readable signature (hex/base58)
  rawSignature: string; // Original base64url signature from server
  blockExplorer?: string; // Explorer link (if supported)
}

export interface ParsedTransactionResult {
  hash?: string; // Transaction hash/signature
  rawTransaction: string; // Original base64url transaction from server
  blockExplorer?: string; // Explorer link to transaction
}

/**
 * Parse a signed message response from base64 to human-readable format
 */
export function parseSignMessageResponse(base64Response: string, networkId: NetworkId): ParsedSignatureResult {
  const networkPrefix = networkId.split(":")[0].toLowerCase();

  switch (networkPrefix) {
    case "solana":
      return parseSolanaSignatureResponse(base64Response);
    case "eip155": // EVM chains
    case "ethereum":
      return parseEVMSignatureResponse(base64Response);
    case "sui":
      return parseSuiSignatureResponse(base64Response);
    case "bip122": // Bitcoin
    case "bitcoin":
      return parseBitcoinSignatureResponse(base64Response);
    default:
      // Fallback: return the signature as-is
      return {
        signature: base64Response,
        rawSignature: base64Response,
      };
  }
}

/**
 * Parse a transaction response from base64 rawTransaction to extract hash
 */
export function parseTransactionResponse(
  base64RawTransaction: string,
  networkId: NetworkId,
  hash?: string,
): ParsedTransactionResult {
  if (hash) {
    return {
      hash,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, "transaction", hash),
    };
  } else {
    return {
      rawTransaction: base64RawTransaction,
    };
  }
}

/**
 * Parse Solana signature response
 */
function parseSolanaSignatureResponse(base64Response: string): ParsedSignatureResult {
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
 * Parse EVM signature response
 */
function parseEVMSignatureResponse(base64Response: string): ParsedSignatureResult {
  try {
    // EVM signatures are typically 65 bytes (r + s + v)
    const signatureBytes = base64urlDecode(base64Response);

    // KMS backend returns recovery_id (0 or 1) as the last byte
    // Ethereum expects v = 27 or 28, so we need to convert it
    if (signatureBytes.length === 65) {
      const recoveryId = signatureBytes[64];
      // Only convert if it's 0 or 1 (recovery_id format)
      if (recoveryId === 0 || recoveryId === 1) {
        // Convert recovery_id to Ethereum v value
        signatureBytes[64] = recoveryId + 27;
      }
    }

    // Use helper function to convert to hex
    const signature = base64UrlSignatureToHex(Buffer.from(signatureBytes).toString("base64url"));

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
 * Parse Sui signature response
 */
function parseSuiSignatureResponse(base64Response: string): ParsedSignatureResult {
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
 * Parse Bitcoin signature response
 */
function parseBitcoinSignatureResponse(base64Response: string): ParsedSignatureResult {
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
 * Parse Solana signed transaction from base64url encoded transaction bytes
 * Supports both legacy Transaction and VersionedTransaction formats
 */
export function parseSolanaSignedTransaction(base64RawTransaction: string): Transaction | VersionedTransaction | null {
  try {
    // Use @phantom/base64url utility for proper browser compatibility
    const transactionBytes = base64urlDecode(base64RawTransaction);

    // First try to parse as a legacy Transaction
    try {
      const transaction = Transaction.from(transactionBytes);
      return transaction;
    } catch (legacyError) {
      // If legacy parsing fails, try as VersionedTransaction
      // Legacy parsing fails with specific error for versioned messages
      if (legacyError instanceof Error && legacyError.message.includes("Versioned messages")) {
        const versionedTransaction = VersionedTransaction.deserialize(transactionBytes);
        return versionedTransaction;
      }
      // Re-throw if it's a different error
      throw legacyError;
    }
  } catch (error) {
    // Fallback: return null if both parsing methods fail
    return null;
  }
}
