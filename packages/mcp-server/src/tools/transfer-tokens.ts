/**
 * transfer_tokens tool - Transfers SOL or SPL tokens on Solana
 */

import { base64urlEncode } from "@phantom/base64url";
import { NetworkId } from "@phantom/client";
import { isSolanaChain } from "@phantom/utils";
import { Connection, PublicKey, SystemProgram, Transaction, type Commitment } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import type { ToolHandler, ToolContext } from "./types.js";
import { normalizeNetworkId } from "../utils/network.js";
import { getSolanaAddress } from "../utils/solana.js";
import { parseBaseUnitAmount, parseUiAmount, requirePositiveAmount } from "../utils/amount.js";
import { parseOptionalNonNegativeInteger } from "../utils/params.js";

const DEFAULT_SOLANA_RPC_URLS: Record<string, string> = {
  [NetworkId.SOLANA_MAINNET]: "https://api.mainnet-beta.solana.com",
  [NetworkId.SOLANA_DEVNET]: "https://api.devnet.solana.com",
  [NetworkId.SOLANA_TESTNET]: "https://api.testnet.solana.com",
};

const DEFAULT_COMMITMENT: Commitment = "confirmed";

/**
 * Resolves the Solana RPC URL to use for on-chain operations.
 * Priority: rpcUrl parameter > default URL for networkId
 *
 * @param networkId - The normalized network ID (e.g., "solana:101" for mainnet)
 * @param rpcUrl - Optional RPC URL override to use instead of defaults
 * @returns The resolved Solana RPC URL
 * @throws Error if networkId is not supported and no rpcUrl is provided
 *
 * @example
 * ```typescript
 * const url = resolveSolanaRpcUrl("solana:101");
 * // Returns: "https://api.mainnet-beta.solana.com"
 * ```
 */
function resolveSolanaRpcUrl(networkId: string, rpcUrl?: string): string {
  if (rpcUrl && typeof rpcUrl === "string") {
    return rpcUrl;
  }

  const resolved = DEFAULT_SOLANA_RPC_URLS[networkId];
  if (!resolved) {
    throw new Error(
      `rpcUrl is required for networkId "${networkId}". Supported defaults: ${Object.keys(DEFAULT_SOLANA_RPC_URLS).join(
        ", ",
      )}`,
    );
  }

  return resolved;
}

/**
 * MCP tool handler for transferring SOL or SPL tokens on Solana networks.
 * Builds, signs, and sends the transfer transaction using the authenticated embedded wallet.
 *
 * @remarks
 * This tool handles both native SOL transfers and SPL token transfers.
 * For SPL tokens, it automatically manages associated token accounts:
 * - Verifies source account exists
 * - Creates destination account if missing (when createAssociatedTokenAccount is true)
 * - Fetches token decimals from chain when needed for UI amount conversion
 *
 * Key features:
 * - Native SOL transfers using SystemProgram
 * - SPL token transfers with automatic ATA handling
 * - Amount in both UI units (e.g., "0.5 SOL") and base units (lamports)
 * - Auto-fetches token decimals from chain when needed
 * - Support for derivation paths for multi-account wallets
 *
 * @example
 * ```typescript
 * // Transfer 0.5 SOL
 * const result = await transferTokensTool.handler({
 *   networkId: "solana:mainnet",
 *   to: "recipient-address",
 *   amount: "0.5",
 *   amountUnit: "ui",
 * }, context);
 *
 * // Transfer 100 USDC (SPL token)
 * const result2 = await transferTokensTool.handler({
 *   networkId: "solana:mainnet",
 *   to: "recipient-address",
 *   amount: "100",
 *   amountUnit: "ui",
 *   tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
 *   decimals: 6,
 * }, context);
 * ```
 */
export const transferTokensTool: ToolHandler = {
  name: "transfer_tokens",
  description:
    "Transfers SOL or SPL tokens on Solana using the authenticated embedded wallet. Builds, signs, and sends the transaction.",
  inputSchema: {
    type: "object",
    properties: {
      walletId: {
        type: "string",
        description: "Optional wallet ID to use for transfer (defaults to authenticated wallet)",
      },
      networkId: {
        type: "string",
        description: 'Solana network identifier (e.g., "solana:mainnet", "solana:devnet")',
      },
      to: {
        type: "string",
        description: "Recipient Solana address",
      },
      amount: {
        type: ["string", "number"],
        description: 'Transfer amount (e.g., "0.5", 0.5, "1000000", or 1000000)',
      },
      amountUnit: {
        type: "string",
        description: "Amount unit: 'ui' for SOL/token units, 'base' for lamports/base units",
        enum: ["ui", "base"],
      },
      tokenMint: {
        type: "string",
        description: "Optional SPL token mint address. If omitted, transfers SOL.",
      },
      decimals: {
        type: "number",
        description: "Token decimals (optional for SPL tokens; fetched from chain if omitted)",
        minimum: 0,
      },
      derivationIndex: {
        type: "number",
        description: "Optional derivation index for the account (default: 0)",
        minimum: 0,
      },
      rpcUrl: {
        type: "string",
        description: "Optional Solana RPC URL (defaults based on networkId)",
      },
      createAssociatedTokenAccount: {
        type: "boolean",
        description: "Create destination associated token account if missing (default: true)",
      },
    },
    required: ["networkId", "to", "amount"],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: true,
  },
  handler: async (params: Record<string, unknown>, context: ToolContext) => {
    const { client, session, logger } = context;

    if (typeof params.networkId !== "string") {
      throw new Error("networkId must be a string");
    }
    const normalizedNetworkId = normalizeNetworkId(params.networkId);
    if (!isSolanaChain(normalizedNetworkId)) {
      throw new Error("transfer_tokens currently supports Solana networks only");
    }
    if (typeof params.to !== "string") {
      throw new Error("to must be a string");
    }

    // Accept both string and number for amount
    if (typeof params.amount !== "string" && typeof params.amount !== "number") {
      throw new Error(`amount must be a string or number, got type: ${typeof params.amount}`);
    }

    const amount = params.amount as string | number;

    const walletId = typeof params.walletId === "string" ? params.walletId : session.walletId;
    if (!walletId) {
      throw new Error("walletId is required (missing from session and not provided)");
    }

    const derivationIndex = parseOptionalNonNegativeInteger(params.derivationIndex, "derivationIndex");

    const amountUnit = typeof params.amountUnit === "string" ? params.amountUnit : "ui";
    if (amountUnit !== "ui" && amountUnit !== "base") {
      throw new Error("amountUnit must be 'ui' or 'base'");
    }

    const tokenMint = typeof params.tokenMint === "string" ? params.tokenMint : undefined;
    const createAta =
      typeof params.createAssociatedTokenAccount === "boolean" ? params.createAssociatedTokenAccount : true;

    const rpcUrl = resolveSolanaRpcUrl(
      normalizedNetworkId,
      typeof params.rpcUrl === "string" ? params.rpcUrl : undefined,
    );
    const connection = new Connection(rpcUrl, DEFAULT_COMMITMENT);

    const fromAddress = await getSolanaAddress(context, walletId, derivationIndex);
    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(params.to);

    logger.info(`Preparing transfer from ${fromAddress} to ${params.to} on ${normalizedNetworkId}`);

    try {
      const tx = new Transaction();

      if (!tokenMint) {
        const lamports =
          amountUnit === "base" ? parseBaseUnitAmount(amount) : parseUiAmount(amount, 9 /* SOL decimals */);

        requirePositiveAmount(lamports);

        tx.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          }),
        );
      } else {
        const mintPubkey = new PublicKey(tokenMint);
        const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey, false);
        const destinationAta = await getAssociatedTokenAddress(mintPubkey, toPubkey, false);

        const sourceInfo = await connection.getAccountInfo(sourceAta, DEFAULT_COMMITMENT);
        if (!sourceInfo) {
          throw new Error("Source associated token account not found for this wallet");
        }

        const destinationInfo = await connection.getAccountInfo(destinationAta, DEFAULT_COMMITMENT);
        if (!destinationInfo) {
          if (createAta) {
            tx.add(createAssociatedTokenAccountInstruction(fromPubkey, destinationAta, toPubkey, mintPubkey));
          } else {
            throw new Error("Destination associated token account does not exist");
          }
        }

        let decimals: number | undefined;
        if (typeof params.decimals === "number") {
          if (!Number.isInteger(params.decimals) || params.decimals < 0) {
            throw new Error("decimals must be a non-negative integer");
          }
          decimals = params.decimals;
        }

        if (amountUnit === "ui" && decimals === undefined) {
          const mintInfo = await getMint(connection, mintPubkey, DEFAULT_COMMITMENT);
          decimals = mintInfo.decimals;
        }

        if (amountUnit === "ui" && decimals === undefined) {
          throw new Error("Unable to determine token decimals");
        }

        const amountBaseUnits =
          amountUnit === "base" ? parseBaseUnitAmount(amount) : parseUiAmount(amount, decimals as number);

        requirePositiveAmount(amountBaseUnits);

        if (amountUnit === "base" || decimals === undefined) {
          tx.add(createTransferInstruction(sourceAta, destinationAta, fromPubkey, amountBaseUnits));
        } else {
          tx.add(
            createTransferCheckedInstruction(
              sourceAta,
              mintPubkey,
              destinationAta,
              fromPubkey,
              amountBaseUnits,
              decimals,
            ),
          );
        }
      }

      const { blockhash } = await connection.getLatestBlockhash(DEFAULT_COMMITMENT);
      tx.feePayer = fromPubkey;
      tx.recentBlockhash = blockhash;

      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      const encoded = base64urlEncode(serialized);

      const result = await client.signAndSendTransaction({
        walletId,
        transaction: encoded,
        networkId: normalizedNetworkId as NetworkId,
        derivationIndex,
        account: fromAddress,
      });

      logger.info(`Transfer submitted for wallet ${walletId}`);

      return {
        walletId,
        networkId: normalizedNetworkId,
        from: fromAddress,
        to: params.to,
        tokenMint: tokenMint ?? null,
        signature: result.hash ?? null,
        rawTransaction: result.rawTransaction,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to transfer tokens: ${errorMessage}`);
      throw new Error(`Failed to transfer tokens: ${errorMessage}`);
    }
  },
};
