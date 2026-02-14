/**
 * OpenClaw Plugin API types
 */

/**
 * OpenClaw Plugin API interface
 */
export type OpenClawApi = {
  /** Plugin configuration provided by OpenClaw */
  config?: Record<string, unknown>;
  /** Register a tool with OpenClaw */
  registerTool: (definition: {
    name: string;
    description: string;
    parameters: unknown;
    execute: (id: string, params: Record<string, unknown>) => Promise<{ content: unknown; isError?: boolean }>;
  }) => void;
};
