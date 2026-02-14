#!/usr/bin/env node

import { PhantomMCPServer } from "./server.js";

// Export SessionManager and types for external usage
export { SessionManager } from "./session/manager.js";
export type { SessionData } from "./session/types.js";

// Export tools for external usage
export { tools } from "./tools/index.js";
export type { ToolHandler, ToolContext } from "./tools/types.js";

// Re-export PhantomClient type for convenience
export type { PhantomClient } from "@phantom/client";

async function main() {
  const server = new PhantomMCPServer();
  await server.start();
}

// Only run the server if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
