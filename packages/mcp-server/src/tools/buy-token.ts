/**
 * buy_token tool - Fetches a swap quote from the Phantom quotes API.
 */

import type { NetworkId } from "@phantom/client";
import { isSolanaChain } from "@phantom/utils";
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import bs58 from "bs58";
import { base64urlEncode } from "@phantom/base64url";
import type { ToolHandler, ToolContext } from "./types.js";
import { normalizeNetworkId, normalizeSwapperChainId } from "../utils/network.js";
import { getSolanaAddress } from "../utils/solana.js";
import { parseBaseUnitAmount, parseUiAmount, requirePositiveAmount } from "../utils/amount.js";

const DEFAULT_QUOTES_API_URL = "https://api.phantom.app/swap/v2/quotes";

const DEFAULT_SOLANA_RPC_URLS: Record<string, string> = {
  "solana:101": "https://api.mainnet-beta.solana.com",
  "solana:103": "https://api.devnet.solana.com",
  "solana:102": "https://api.testnet.solana.com",
};

/**
 * Validates that a URL is a valid HTTPS URL to prevent SSRF attacks.
 *
 * @param url - The URL string to validate
 * @param context - Description of what the URL is used for (for error messages)
 * @throws Error if the URL is not valid HTTPS
 *
 * @example
 * ```typescript
 * validateHttpsUrl("https://api.example.com", "quotes API");
 * // No error
 *
 * validateHttpsUrl("http://api.example.com", "quotes API");
 * // Throws: Error("quotes API URL must use HTTPS protocol")
 * ```
 */
function validateHttpsUrl(url: string, context: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${context} URL is not valid: ${url}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${context} URL must use HTTPS protocol, got: ${parsed.protocol}`);
  }

  if (!parsed.hostname) {
    throw new Error(`${context} URL missing hostname: ${url}`);
  }
}

/**
 * Resolves the Phantom quotes API URL to use for fetching swap quotes.
 * Priority: override parameter > PHANTOM_QUOTES_API_URL environment variable > default URL
 *
 * @param override - Optional URL override to use instead of defaults
 * @returns The resolved quotes API URL
 *
 * @example
 * ```typescript
 * const url = resolveQuotesApiUrl("https://custom-api.example.com/quotes");
 * // Returns: "https://custom-api.example.com/quotes"
 * ```
 */
function resolveQuotesApiUrl(override?: string): string {
  let url: string;

  if (override && typeof override === "string") {
    url = override;
  } else if (process.env.PHANTOM_QUOTES_API_URL) {
    url = process.env.PHANTOM_QUOTES_API_URL;
  } else {
    url = DEFAULT_QUOTES_API_URL;
  }

  validateHttpsUrl(url, "Quotes API");
  return url;
}

/**
 * Resolves the Solana RPC URL to use for on-chain operations.
 * Priority: override parameter > default URL for chainId
 *
 * @param chainId - The swapper chain ID (e.g., "solana:101" for mainnet)
 * @param override - Optional RPC URL override to use instead of defaults
 * @returns The resolved Solana RPC URL
 * @throws Error if chainId is not supported and no override is provided
 *
 * @example
 * ```typescript
 * const url = resolveSolanaRpcUrl("solana:101");
 * // Returns: "https://api.mainnet-beta.solana.com"
 * ```
 */
function resolveSolanaRpcUrl(chainId: string, override?: string): string {
  let url: string;

  if (override && typeof override === "string") {
    url = override;
  } else {
    const defaultUrl = DEFAULT_SOLANA_RPC_URLS[chainId];
    if (!defaultUrl) {
      throw new Error(
        `rpcUrl is required for chainId "${chainId}". Supported defaults: ${Object.keys(DEFAULT_SOLANA_RPC_URLS).join(
          ", ",
        )}`,
      );
    }
    url = defaultUrl;
  }

  validateHttpsUrl(url, "Solana RPC");
  return url;
}

/**
 * Decodes transaction data from either base64 or base58 encoding into a Uint8Array.
 * If base64Encoded is true, decodes as base64. Otherwise, attempts base58 first, then falls back to base64.
 *
 * @param transactionData - The encoded transaction data string
 * @param base64Encoded - If true, decode as base64; if false/undefined, try base58 then base64
 * @returns The decoded transaction data as a Uint8Array
 * @throws Error if decoding fails for all attempted formats
 *
 * @example
 * ```typescript
 * const data = decodeTransactionData("SGVsbG8gV29ybGQ=", true);
 * // Returns: Uint8Array([72, 101, 108, 108, 111, ...])
 * ```
 */
function decodeTransactionData(transactionData: string, base64Encoded: boolean | undefined): Uint8Array {
  if (base64Encoded) {
    const bytes = Buffer.from(transactionData, "base64");
    if (!bytes.length) {
      throw new Error("Failed to decode base64 transaction data");
    }
    return bytes;
  }

  try {
    return bs58.decode(transactionData);
  } catch (error) {
    const bytes = Buffer.from(transactionData, "base64");
    if (!bytes.length) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to decode transaction data: ${errorMessage}`);
    }
    return bytes;
  }
}

/**
 * MCP tool handler for fetching swap quotes from Phantom's quotes API.
 * Supports buying tokens on Solana networks with optional transaction execution.
 *
 * @remarks
 * This tool fetches a swap quote for buying a token (or native SOL) by selling another token.
 * When `execute` is true, it will also sign and send the first transaction from the quote.
 *
 * Key features:
 * - Supports both native SOL and SPL tokens
 * - Handles amount in both UI units (e.g., "0.5 SOL") and base units (lamports)
 * - Auto-fetches token decimals from chain when needed
 * - Optional execution mode to immediately sign and send the swap transaction
 * - Configurable slippage tolerance and auto-slippage
 *
 * @example
 * ```typescript
 * // Fetch a quote to buy 0.1 SOL with USDC
 * const result = await buyTokenTool.handler({
 *   networkId: "solana:mainnet",
 *   buyTokenIsNative: true,
 *   sellTokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
 *   amount: "0.1",
 *   amountUnit: "ui",
 *   sellTokenDecimals: 6,
 * }, context);
 * ```
 */
export const buyTokenTool: ToolHandler = {
  name: "buy_token",
  description:
    "Fetches a swap quote from Phantom's quotes API for buying a token (Solana only). By default, this tool only fetches a quote and does not submit a transaction. Pass execute: true to sign and send the transaction.",
  inputSchema: {
    type: "object",
    properties: {
      walletId: {
        type: "string",
        description: "Optional wallet ID to use for the taker address (defaults to authenticated wallet)",
      },
      networkId: {
        type: "string",
        description: 'Solana network identifier (e.g., "solana:mainnet", "solana:devnet")',
      },
      buyTokenMint: {
        type: "string",
        description: "Mint address of the token to buy (omit if buying native SOL)",
      },
      buyTokenIsNative: {
        type: "boolean",
        description: "Set true to buy native SOL (default: false)",
      },
      sellTokenMint: {
        type: "string",
        description: "Mint address of the token to sell (omit if selling native SOL)",
      },
      sellTokenIsNative: {
        type: "boolean",
        description: "Set true to sell native SOL (default: true if sellTokenMint not provided)",
      },
      amount: {
        type: "string",
        description:
          "The amount to swap as a string (e.g., \"0.5\" or \"1000000\"). When exactOut is false (default), this is the sell amount. When exactOut is true, this is the buy amount. Interpretation depends on amountUnit: 'ui' interprets as token units (e.g., 0.5 SOL), 'base' interprets as atomic units (e.g., 500000000 lamports).",
      },
      amountUnit: {
        type: "string",
        description: "Amount unit: 'ui' for token units, 'base' for atomic units (default: 'base')",
        enum: ["ui", "base"],
      },
      buyTokenDecimals: {
        type: "number",
        description: "Decimals for the buy token (used when amountUnit is 'ui' and exactOut is true)",
        minimum: 0,
      },
      sellTokenDecimals: {
        type: "number",
        description: "Decimals for the sell token (optional if amountUnit is 'ui')",
        minimum: 0,
      },
      slippageTolerance: {
        type: "number",
        description: "Slippage tolerance in percent (0-100)",
        minimum: 0,
        maximum: 100,
      },
      exactOut: {
        type: "boolean",
        description: "If true, amount is treated as buy amount instead of sell amount",
      },
      autoSlippage: {
        type: "boolean",
        description: "Enable auto slippage calculation",
      },
      base64EncodedTx: {
        type: "boolean",
        description: "Request base64-encoded transaction data in the quote response",
      },
      execute: {
        type: "boolean",
        description: "If true, sign and send the first quote transaction after fetching",
      },
      taker: {
        type: "string",
        description: "Taker address (defaults to wallet's Solana address)",
      },
      rpcUrl: {
        type: "string",
        description: "Optional Solana RPC URL (for mint decimals lookup when amountUnit is 'ui')",
      },
      quoteApiUrl: {
        type: "string",
        description: "Optional quotes API URL override",
      },
      derivationIndex: {
        type: "number",
        description: "Optional derivation index for the taker address (default: 0)",
        minimum: 0,
      },
    },
    required: ["amount"],
  },
  handler: async (params: Record<string, unknown>, context: ToolContext) => {
    const { session, logger } = context;

    const networkId = typeof params.networkId === "string" ? params.networkId : "solana:mainnet";
    const normalizedNetworkId = normalizeNetworkId(networkId) as NetworkId;
    const swapperChainId = normalizeSwapperChainId(networkId);

    if (!isSolanaChain(networkId) && !isSolanaChain(swapperChainId)) {
      throw new Error("buy_token currently supports Solana networks only");
    }

    if (typeof params.amount !== "string") {
      throw new Error("amount must be a string");
    }

    const walletId = typeof params.walletId === "string" ? params.walletId : session.walletId;
    if (!walletId) {
      throw new Error("walletId is required (missing from session and not provided)");
    }

    const derivationIndex = typeof params.derivationIndex === "number" ? params.derivationIndex : undefined;
    if (derivationIndex !== undefined && (!Number.isInteger(derivationIndex) || derivationIndex < 0)) {
      throw new Error("derivationIndex must be a non-negative integer");
    }

    const amountUnit = typeof params.amountUnit === "string" ? params.amountUnit : "base";
    if (amountUnit !== "ui" && amountUnit !== "base") {
      throw new Error("amountUnit must be 'ui' or 'base'");
    }

    const buyTokenIsNative = typeof params.buyTokenIsNative === "boolean" ? params.buyTokenIsNative : false;
    const sellTokenIsNative =
      typeof params.sellTokenIsNative === "boolean" ? params.sellTokenIsNative : params.sellTokenMint ? false : true;

    const buyTokenMint = typeof params.buyTokenMint === "string" ? params.buyTokenMint : undefined;
    const sellTokenMint = typeof params.sellTokenMint === "string" ? params.sellTokenMint : undefined;

    if (!buyTokenIsNative && !buyTokenMint) {
      throw new Error("buyTokenMint is required unless buyTokenIsNative is true");
    }

    if (!sellTokenIsNative && !sellTokenMint) {
      throw new Error("sellTokenMint is required unless sellTokenIsNative is true");
    }

    if (sellTokenIsNative && sellTokenMint) {
      throw new Error("sellTokenMint must be omitted when sellTokenIsNative is true");
    }

    // Validate mint addresses are valid Solana public keys
    if (buyTokenMint) {
      try {
        new PublicKey(buyTokenMint);
      } catch {
        throw new Error("buyTokenMint must be a valid Solana address");
      }
    }

    if (sellTokenMint) {
      try {
        new PublicKey(sellTokenMint);
      } catch {
        throw new Error("sellTokenMint must be a valid Solana address");
      }
    }

    const taker =
      typeof params.taker === "string" ? params.taker : await getSolanaAddress(context, walletId, derivationIndex);

    // Validate taker is a valid Solana address
    try {
      new PublicKey(taker);
    } catch {
      throw new Error("taker must be a valid Solana address");
    }

    const exactOut = typeof params.exactOut === "boolean" ? params.exactOut : false;
    let amountBaseUnits: bigint;
    if (amountUnit === "base") {
      amountBaseUnits = parseBaseUnitAmount(params.amount);
    } else {
      let decimals: number | undefined;
      if (exactOut) {
        if (buyTokenIsNative) {
          decimals = 9;
        } else if (typeof params.buyTokenDecimals === "number") {
          if (!Number.isInteger(params.buyTokenDecimals) || params.buyTokenDecimals < 0) {
            throw new Error("buyTokenDecimals must be a non-negative integer");
          }
          decimals = params.buyTokenDecimals;
        } else if (buyTokenMint) {
          const rpcUrl = resolveSolanaRpcUrl(
            swapperChainId,
            typeof params.rpcUrl === "string" ? params.rpcUrl : undefined,
          );
          const connection = new Connection(rpcUrl, "confirmed");
          const mintInfo = await getMint(connection, new PublicKey(buyTokenMint), "confirmed");
          decimals = mintInfo.decimals;
        } else {
          throw new Error("buyTokenMint is required to lookup decimals");
        }
      } else if (sellTokenIsNative) {
        decimals = 9;
      } else if (typeof params.sellTokenDecimals === "number") {
        if (!Number.isInteger(params.sellTokenDecimals) || params.sellTokenDecimals < 0) {
          throw new Error("sellTokenDecimals must be a non-negative integer");
        }
        decimals = params.sellTokenDecimals;
      } else if (sellTokenMint) {
        const rpcUrl = resolveSolanaRpcUrl(
          swapperChainId,
          typeof params.rpcUrl === "string" ? params.rpcUrl : undefined,
        );
        const connection = new Connection(rpcUrl, "confirmed");
        const mintInfo = await getMint(connection, new PublicKey(sellTokenMint), "confirmed");
        decimals = mintInfo.decimals;
      } else {
        throw new Error("sellTokenMint is required to lookup decimals");
      }

      amountBaseUnits = parseUiAmount(params.amount, decimals);
    }

    requirePositiveAmount(amountBaseUnits);

    const quoteApiUrl = resolveQuotesApiUrl(typeof params.quoteApiUrl === "string" ? params.quoteApiUrl : undefined);

    const buyToken = buyTokenIsNative
      ? { chainId: swapperChainId, resourceType: "nativeToken", slip44: "501" }
      : { chainId: swapperChainId, resourceType: "address", address: buyTokenMint };

    const sellToken = sellTokenIsNative
      ? { chainId: swapperChainId, resourceType: "nativeToken", slip44: "501" }
      : { chainId: swapperChainId, resourceType: "address", address: sellTokenMint };

    const body: Record<string, unknown> = {
      taker: { chainId: swapperChainId, resourceType: "address", address: taker },
      buyToken,
      sellToken,
    };

    if (exactOut) {
      body.buyAmount = amountBaseUnits.toString();
    } else {
      body.sellAmount = amountBaseUnits.toString();
    }

    if (typeof params.slippageTolerance === "number") {
      if (
        !Number.isFinite(params.slippageTolerance) ||
        params.slippageTolerance < 0 ||
        params.slippageTolerance > 100
      ) {
        throw new Error("slippageTolerance must be a number between 0 and 100");
      }
      body.slippageTolerance = params.slippageTolerance;
    }

    if (typeof params.exactOut === "boolean") {
      body.exactOut = exactOut;
    }

    if (typeof params.autoSlippage === "boolean") {
      body.autoSlippage = params.autoSlippage;
    }

    if (typeof params.base64EncodedTx === "boolean") {
      body.base64EncodedTx = params.base64EncodedTx;
    }

    // Log only the origin to avoid leaking credentials in URL
    const quoteApiOrigin = new URL(quoteApiUrl).origin;
    logger.info(`Requesting quote from ${quoteApiOrigin}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(quoteApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Quote API request timed out after 10 seconds");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const responseText = await response.text();
    let responseJson: unknown;

    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      logger.debug(`Failed to parse response as JSON: ${parseError}`);
      responseJson = responseText;
    }

    if (!response.ok) {
      const message = typeof responseJson === "string" ? responseJson : JSON.stringify(responseJson);
      throw new Error(`Quote API error (${response.status}): ${message}`);
    }

    const execute = typeof params.execute === "boolean" ? params.execute : false;
    if (!execute) {
      return {
        quoteRequest: body,
        quoteResponse: responseJson,
      };
    }

    // Validate response structure before type assertion
    if (
      typeof responseJson !== "object" ||
      responseJson === null ||
      !Array.isArray((responseJson as Record<string, unknown>).quotes)
    ) {
      throw new Error("Quote response has unexpected format: missing quotes array");
    }

    const quotes = (responseJson as { quotes: unknown[] }).quotes;
    const quote = quotes[0] as { transactionData?: string[] } | undefined;
    const transactionData = quote?.transactionData?.[0];
    if (!transactionData) {
      throw new Error("Quote response missing transaction data in first quote");
    }

    const decoded = decodeTransactionData(transactionData, params.base64EncodedTx as boolean | undefined);
    const encoded = base64urlEncode(decoded);

    const result = await context.client.signAndSendTransaction({
      walletId,
      transaction: encoded,
      networkId: normalizedNetworkId,
      derivationIndex,
      account: taker,
    });

    return {
      quoteRequest: body,
      quoteResponse: responseJson,
      execution: {
        signature: result.hash ?? null,
        rawTransaction: result.rawTransaction,
      },
    };
  },
};
