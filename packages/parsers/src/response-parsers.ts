/**
 * Chain-specific transaction and message response parsing
 * This module contains the specific parsing logic for each blockchain network
 */

import type { NetworkId } from "@phantom/constants";
import { getExplorerUrl } from "@phantom/constants";
import { base64urlDecode } from "@phantom/base64url";
import { Buffer } from "buffer";
import bs58 from "bs58";

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
    }
  } else {
    return {
      rawTransaction: base64RawTransaction,
    }
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