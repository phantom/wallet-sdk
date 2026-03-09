/**
 * sign_message tool - Signs a message using a wallet
 */

import { isEthereumChain } from "@phantom/utils";
import { stringToBase64url } from "@phantom/base64url";
import type { NetworkId } from "@phantom/client";
import type { ToolHandler, ToolContext } from "./types.js";
import { normalizeNetworkId } from "../utils/network.js";
import { parseOptionalNonNegativeInteger } from "../utils/params.js";

export const signMessageTool: ToolHandler = {
  name: "sign_message",
  description:
    "Signs a UTF-8 message using the authenticated embedded wallet. Automatically routes to the correct signing method based on the network (Ethereum vs other chains).",
  inputSchema: {
    type: "object",
    properties: {
      walletId: {
        type: "string",
        description: "Optional wallet ID to use for signing (defaults to authenticated wallet)",
      },
      message: {
        type: "string",
        description: "The UTF-8 message to sign",
      },
      networkId: {
        type: "string",
        description: 'Network identifier (e.g., "eip155:1" for Ethereum mainnet, "solana:mainnet" for Solana)',
      },
      derivationIndex: {
        type: "integer",
        description: "Optional derivation index for the account (default: 0)",
        minimum: 0,
      },
    },
    required: ["message", "networkId"],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: true,
  },
  handler: async (params: Record<string, unknown>, context: ToolContext) => {
    const { client, session, logger } = context;

    // Parse and validate required parameters
    if (typeof params.message !== "string") {
      throw new Error("message must be a string");
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

    const message = params.message;
    const networkId = normalizeNetworkId(params.networkId) as NetworkId;
    const derivationIndex = parseOptionalNonNegativeInteger(params.derivationIndex, "derivationIndex");

    logger.info(`Signing message for wallet ${walletId} on network ${networkId}`);

    try {
      let signature: string;

      // Route to correct signing method based on network
      if (isEthereumChain(networkId)) {
        // For Ethereum chains, convert message to base64url and use ethereumSignMessage
        const base64Message = stringToBase64url(message);
        logger.debug("Using Ethereum message signing");

        signature = await client.ethereumSignMessage({
          walletId,
          message: base64Message,
          networkId,
          derivationIndex,
        });
      } else {
        // For non-Ethereum chains (Solana, etc.), use signUtf8Message
        logger.debug("Using UTF-8 message signing");

        signature = await client.signUtf8Message({
          walletId,
          message,
          networkId,
          derivationIndex,
        });
      }

      logger.info(`Successfully signed message for wallet ${walletId}`);

      return {
        signature,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to sign message: ${errorMessage}`);
      throw new Error(`Failed to sign message: ${errorMessage}`);
    }
  },
};
