/**
 * sign_transaction tool - Signs a transaction using a wallet
 */

import type { NetworkId } from "@phantom/client";
import { isSolanaChain } from "@phantom/utils";
import type { ToolHandler, ToolContext } from "./types.js";
import { normalizeNetworkId } from "../utils/network.js";
import { getSolanaAddress } from "../utils/solana.js";
import { parseOptionalNonNegativeInteger } from "../utils/params.js";

export const signTransactionTool: ToolHandler = {
  name: "sign_transaction",
  description:
    "Signs a transaction using the authenticated embedded wallet. Supports Solana, Ethereum, Bitcoin, and other chains.",
  inputSchema: {
    type: "object",
    properties: {
      walletId: {
        type: "string",
        description: "Optional wallet ID to use for signing (defaults to authenticated wallet)",
      },
      transaction: {
        type: "string",
        description:
          "The transaction to sign (format depends on chain: base64url for Solana, RLP-encoded hex for Ethereum)",
      },
      networkId: {
        type: "string",
        description: 'Network identifier (e.g., "eip155:1" for Ethereum mainnet, "solana:mainnet" for Solana)',
      },
      derivationIndex: {
        type: "number",
        description: "Optional derivation index for the account (default: 0)",
        minimum: 0,
      },
      account: {
        type: "string",
        description: "Optional specific account address to use for simulation/signing",
      },
    },
    required: ["transaction", "networkId"],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: true,
  },
  handler: async (params: Record<string, unknown>, context: ToolContext) => {
    const { client, session, logger } = context;

    // Parse and validate required parameters
    if (typeof params.transaction !== "string") {
      throw new Error("transaction must be a string");
    }
    if (typeof params.networkId !== "string") {
      throw new Error("networkId must be a string");
    }

    // Use session walletId if not provided
    const walletId = typeof params.walletId === "string" ? params.walletId : session.walletId;

    // Validate required fields
    if (!walletId) {
      throw new Error("walletId is required (missing from session and not provided)");
    }

    // Validate account if provided
    if (params.account !== undefined && typeof params.account !== "string") {
      throw new Error("account must be a string");
    }

    const transaction = params.transaction;
    const networkId = normalizeNetworkId(params.networkId) as NetworkId;
    const derivationIndex = parseOptionalNonNegativeInteger(params.derivationIndex, "derivationIndex");

    let account = typeof params.account === "string" ? params.account : undefined;
    if (!account && isSolanaChain(networkId)) {
      account = await getSolanaAddress(context, walletId, derivationIndex);
    }

    logger.info(`Signing transaction for wallet ${walletId} on network ${networkId}`);

    try {
      // Call PhantomClient to sign transaction
      const result = await client.signTransaction({
        walletId,
        transaction,
        networkId,
        derivationIndex,
        account,
      });

      logger.info(`Successfully signed transaction for wallet ${walletId}`);

      return {
        signedTransaction: result.rawTransaction,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to sign transaction: ${errorMessage}`);
      throw new Error(`Failed to sign transaction: ${errorMessage}`);
    }
  },
};
