import type { NetworkId } from "@phantom/constants";
import { base64urlEncode, stringToBase64url } from "@phantom/base64url";
import { getTransactionEncoder, type Transaction } from "@solana/transactions";
import type { EthereumTransaction } from "@phantom/sdk-types";
import { Buffer } from "buffer";
import {
  parseSignMessageResponse as _parseSignMessageResponse,
  parseTransactionResponse as _parseTransactionResponse,
} from "./response-parsers";

// Re-export response parsers
export { parseSignMessageResponse, parseTransactionResponse, parseSolanaSignedTransaction } from "./response-parsers";

export interface ParsedTransaction {
  base64url: string;
  structuredTx?: EthereumTransaction; // For ETH signTransaction with structured format
  originalFormat: string;
}

export interface ParsedMessage {
  base64url: string;
}

// Re-export interfaces from response-parsers
export type { ParsedSignatureResult, ParsedTransactionResult } from "./response-parsers";

/**
 * Parse a message to base64url format for the client
 */
export function parseMessage(message: string): ParsedMessage {
  return {
    base64url: stringToBase64url(message),
  };
}

/**
 * Parse a transaction to base64url format based on network type, including structured transaction object for signAndSendTransaction
 */
export async function parseTransactionToBase64Url(transaction: any, networkId: NetworkId): Promise<ParsedTransaction> {
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
      return parseEVMTransactionToBase64Url(transaction);
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
 * Parse EVM transaction to proper format for KMS
 * Returns properly tagged transaction for Rust backend:
 * - { kind: "RLP_ENCODED", bytes: "0x..." } for hex strings, bytes, or serializable transactions
 * - { kind: "EIP_1559", ...fields } for plain transaction objects (let backend validate)
 */
function parseEVMTransactionToBase64Url(transaction: any): ParsedTransaction {
  // If it's ethers.js transaction with serialize method
  if (transaction?.serialize && typeof transaction.serialize === "function") {
    const rlpHex = transaction.serialize();
    const rlpEncoded = { kind: "RLP_ENCODED" as const, bytes: rlpHex };
    return {
      base64url: base64urlEncode(new TextEncoder().encode(JSON.stringify(rlpEncoded))),
      structuredTx: rlpEncoded,
      originalFormat: "ethers-rlp",
    };
  }

  // If it's already a hex string (RLP encoded)
  if (typeof transaction === "string" && transaction.startsWith("0x")) {
    const rlpEncoded = { kind: "RLP_ENCODED" as const, bytes: transaction };
    return {
      base64url: base64urlEncode(new TextEncoder().encode(JSON.stringify(rlpEncoded))),
      structuredTx: rlpEncoded,
      originalFormat: "rlp-hex",
    };
  }

  // If it's already serialized bytes, convert to hex
  if (transaction instanceof Uint8Array) {
    const hexString = "0x" + Buffer.from(transaction).toString("hex");
    const rlpEncoded = { kind: "RLP_ENCODED" as const, bytes: hexString };
    return {
      base64url: base64urlEncode(new TextEncoder().encode(JSON.stringify(rlpEncoded))),
      structuredTx: rlpEncoded,
      originalFormat: "bytes-to-rlp-hex",
    };
  }

  // If it's a plain transaction object (viem/ethers format)
  // Pass through as EIP-1559, let backend validate fields
  if (transaction && typeof transaction === "object" && !transaction.serialize) {
    // Normalize BigInt values to strings for JSON serialization
    const normalizedTx = JSON.parse(
      JSON.stringify(transaction, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
    );

    const eip1559Tx = {
      kind: "EIP_1559" as const,
      ...normalizedTx,
    };

    return {
      base64url: base64urlEncode(new TextEncoder().encode(JSON.stringify(eip1559Tx))),
      structuredTx: eip1559Tx,
      originalFormat: "eip-1559-json",
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
function parseBitcoinTransactionToBase64Url(transaction: any): ParsedTransaction {
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
