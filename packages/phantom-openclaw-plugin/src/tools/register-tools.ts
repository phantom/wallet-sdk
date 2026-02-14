/**
 * Register Phantom MCP tools as OpenClaw tools
 */

import { Type } from "@sinclair/typebox";
import { tools } from "@phantom/mcp-server";
import type { OpenClawApi } from "../client/types.js";
import type { PluginSession } from "../session.js";

/**
 * Convert MCP tool JSON schema to TypeBox schema
 */
function convertSchema(mcpSchema: any): any {
  // For now, use Type.Unknown() - we could do more sophisticated conversion
  return Type.Object(
    Object.fromEntries(Object.entries(mcpSchema.properties || {}).map(([key, _value]) => [key, Type.Unknown()])),
  );
}

/**
 * Register all Phantom MCP tools with OpenClaw
 */
export function registerPhantomTools(api: OpenClawApi, session: PluginSession): void {
  for (const mcpTool of tools) {
    api.registerTool({
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: convertSchema(mcpTool.inputSchema),
      async execute(_id: string, params: Record<string, unknown>) {
        // Create tool context for MCP tool with recursive logger
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createLogger = (prefix: string): any => ({
          info: (msg: string) => console.info(`[${prefix}] ${msg}`), // eslint-disable-line no-console
          error: (msg: string) => console.error(`[${prefix}] ${msg}`), // eslint-disable-line no-console
          debug: (msg: string) => console.debug(`[${prefix}] ${msg}`), // eslint-disable-line no-console
          child: (name: string) => createLogger(`${prefix}:${name}`),
        });

        const context = {
          client: session.getClient(),
          session: session.getSession(),
          logger: createLogger(mcpTool.name),
        };

        try {
          // Execute the MCP tool handler
          const result = await mcpTool.handler(params, context);

          // Return in OpenClaw format with defensive handling for undefined
          const normalized = result ?? null;
          return {
            content: [
              {
                type: "text" as const,
                text: typeof normalized === "string" ? normalized : JSON.stringify(normalized, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: errorMessage }, null, 2),
              },
            ],
            isError: true,
          };
        }
      },
    });
  }
}
