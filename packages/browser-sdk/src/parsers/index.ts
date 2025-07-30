import type { NetworkId } from "@phantom/client";
import { base64urlEncode, stringToBase64url } from "@phantom/base64url";
import { Buffer } from "../polyfills";

export interface ParsedTransaction {
  base64url: string;
  originalFormat: string;
}

export interface ParsedMessage {
  base64url: string;
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
    case "polygon":
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
    const serialized = transaction.serialize();
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

  throw new Error("Unsupported Solana transaction format");
}

/**
 * Parse EVM transaction to base64url
 * Supports Ethereum, Polygon, and other EVM-compatible chains
 */
function parseEVMTransaction(transaction: any): ParsedTransaction {
  // Check if it's a Viem transaction object
  if (transaction && typeof transaction === "object" && (transaction.to || transaction.data)) {
    // TODO: Fix viem transaction encoding - encodeTransaction doesn't exist
    // For now, serialize with BigInt support
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

  // If it's already serialized bytes or hex string
  if (transaction instanceof Uint8Array) {
    return {
      base64url: base64urlEncode(transaction),
      originalFormat: "bytes",
    };
  }

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
