import type { NetworkId } from "@phantom/constants";
import { base64urlEncode, stringToBase64url } from "@phantom/base64url";
import { getTransactionEncoder, type Transaction } from "@solana/transactions";
import { Buffer } from "buffer";
import {
  parseSignMessageResponse as _parseSignMessageResponse,
  parseTransactionResponse as _parseTransactionResponse,
} from "./response-parsers";

// Re-export response parsers
export {
  parseSignMessageResponse,
  parseTransactionResponse,
  parseSolanaSignedTransaction,
  base64UrlSignatureToHex,
  extractSignatureFromEip2718,
} from "./response-parsers";

export interface ParsedTransaction {
  /** The parsed transaction string (base64url for Solana/Sui/Bitcoin, depends on kind for EVM) */
  parsed?: string;
  /** Transaction kind for EVM transactions (EIP_1559 for JSON, RLP_ENCODED for hex) */
  kind?: "EIP_1559" | "RLP_ENCODED";
  /** Original format of the input transaction */
  originalFormat: string;
}

export interface ParsedMessage {
  parsed: string;
}

// Re-export interfaces from response-parsers
export type { ParsedSignatureResult, ParsedTransactionResult } from "./response-parsers";

/**
 * Parse a message to base64url format for the client
 */
export function parseMessage(message: string): ParsedMessage {
  return {
    parsed: stringToBase64url(message),
  };
}

/**
 * Parse a transaction to KMS format based on network type
 * - Solana: base64url encoding
 * - EVM chains: hex encoding
 * - Sui, Bitcoin: base64url encoding
 */
export async function parseToKmsTransaction(transaction: any, networkId: NetworkId): Promise<ParsedTransaction> {
  const networkPrefix = networkId.split(":")[0].toLowerCase();

  switch (networkPrefix) {
    case "solana":
      return parseSolanaTransactionToBase64Url(transaction);
    case "ethereum":
    case "eip155": // Standard Ethereum chain identifier
    case "polygon":
    case "optimism":
    case "arbitrum":
    case "base":
      return parseEVMTransactionToHex(transaction);
    case "sui":
      return await parseSuiTransactionToBase64Url(transaction);
    case "bitcoin":
      return parseBitcoinTransactionToBase64Url(transaction);
    default:
      throw new Error(`Unsupported network: ${networkPrefix}`);
  }
}

/**
 * Parse Solana transaction to base64url
 * Supports both @solana/web3.js and @solana/kit formats
 */
function parseSolanaTransactionToBase64Url(transaction: any): ParsedTransaction {
  // Check if it's a @solana/kit Transaction (has messageBytes)
  if (transaction?.messageBytes != null) {
    // @solana/kit Transaction
    return {
      parsed: base64urlEncode(transaction.messageBytes),
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
      parsed: base64urlEncode(serialized),
      originalFormat: "@solana/web3.js",
    };
  }

  // If it's already serialized bytes
  if (transaction instanceof Uint8Array) {
    return {
      parsed: base64urlEncode(transaction),
      originalFormat: "bytes",
    };
  }

  // If it's a base64 string
  if (typeof transaction === "string") {
    try {
      const bytes = Buffer.from(transaction, "base64");
      return {
        parsed: base64urlEncode(new Uint8Array(bytes)),
        originalFormat: "base64",
      };
    } catch {
      throw new Error("Unsupported Solana transaction format");
    }
  }

  throw new Error("Unsupported Solana transaction format");
}

/**
 * Parse EVM transaction - adds kind field for KMS backend
 * - RLP hex strings/bytes → kind: RLP_ENCODED
 * - JSON transaction objects → kind: EIP_1559 (base64url encoded)
 * Supports Ethereum, Polygon, and other EVM-compatible chains
 */
function parseEVMTransactionToHex(transaction: any): ParsedTransaction {
  // Check if it's already a hex string (RLP encoded)
  if (typeof transaction === "string" && transaction.startsWith("0x")) {
    return {
      parsed: transaction,
      kind: "RLP_ENCODED",
      originalFormat: "hex",
    };
  }

  // Check if it's ethers.js transaction with serialize method (returns RLP)
  if (transaction?.serialize && typeof transaction.serialize === "function") {
    const serialized = transaction.serialize();
    const hex = serialized.startsWith("0x") ? serialized : "0x" + serialized;

    return {
      parsed: hex,
      kind: "RLP_ENCODED",
      originalFormat: "ethers",
    };
  }

  // If it's already serialized bytes (RLP encoded)
  if (transaction instanceof Uint8Array) {
    const hex = "0x" + Buffer.from(transaction).toString("hex");
    return {
      parsed: hex,
      kind: "RLP_ENCODED",
      originalFormat: "bytes",
    };
  }

  // Check if it's a transaction object (EIP-1559 or legacy format)
  // Keep as JSON for easier processing on backend
  if (transaction && typeof transaction === "object" && (transaction.to || transaction.data || transaction.from)) {
    // Serialize with BigInt support - keep as base64url encoded JSON
    const jsonString = JSON.stringify(transaction, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
    const bytes = new TextEncoder().encode(jsonString);

    return {
      parsed: base64urlEncode(bytes),
      kind: "EIP_1559",
      originalFormat: "json",
    };
  }

  throw new Error("Unsupported EVM transaction format");
}

/**
 * Parse Sui transaction to base64url
 */
async function parseSuiTransactionToBase64Url(transaction: any): Promise<ParsedTransaction> {
  // Check if it's a Sui transaction object with serialize method
  if (transaction?.serialize && typeof transaction.serialize === "function") {
    const serialized = transaction.serialize();
    return {
      parsed: base64urlEncode(serialized),
      originalFormat: "sui-sdk",
    };
  }

  // Check if it's already serialized bytes
  if (transaction instanceof Uint8Array) {
    return {
      parsed: base64urlEncode(transaction),
      originalFormat: "bytes",
    };
  }

  // If it's a transaction block
  if (transaction?.build && typeof transaction.build === "function") {
    const built = await transaction.build();
    if (built?.serialize && typeof built.serialize === "function") {
      const serialized = built.serialize();
      return {
        parsed: base64urlEncode(serialized),
        originalFormat: "transaction-block",
      };
    }
  }

  throw new Error("Unsupported Sui transaction format");
}

/**
 * Parse Bitcoin transaction to base64url
 */
function parseBitcoinTransactionToBase64Url(transaction: any): ParsedTransaction {
  // Check if it's a bitcoinjs-lib transaction
  if (transaction?.toBuffer && typeof transaction.toBuffer === "function") {
    const buffer = transaction.toBuffer();
    return {
      parsed: base64urlEncode(new Uint8Array(buffer)),
      originalFormat: "bitcoinjs-lib",
    };
  }

  // Check if it's already serialized bytes
  if (transaction instanceof Uint8Array) {
    return {
      parsed: base64urlEncode(transaction),
      originalFormat: "bytes",
    };
  }

  // If it's a hex string
  if (typeof transaction === "string") {
    const bytes = new Uint8Array(Buffer.from(transaction, "hex"));
    return {
      parsed: base64urlEncode(bytes),
      originalFormat: "hex",
    };
  }

  throw new Error("Unsupported Bitcoin transaction format");
}

export function parseSolanaKitTransactionToSolanaWeb3js(transaction: Transaction) {
  // Encode the Kit transaction into its canonical wire format (Uint8Array).
  const serialized = getTransactionEncoder().encode(transaction);

  const fakeVersioned = {
    serialize() {
      // `serialize` should return a *new* `Uint8Array` each call to avoid
      // consumers mutating the internal representation.
      return new Uint8Array(serialized);
    },
  } as unknown as any;

  return fakeVersioned;
}
