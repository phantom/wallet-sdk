/**
 * Chain-specific transaction and message response parsing
 * This module contains the specific parsing logic for each blockchain network
 */

import { base64urlDecode } from "@phantom/base64url";
import type { NetworkId } from "@phantom/constants";
import { getExplorerUrl } from "@phantom/constants";
import { isEthereumChain } from "@phantom/utils";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";

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
 * For Ethereum chains, converts base64url to hex format
 */
export function parseTransactionResponse(
  base64RawTransaction: string,
  networkId: NetworkId,
  hash?: string,
): ParsedTransactionResult {
  // For Ethereum chains, decode base64url to hex format
  let rawTransaction = base64RawTransaction;
  if (isEthereumChain(networkId)) {
    try {
      const txBytes = base64urlDecode(base64RawTransaction);
      rawTransaction = "0x" + Buffer.from(txBytes).toString("hex");
    } catch (error) {
      // Fallback: assume it's already hex format
      rawTransaction = base64RawTransaction.startsWith("0x") ? base64RawTransaction : "0x" + base64RawTransaction;
    }
  }

  if (hash) {
    return {
      hash,
      rawTransaction,
      blockExplorer: getExplorerUrl(networkId, "transaction", hash),
    };
  } else {
    return {
      rawTransaction,
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
  const signatureBytes = base64urlDecode(base64Response);
  const signature = "0x" + Buffer.from(signatureBytes).toString("hex");

  return {
    signature,
    rawSignature: base64Response,
  };
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
    return deserializeSolanaTransaction(transactionBytes);
  } catch (error) {
    // Fallback: return null if both parsing methods fail
    return null;
  }
}

/**
 * Deserialize Solana transaction from Uint8Array bytes
 * Supports both legacy Transaction and VersionedTransaction formats
 */
export function deserializeSolanaTransaction(transactionBytes: Uint8Array): Transaction | VersionedTransaction {
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
}
