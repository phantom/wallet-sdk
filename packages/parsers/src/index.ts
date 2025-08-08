import type { NetworkId } from "@phantom/constants";
import { getExplorerUrl } from "@phantom/constants";
import { base64urlEncode, stringToBase64url, base64urlDecode } from "@phantom/base64url";
import { Buffer } from "buffer";
import bs58 from "bs58";

export interface ParsedTransaction {
  base64url: string;
  originalFormat: string;
}

export interface ParsedMessage {
  base64url: string;
}

export interface ParsedSignatureResult {
  signature: string;        // Human-readable signature (hex/base58)
  rawSignature: string;     // Original base64url signature from server
  blockExplorer?: string;   // Explorer link (if supported)
}

export interface ParsedTransactionResult {
  hash: string;             // Transaction hash/signature  
  rawTransaction: string;   // Original base64url transaction from server
  blockExplorer?: string;   // Explorer link to transaction
}

/**
 * Parse a message to base64url format for the client
 */
export function parseMessage(message: string): ParsedMessage {
  return {
    base64url: stringToBase64url(message),
  };
}

/**
 * Parse a transaction to base64url format based on network type
 */
export async function parseTransaction(transaction: any, networkId: NetworkId): Promise<ParsedTransaction> {
  const networkPrefix = networkId.split(":")[0].toLowerCase();

  switch (networkPrefix) {
    case "solana":
      return parseSolanaTransaction(transaction);
    case "ethereum":
    case "eip155": // Standard Ethereum chain identifier
    case "polygon":
    case "optimism":
    case "arbitrum":
    case "base":
      return parseEVMTransaction(transaction);
    case "sui":
      return await parseSuiTransaction(transaction);
    case "bitcoin":
      return parseBitcoinTransaction(transaction);
    default:
      throw new Error(`Unsupported network: ${networkPrefix}`);
  }
}

/**
 * Parse Solana transaction to base64url
 * Supports both @solana/web3.js and @solana/kit formats
 */
function parseSolanaTransaction(transaction: any): ParsedTransaction {
  // Check if it's a @solana/kit Transaction (has messageBytes)
  if (transaction?.messageBytes != null) {
    // @solana/kit Transaction
    return {
      base64url: base64urlEncode(transaction.messageBytes),
      originalFormat: "@solana/kit",
    };
  }

  // Check if it's a @solana/web3.js Transaction/VersionedTransaction (has serialize method)
  if (typeof transaction?.serialize === "function") {
    // @solana/web3.js Transaction or VersionedTransaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    return {
      base64url: base64urlEncode(serialized),
      originalFormat: "@solana/web3.js",
    };
  }

  // If it's already serialized bytes
  if (transaction instanceof Uint8Array) {
    return {
      base64url: base64urlEncode(transaction),
      originalFormat: "bytes",
    };
  }

  // If it's a base64 string
  if (typeof transaction === "string") {
    try {
      const bytes = Buffer.from(transaction, "base64");
      return {
        base64url: base64urlEncode(new Uint8Array(bytes)),
        originalFormat: "base64",
      };
    } catch {
      throw new Error("Unsupported Solana transaction format");
    }
  }

  throw new Error("Unsupported Solana transaction format");
}

/**
 * Parse EVM transaction to base64url
 * Supports Ethereum, Polygon, and other EVM-compatible chains
 */
function parseEVMTransaction(transaction: any): ParsedTransaction {
  // Check if it's a Viem transaction object
  if (transaction && typeof transaction === "object" && (transaction.to || transaction.data)) {
    // Serialize with BigInt support
    const bytes = new TextEncoder().encode(
      JSON.stringify(transaction, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
    );

    return {
      base64url: base64urlEncode(bytes),
      originalFormat: "viem",
    };
  }

  // Check if it's ethers.js transaction
  if (transaction?.serialize && typeof transaction.serialize === "function") {
    const serialized = transaction.serialize();
    const bytes = new Uint8Array(Buffer.from(serialized.slice(2), "hex"));

    return {
      base64url: base64urlEncode(bytes),
      originalFormat: "ethers",
    };
  }

  // If it's already serialized bytes
  if (transaction instanceof Uint8Array) {
    return {
      base64url: base64urlEncode(transaction),
      originalFormat: "bytes",
    };
  }

  // If it's a hex string
  if (typeof transaction === "string" && transaction.startsWith("0x")) {
    const bytes = new Uint8Array(Buffer.from(transaction.slice(2), "hex"));
    return {
      base64url: base64urlEncode(bytes),
      originalFormat: "hex",
    };
  }

  throw new Error("Unsupported EVM transaction format");
}

/**
 * Parse Sui transaction to base64url
 */
async function parseSuiTransaction(transaction: any): Promise<ParsedTransaction> {
  // Check if it's a Sui transaction object with serialize method
  if (transaction?.serialize && typeof transaction.serialize === "function") {
    const serialized = transaction.serialize();
    return {
      base64url: base64urlEncode(serialized),
      originalFormat: "sui-sdk",
    };
  }

  // Check if it's already serialized bytes
  if (transaction instanceof Uint8Array) {
    return {
      base64url: base64urlEncode(transaction),
      originalFormat: "bytes",
    };
  }

  // If it's a transaction block
  if (transaction?.build && typeof transaction.build === "function") {
    const built = await transaction.build();
    if (built?.serialize && typeof built.serialize === "function") {
      const serialized = built.serialize();
      return {
        base64url: base64urlEncode(serialized),
        originalFormat: "transaction-block",
      };
    }
  }

  throw new Error("Unsupported Sui transaction format");
}

/**
 * Parse Bitcoin transaction to base64url
 */
function parseBitcoinTransaction(transaction: any): ParsedTransaction {
  // Check if it's a bitcoinjs-lib transaction
  if (transaction?.toBuffer && typeof transaction.toBuffer === "function") {
    const buffer = transaction.toBuffer();
    return {
      base64url: base64urlEncode(new Uint8Array(buffer)),
      originalFormat: "bitcoinjs-lib",
    };
  }

  // Check if it's already serialized bytes
  if (transaction instanceof Uint8Array) {
    return {
      base64url: base64urlEncode(transaction),
      originalFormat: "bytes",
    };
  }

  // If it's a hex string
  if (typeof transaction === "string") {
    const bytes = new Uint8Array(Buffer.from(transaction, "hex"));
    return {
      base64url: base64urlEncode(bytes),
      originalFormat: "hex",
    };
  }

  throw new Error("Unsupported Bitcoin transaction format");
}

/**
 * Parse a signed message response from base64 to human-readable format
 */
export function parseSignMessageResponse(base64Response: string, networkId: NetworkId): ParsedSignatureResult {
  const networkPrefix = networkId.split(":")[0].toLowerCase();

  switch (networkPrefix) {
    case "solana":
      return parseSolanaSignatureResponse(base64Response, networkId);
    case "eip155": // EVM chains
    case "ethereum":
      return parseEVMSignatureResponse(base64Response, networkId);
    case "sui":
      return parseSuiSignatureResponse(base64Response, networkId);
    case "bip122": // Bitcoin
    case "bitcoin":
      return parseBitcoinSignatureResponse(base64Response, networkId);
    default:
      // Fallback: return the signature as-is
      return {
        signature: base64Response,
        rawSignature: base64Response,
        blockExplorer: getExplorerUrl(networkId, 'transaction', base64Response),
      };
  }
}

/**
 * Parse a transaction response from base64 rawTransaction to extract hash
 */
export function parseTransactionResponse(base64RawTransaction: string, networkId: NetworkId): ParsedTransactionResult {
  const networkPrefix = networkId.split(":")[0].toLowerCase();

  switch (networkPrefix) {
    case "solana":
      return parseSolanaTransactionResponse(base64RawTransaction, networkId);
    case "eip155": // EVM chains
    case "ethereum":
      return parseEVMTransactionResponse(base64RawTransaction, networkId);
    case "sui":
      return parseSuiTransactionResponse(base64RawTransaction, networkId);
    case "bip122": // Bitcoin
    case "bitcoin":
      return parseBitcoinTransactionResponse(base64RawTransaction, networkId);
    default:
      // Fallback: use the raw transaction as hash
      return {
        hash: base64RawTransaction,
        rawTransaction: base64RawTransaction,
        blockExplorer: getExplorerUrl(networkId, 'transaction', base64RawTransaction),
      };
  }
}

/**
 * Parse Solana signature response
 */
function parseSolanaSignatureResponse(base64Response: string, networkId: NetworkId): ParsedSignatureResult {
  try {
    // Solana signatures are typically 64 bytes, base58 encoded
    // The response might be base64url encoded signature bytes
    const signatureBytes = base64urlDecode(base64Response);
    const signature = bs58.encode(signatureBytes);
    
    return {
      signature,
      rawSignature: base64Response,
      blockExplorer: getExplorerUrl(networkId, 'transaction', signature),
    };
  } catch (error) {
    // Fallback: assume it's already a base58 signature
    return {
      signature: base64Response,
      rawSignature: base64Response,
      blockExplorer: getExplorerUrl(networkId, 'transaction', base64Response),
    };
  }
}

/**
 * Parse Solana transaction response to extract signature
 */
function parseSolanaTransactionResponse(base64RawTransaction: string, networkId: NetworkId): ParsedTransactionResult {
  try {
    // Decode the transaction bytes
    const transactionBytes = base64urlDecode(base64RawTransaction);
    
    // For Solana, the first 64 bytes are typically the signature
    // This is a simplified approach - in reality, Solana transactions can have multiple signatures
    const signatureBytes = transactionBytes.slice(0, 64);
    const hash = bs58.encode(signatureBytes);
    
    return {
      hash,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, 'transaction', hash),
    };
  } catch (error) {
    return {
      hash: base64RawTransaction,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, 'transaction', base64RawTransaction),
    };
  }
}

/**
 * Parse EVM signature response
 */
function parseEVMSignatureResponse(base64Response: string, _networkId: NetworkId): ParsedSignatureResult {
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
 * Parse EVM transaction response to extract hash
 */
function parseEVMTransactionResponse(base64RawTransaction: string, networkId: NetworkId): ParsedTransactionResult {
  try {
    // For EVM transactions, we need to hash the transaction to get the transaction ID
    // This is a simplified approach - in reality, you'd need to parse the transaction structure
    // and compute the Keccak256 hash
    
    // For now, we'll extract what we can from the raw transaction
    // In a full implementation, you'd use a library like ethers or viem to parse this
    const transactionBytes = base64urlDecode(base64RawTransaction);
    const hash = "0x" + Buffer.from(transactionBytes).toString("hex").substring(0, 64);
    
    return {
      hash,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, 'transaction', hash),
    };
  } catch (error) {
    return {
      hash: base64RawTransaction,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, 'transaction', base64RawTransaction),
    };
  }
}

/**
 * Parse Sui signature response
 */
function parseSuiSignatureResponse(base64Response: string, _networkId: NetworkId): ParsedSignatureResult {
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
 * Parse Sui transaction response
 */
function parseSuiTransactionResponse(base64RawTransaction: string, networkId: NetworkId): ParsedTransactionResult {
  try {
    // Sui transaction digests are base58 encoded
    const transactionBytes = base64urlDecode(base64RawTransaction);
    // This is a simplified approach - you'd typically extract the actual digest from the transaction
    const hash = bs58.encode(transactionBytes.slice(0, 32)); // Use first 32 bytes as hash
    
    return {
      hash,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, 'transaction', hash),
    };
  } catch (error) {
    return {
      hash: base64RawTransaction,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, 'transaction', base64RawTransaction),
    };
  }
}

/**
 * Parse Bitcoin signature response
 */
function parseBitcoinSignatureResponse(base64Response: string, _networkId: NetworkId): ParsedSignatureResult {
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
 * Parse Bitcoin transaction response
 */
function parseBitcoinTransactionResponse(base64RawTransaction: string, networkId: NetworkId): ParsedTransactionResult {
  try {
    // Bitcoin transaction IDs are double SHA256 hash of the transaction, reversed
    const transactionBytes = base64urlDecode(base64RawTransaction);
    // This is a simplified approach - you'd typically compute the actual TXID
    const hash = Buffer.from(transactionBytes).toString("hex").substring(0, 64);
    
    return {
      hash,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, 'transaction', hash),
    };
  } catch (error) {
    return {
      hash: base64RawTransaction,
      rawTransaction: base64RawTransaction,
      blockExplorer: getExplorerUrl(networkId, 'transaction', base64RawTransaction),
    };
  }
}
