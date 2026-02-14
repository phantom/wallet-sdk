# @phantom/mcp-server

## 0.1.2

### Patch Changes

- Bump to 0.1.2 because 0.1.1 is already published on npm.

## 0.1.1

### Patch Changes

- 148e8e3: Improve documentation for MCP server and OpenClaw plugin:
  - Add comprehensive Quick Start guide with installation checklist
  - Add Network IDs Reference section with CAIP-2/CAIP-10 format examples
  - Add complete documentation for all 5 tools (transfer_tokens and buy_token now fully documented)
  - Add safety considerations and confirmation requirements for financial operations
  - Fix incorrect Solana devnet network identifier
  - Add redirect URL configuration instructions for Phantom Portal setup
- 132b012: Added tools for transfering and swapping tokens
- d769c51: Fix MCP server executable not running when installed via npm/npx. The bin wrapper script was preventing the main server code from executing due to a failed `require.main === module` check. Changed to point bin directly to the built dist/index.js file, following the standard pattern used by official MCP servers.
