# @phantom/openclaw-plugin

## 0.1.2

### Patch Changes

- Fix OpenClaw config handling so plugin-provided Phantom auth settings are applied to environment variables before session initialization, preventing incorrect fallback to OAuth dynamic client registration.

## 0.1.1

### Patch Changes

- 148e8e3: Improve documentation for MCP server and OpenClaw plugin:
  - Add comprehensive Quick Start guide with installation checklist
  - Add Network IDs Reference section with CAIP-2/CAIP-10 format examples
  - Add complete documentation for all 5 tools (transfer_tokens and buy_token now fully documented)
  - Add safety considerations and confirmation requirements for financial operations
  - Fix incorrect Solana devnet network identifier
  - Add redirect URL configuration instructions for Phantom Portal setup
- Updated dependencies [148e8e3]
- Updated dependencies [132b012]
- Updated dependencies [d769c51]
  - @phantom/mcp-server@0.1.1

## 0.1.0

### Major Changes

- **Renamed from openclaw-mcp to phantom-openclaw-plugin** - Better alignment with Phantom branding and OpenClaw plugin conventions
- **Direct integration with @phantom/mcp-server** - No longer uses a generic MCP bridge; instead directly depends on and integrates the Phantom MCP Server
- **Automatic session management** - Handles OAuth authentication and session persistence automatically
- **Modular architecture**:
  - `src/session.ts` - Wraps SessionManager for authentication lifecycle
  - `src/tools/` - Registers Phantom MCP tools directly as OpenClaw tools
  - `src/client/` - OpenClaw API type definitions
  - `skills/` - User-facing workflow skills
- **Added comprehensive README** - Installation, configuration, usage examples, and troubleshooting
- **Added phantom-wallet skill** - Pre-built workflow for common wallet operations
- **Improved type safety** - Full TypeScript support with proper type definitions
- **Updated package metadata** - New package name `@phantom/openclaw-plugin`

### Features

- Direct integration with `@phantom/mcp-server` for reliable wallet operations
- Automatic OAuth flow and session management on first use
- Native Phantom MCP tools exposed as OpenClaw tools
- Type-safe parameter validation with TypeBox
- Automatic result transformation to OpenClaw format
- Zero configuration required

### Available Tools

- `get_wallet_addresses` - Retrieve wallet addresses for all supported chains
- `sign_message` - Sign arbitrary messages
- `sign_transaction` - Sign blockchain transactions
- `transfer_tokens` - Transfer tokens to addresses
- `buy_token` - Purchase tokens
