/**
 * get_wallet_addresses tool - Gets addresses for the authenticated embedded wallet
 */

import type { ToolHandler, ToolContext } from "./types.js";

export const getWalletAddressesTool: ToolHandler = {
  name: "get_wallet_addresses",
  description: "Gets all blockchain addresses for the authenticated embedded wallet (Solana, Ethereum, Bitcoin, Sui)",
  inputSchema: {
    type: "object",
    properties: {
      derivationIndex: {
        type: "number",
        description: "Optional derivation index for the addresses",
        minimum: 0,
      },
    },
  },
  handler: async (params: Record<string, unknown>, context: ToolContext) => {
    const { client, session, logger } = context;

    // Parse parameters
    const derivationIndex = typeof params.derivationIndex === "number" ? params.derivationIndex : undefined;

    logger.info("Getting addresses for wallet");

    try {
      // Call PhantomClient to get wallet addresses
      const addresses = await client.getWalletAddresses(
        session.walletId,
        undefined, // Use default derivation paths (Solana, Ethereum, Bitcoin, Sui)
        derivationIndex,
      );

      logger.info(`Successfully retrieved ${addresses.length} addresses`);

      return {
        walletId: session.walletId,
        organizationId: session.organizationId,
        addresses: addresses.map(addr => ({
          addressType: addr.addressType,
          address: addr.address,
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get wallet addresses: ${errorMessage}`);
      throw new Error(`Failed to get wallet addresses: ${errorMessage}`);
    }
  },
};
