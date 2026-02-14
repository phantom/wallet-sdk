/**
 * MCP Tool types and interfaces
 */

import type { PhantomClient } from "@phantom/client";
import type { SessionData } from "../session/types.js";
import type { Logger } from "../utils/logger.js";

/**
 * Context provided to tool handlers
 */
export interface ToolContext {
  /** Authenticated PhantomClient instance */
  client: PhantomClient;
  /** Current session data */
  session: SessionData;
  /** Logger instance for this tool */
  logger: Logger;
}

/**
 * JSON Schema for MCP tool input validation
 */
export interface ToolInputSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

/**
 * MCP Tool definition
 */
export interface ToolHandler {
  /** Tool name (used in tool calls) */
  name: string;
  /** Tool description (shown to LLM) */
  description: string;
  /** JSON schema for input validation */
  inputSchema: ToolInputSchema;
  /** Tool handler function */
  handler: (params: Record<string, unknown>, context: ToolContext) => Promise<unknown>;
}
