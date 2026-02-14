/**
 * PhantomMCPServer - Main MCP server implementation
 *
 * This server:
 * - Manages session lifecycle via SessionManager
 * - Registers MCP tool handlers
 * - Communicates via stdio transport
 * - Handles tools/list and tools/call requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { SessionManager } from "./session/manager.js";
import { tools, getTool } from "./tools/index.js";
import { Logger } from "./utils/logger.js";

/**
 * Configuration options for PhantomMCPServer
 */
export interface PhantomMCPServerOptions {
  /** Session manager configuration */
  session?: {
    authBaseUrl?: string;
    connectBaseUrl?: string;
    apiBaseUrl?: string;
    callbackPort?: number;
    appId?: string;
    sessionDir?: string;
  };
}

/**
 * PhantomMCPServer - Main server class that wires everything together
 *
 * Usage:
 * ```typescript
 * const server = new PhantomMCPServer();
 * await server.start();
 * ```
 */
export class PhantomMCPServer {
  private readonly server: Server;
  private readonly sessionManager: SessionManager;
  private readonly logger: Logger;

  /**
   * Creates a new PhantomMCPServer instance
   *
   * @param options - Configuration options
   */
  constructor(options: PhantomMCPServerOptions = {}) {
    this.logger = new Logger("PhantomMCPServer");

    // Initialize MCP Server
    this.server = new Server(
      {
        name: "phantom-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Initialize SessionManager
    this.sessionManager = new SessionManager(options.session);

    // Setup handlers
    this.setupHandlers();

    this.logger.info("PhantomMCPServer initialized");
  }

  /**
   * Sets up MCP request handlers
   */
  private setupHandlers(): void {
    // Handle tools/list request
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      this.logger.info("Handling tools/list request");

      try {
        // Return tool definitions
        const toolDefinitions = tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        this.logger.info(`Returning ${toolDefinitions.length} tool definitions`);

        return {
          tools: toolDefinitions,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to list tools: ${errorMessage}`);
        throw error;
      }
    });

    // Handle tools/call request
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const toolName = request.params.name;
      this.logger.info(`Handling tools/call request for: ${toolName}`);

      try {
        // Step 1: Get tool by name
        const tool = getTool(toolName);
        if (!tool) {
          const error = `Unknown tool: ${toolName}`;
          this.logger.error(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error }, null, 2),
              },
            ],
            isError: true,
          };
        }

        // Step 2: Get PhantomClient from SessionManager
        const client = this.sessionManager.getClient();
        const session = this.sessionManager.getSession();

        // Step 3: Create ToolContext
        const context = {
          client,
          session,
          logger: this.logger.child(toolName),
        };

        // Step 4: Execute tool handler
        this.logger.info(`Executing tool: ${toolName}`);
        const result = await tool.handler(request.params.arguments ?? {}, context);

        // Step 5: Return result as JSON string in text content
        this.logger.info(`Tool execution successful: ${toolName}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        // Step 6: On error, return error in text content with isError: true
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Log stack for debugging but don't expose to clients
        this.logger.error(`Tool execution failed for ${toolName}: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          this.logger.debug(`Stack trace: ${error.stack}`);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: errorMessage,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    });

    this.logger.info("Request handlers registered");
  }

  /**
   * Starts the MCP server
   * - Initializes session (loads or authenticates)
   * - Connects stdio transport
   * - Begins listening for requests
   *
   * @throws Error if initialization or startup fails
   */
  async start(): Promise<void> {
    this.logger.info("Starting PhantomMCPServer");

    try {
      // Initialize session (loads existing or authenticates)
      this.logger.info("Initializing session");
      await this.sessionManager.initialize();
      this.logger.info("Session initialized successfully");

      // Connect stdio transport
      this.logger.info("Connecting stdio transport");
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info("Server connected and ready to accept requests");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to start server: ${errorMessage}`);
      throw error;
    }
  }
}
