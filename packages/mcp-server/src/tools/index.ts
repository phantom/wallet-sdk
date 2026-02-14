/**
 * MCP Tools Registry
 *
 * This module exports all available MCP tools for the Phantom wallet service.
 */

import { getWalletAddressesTool } from "./get-wallet-addresses.js";
import { signTransactionTool } from "./sign-transaction.js";
import { signMessageTool } from "./sign-message.js";
import { transferTokensTool } from "./transfer-tokens.js";
import { buyTokenTool } from "./buy-token.js";
import type { ToolHandler } from "./types.js";

/**
 * Array of all available tools
 */
export const tools: ToolHandler[] = [
  getWalletAddressesTool,
  signTransactionTool,
  signMessageTool,
  transferTokensTool,
  buyTokenTool,
];

/**
 * Get a tool by name
 * @param name - The name of the tool to retrieve
 * @returns The tool handler or undefined if not found
 */
export function getTool(name: string): ToolHandler | undefined {
  return tools.find(tool => tool.name === name);
}

/**
 * Get all tool names
 * @returns Array of tool names
 */
export function getToolNames(): string[] {
  return tools.map(tool => tool.name);
}

// Re-export types
export type { ToolHandler, ToolContext, ToolInputSchema } from "./types.js";
