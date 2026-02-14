# @phantom/mcp-server

> **⚠️ PREVIEW DISCLAIMER**
>
> This MCP server is currently in **preview** and may break or change at any time without notice. Early adopters should **always use a separate Phantom account** specifically for testing with AI agents.
>
> **Phantom makes no guarantees whatsoever around anything your agent may do using this MCP server.** Use at your own risk and never use accounts containing significant assets.

An MCP (Model Context Protocol) server that provides LLMs like Claude with direct access to Phantom wallet operations. This enables AI assistants to interact with embedded wallets, view addresses, sign transactions, and sign messages across multiple blockchain networks (Solana, Ethereum, Bitcoin, Sui) through natural language interactions.

## Features

- **SSO Authentication**: Seamless integration with Phantom's embedded wallet SSO flow (Google/Apple login)
- **Session Persistence**: Automatic session management with stamper keys stored in `~/.phantom-mcp/session.json`
- **Multi-Chain Support**: Works with Solana, Ethereum, Bitcoin, and Sui networks
- **Five MCP Tools**:
  - `get_wallet_addresses` - Get blockchain addresses for the authenticated embedded wallet
  - `sign_transaction` - Sign transactions across supported chains
  - `transfer_tokens` - Transfer SOL or SPL tokens on Solana (executes immediately)
  - `buy_token` - Fetch a Solana swap quote from the Phantom quotes API (can execute immediately)
  - `sign_message` - Sign UTF-8 messages with automatic chain-specific routing

## Installation

### Option 1: npx (Recommended)

Use npx to run the server without global installation. This ensures you always use the latest version:

```bash
npx -y @phantom/mcp-server
```

### Option 2: Global Install

Install the package globally for faster startup:

```bash
npm install -g @phantom/mcp-server
```

Then run:

```bash
phantom-mcp
```

## Getting Your App ID

**Important:** Before you can use the MCP server, you must obtain an App ID from the Phantom Portal. This is required for the early release.

### Steps to Get Your App ID:

1. **Visit the Phantom Portal**: Go to [phantom.com/portal](https://phantom.com/portal)
2. **Sign in**: Use your Gmail or Apple account to sign in
3. **Create an App**: Click "Create App" and fill in the required details
4. **Configure Redirect URL**:
   - Navigate to Dashboard → View App → Redirect URLs
   - Add `http://localhost:8080/callback` as a redirect URL
   - This allows the OAuth callback to work correctly
5. **Get Your App ID**: Navigate to the "Phantom Connect" tab to find your App ID
   - Your app is automatically approved for development use
   - Copy the App ID for use in the MCP server configuration

**Important Note:** The email you use to sign in to the Phantom Portal **must match** the email you use when authenticating in the MCP server. If these don't match, authentication will fail.

Once you have your App ID, you can proceed with the configuration below.

## Usage

### Claude Desktop Configuration

Add the MCP server to your Claude Desktop configuration file:

**Location:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

**Using npx (Recommended):**

```json
{
  "mcpServers": {
    "phantom": {
      "command": "npx",
      "args": ["-y", "@phantom/mcp-server"],
      "env": {
        "PHANTOM_APP_ID": "your_app_id_from_portal"
      }
    }
  }
}
```

**Using global install:**

```json
{
  "mcpServers": {
    "phantom": {
      "command": "phantom-mcp",
      "env": {
        "PHANTOM_APP_ID": "your_app_id_from_portal"
      }
    }
  }
}
```

After updating the config, restart Claude Desktop to load the server.

### Environment Variables

Configure the server behavior using environment variables:

**App ID / OAuth Client Credentials:**

```bash
PHANTOM_APP_ID=your_app_id                    # Required (App ID from Phantom Portal)
# OR
PHANTOM_CLIENT_ID=your_client_id              # Alternative to PHANTOM_APP_ID

PHANTOM_CLIENT_SECRET=your_client_secret      # Optional (for confidential clients)
```

**Client Types:**

- **Public client** (recommended): Provide only `PHANTOM_APP_ID` (or `PHANTOM_CLIENT_ID`). Uses PKCE for security, similar to browser SDK.
- **Confidential client**: Provide both `PHANTOM_APP_ID` and `PHANTOM_CLIENT_SECRET`. Uses HTTP Basic Auth + PKCE.

**Note:** You must obtain your App ID from the [Phantom Portal](https://phantom.com/portal) before using the MCP server. See the "Getting Your App ID" section above for detailed instructions. Both `PHANTOM_APP_ID` and `PHANTOM_CLIENT_ID` are supported for backwards compatibility.

**Advanced Configuration (Optional):**

Most users won't need to change these settings. Available options:

- `PHANTOM_CALLBACK_PORT` - OAuth callback port (default: `8080`)
- `PHANTOM_CALLBACK_PATH` - OAuth callback path (default: `/callback`)
- `PHANTOM_MCP_DEBUG` - Enable debug logging (set to `1`)

**In Claude Desktop:**

```json
{
  "mcpServers": {
    "phantom": {
      "command": "npx",
      "args": ["-y", "@phantom/mcp-server"],
      "env": {
        "PHANTOM_APP_ID": "your_app_id_from_portal",
        "PHANTOM_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

### Authentication Flow

On first run, the server will:

1. **App ID**: Use App ID from `PHANTOM_APP_ID` (or `PHANTOM_CLIENT_ID`) environment variable
2. **Browser Authentication**: Open your default browser to `https://connect.phantom.app` for Google/Apple login
   - **Important**: Use the same email address that you used to sign in to the Phantom Portal
3. **SSO Callback**: Start a local server on port 8080 to receive the SSO callback
4. **Session Storage**: Save your session (including wallet ID, organization ID, and stamper keys) to `~/.phantom-mcp/session.json`

The session file is secured with restrictive permissions (0o600) and contains:

- Wallet and organization identifiers
- Stamper keypair (public key registered with auth server, secret key for signing API requests)
- User authentication details

Sessions use stamper keys which don't expire. The embedded wallet is created during SSO authentication and persists across sessions.

### Manual Testing

Test the server directly using the MCP inspector:

```bash
npx @modelcontextprotocol/inspector npx -y @phantom/mcp-server
```

This opens an interactive web UI where you can test tool calls without Claude Desktop.

## Network IDs Reference

Network identifiers follow the CAIP-2/CAIP-10 format. Here are the supported networks:

### Solana

- Mainnet: `solana:mainnet` (or `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`)
- Devnet: `solana:devnet` (or `solana:GH7ome3EiwEr7tu9JuTh2dpYWBJK3z69`)
- Testnet: `solana:testnet` (or `solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z`)

### Ethereum / EVM Chains

- Ethereum Mainnet: `eip155:1`
- Ethereum Sepolia: `eip155:11155111`
- Polygon Mainnet: `eip155:137`
- Polygon Amoy: `eip155:80002`
- Base Mainnet: `eip155:8453`
- Base Sepolia: `eip155:84532`
- Arbitrum One: `eip155:42161`
- Arbitrum Sepolia: `eip155:421614`

### Bitcoin

- Mainnet: `bip122:000000000019d6689c085ae165831e93`

### Sui

- Mainnet: `sui:mainnet`
- Testnet: `sui:testnet`

## Available Tools

> **Execution Warning**
> `transfer_tokens` always submits a transaction immediately, and `buy_token` can submit immediately when `execute: true`.
> If you need finer control (simulation, review, multi-sig, or custom signing), build your own transaction and use `sign_transaction` instead.

### 1. get_wallet_addresses

Gets all blockchain addresses for the authenticated embedded wallet (Solana, Ethereum, Bitcoin, Sui).

**Parameters:**

- `derivationIndex` (optional, number): Derivation index for the addresses (default: 0)

**Example:**

```json
{
  "derivationIndex": 0
}
```

**Response:**

```json
{
  "walletId": "05307b6d-2d5a-43d6-8d11-08db650a169b",
  "organizationId": "9b0ea123-5e7f-4dbe-88c5-7d769e2f8c8e",
  "addresses": [
    {
      "addressType": "Solana",
      "address": "H8FpYTgx4Uy9aF9Nk9fCTqKKFLYQ9KfC6UJhMkMDzCBh"
    },
    {
      "addressType": "Ethereum",
      "address": "0x8d8b06e017944f5951418b1182d119a376efb39d"
    },
    {
      "addressType": "BitcoinSegwit",
      "address": "bc1qkce5fvaxe759yu5xle5axlh8c7durjsx2wfhr9"
    },
    {
      "addressType": "Sui",
      "address": "0x039039cf69a336cb84e4c1dbcb3fa0c3f133d11b8146c6f7ed0d9f6817529a62"
    }
  ]
}
```

### 2. sign_transaction

Signs a transaction using the authenticated embedded wallet. Supports Solana, Ethereum, Bitcoin, and other chains.

**Parameters:**

- `walletId` (optional, string): The wallet ID to use for signing (defaults to authenticated wallet)
- `transaction` (required, string): The transaction to sign (format depends on chain: base64url for Solana, RLP-encoded hex for Ethereum)
- `networkId` (required, string): Network identifier (e.g., "eip155:1" for Ethereum mainnet, "solana:mainnet" for Solana)
- `derivationIndex` (optional, number): Derivation index for the account (default: 0)
- `account` (optional, string): Specific account address to use for simulation/signing

**Example:**

```json
{
  "transaction": "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABAgMEBQYH...",
  "networkId": "solana:mainnet",
  "derivationIndex": 0
}
```

**Response:**

```json
{
  "signedTransaction": "base64url-encoded-signed-transaction"
}
```

### 3. transfer_tokens

Transfers SOL or SPL tokens on Solana by building, signing, and sending the transaction.

**Parameters:**

- `walletId` (optional, string): The wallet ID to use for transfer (defaults to authenticated wallet)
- `networkId` (required, string): Solana network identifier (e.g., "solana:mainnet", "solana:devnet")
- `to` (required, string): Recipient Solana address
- `amount` (required, string): Transfer amount as a string (e.g., "0.5" or "1000000")
- `amountUnit` (optional, string): Amount unit (`ui` for SOL/token units, `base` for lamports/base units; default: `ui`)
- `tokenMint` (optional, string): SPL token mint address (omit for SOL)
- `decimals` (optional, number): Token decimals (optional for SPL tokens; fetched from chain if omitted)
- `derivationIndex` (optional, number): Derivation index for the account (default: 0)
- `rpcUrl` (optional, string): Solana RPC URL (defaults based on networkId)
- `createAssociatedTokenAccount` (optional, boolean): Create destination ATA if missing (default: true)

**Example (SOL):**

```json
{
  "networkId": "solana:mainnet",
  "to": "H8FpYTgx4Uy9aF9Nk9fCTqKKFLYQ9KfC6UJhMkMDzCBh",
  "amount": "0.1",
  "amountUnit": "ui"
}
```

**Example (SPL Token):**

```json
{
  "networkId": "solana:devnet",
  "to": "H8FpYTgx4Uy9aF9Nk9fCTqKKFLYQ9KfC6UJhMkMDzCBh",
  "tokenMint": "So11111111111111111111111111111111111111112",
  "amount": "1.5",
  "amountUnit": "ui"
}
```

**Response:**

```json
{
  "walletId": "05307b6d-2d5a-43d6-8d11-08db650a169b",
  "networkId": "solana:mainnet",
  "from": "H8FpYTgx4Uy9aF9Nk9fCTqKKFLYQ9KfC6UJhMkMDzCBh",
  "to": "H8FpYTgx4Uy9aF9Nk9fCTqKKFLYQ9KfC6UJhMkMDzCBh",
  "tokenMint": null,
  "signature": "5oVZJ8b7k2rGm3rP3Gm5J3tFjR6eUpCkG6TGNKxgqQ7s...",
  "rawTransaction": "base64url-encoded-signed-transaction"
}
```

### 4. buy_token

Fetches a Solana swap quote from the Phantom quotes API. Optionally signs and sends the first quote transaction.

**Parameters:**

- `walletId` (optional, string): The wallet ID to use for the taker address (defaults to authenticated wallet)
- `networkId` (optional, string): Solana network identifier (default: `solana:mainnet`)
- `buyTokenMint` (optional, string): Mint address of the token to buy (omit if buying native SOL)
- `buyTokenIsNative` (optional, boolean): Set true to buy native SOL (default: false)
- `sellTokenMint` (optional, string): Mint address of the token to sell (omit if selling native SOL)
- `sellTokenIsNative` (optional, boolean): Set true to sell native SOL (default: true if `sellTokenMint` not provided)
- `amount` (required, string): Sell amount (e.g., "0.5" or "1000000")
- `amountUnit` (optional, string): Amount unit (`ui` for token units, `base` for atomic units; default: `base`)
- `buyTokenDecimals` (optional, number): Buy token decimals (used when `amountUnit` is `ui` and `exactOut` is true)
- `sellTokenDecimals` (optional, number): Sell token decimals (used when `amountUnit` is `ui`)
- `slippageTolerance` (optional, number): Slippage tolerance in percent (0-100)
- `exactOut` (optional, boolean): Treat amount as buy amount instead of sell amount
- `autoSlippage` (optional, boolean): Enable auto slippage calculation
- `base64EncodedTx` (optional, boolean): Request base64-encoded transaction data in the quote response
- `execute` (optional, boolean): If true, sign and send the first quote transaction after fetching
- `taker` (optional, string): Taker address (defaults to wallet's Solana address)
- `rpcUrl` (optional, string): Solana RPC URL (for mint decimals lookup when `amountUnit` is `ui`)
- `quoteApiUrl` (optional, string): Quotes API URL override
- `derivationIndex` (optional, number): Derivation index for the taker address (default: 0)

**Example:**

```json
{
  "networkId": "solana:mainnet",
  "sellTokenIsNative": true,
  "buyTokenMint": "So11111111111111111111111111111111111111112",
  "amount": "0.5",
  "amountUnit": "ui",
  "slippageTolerance": 1,
  "execute": true
}
```

**Response:**

```json
{
  "quoteRequest": {
    "taker": {
      "chainId": "solana:101",
      "resourceType": "address",
      "address": "H8FpYTgx4Uy9aF9Nk9fCTqKKFLYQ9KfC6UJhMkMDzCBh"
    },
    "buyToken": {
      "chainId": "solana:101",
      "resourceType": "address",
      "address": "So11111111111111111111111111111111111111112"
    },
    "sellToken": {
      "chainId": "solana:101",
      "resourceType": "nativeToken",
      "slip44": "501"
    },
    "sellAmount": "500000000"
  },
  "quoteResponse": {
    "type": "quotes",
    "quotes": []
  },
  "execution": {
    "signature": "5oVZJ8b7k2rGm3rP3Gm5J3tFjR6eUpCkG6TGNKxgqQ7s...",
    "rawTransaction": "base64url-encoded-signed-transaction"
  }
}
```

### 5. sign_message

Signs a UTF-8 message using the authenticated embedded wallet. Automatically routes to the correct signing method based on the network (Ethereum vs other chains).

**Parameters:**

- `walletId` (optional, string): The wallet ID to use for signing (defaults to authenticated wallet)
- `message` (required, string): The UTF-8 message to sign
- `networkId` (required, string): Network identifier (e.g., "eip155:1" for Ethereum mainnet, "solana:mainnet" for Solana)
- `derivationIndex` (optional, number): Derivation index for the account (default: 0)

**Example:**

```json
{
  "message": "Hello, Phantom!",
  "networkId": "solana:mainnet"
}
```

**Response:**

```json
{
  "signature": "base64url-encoded-signature"
}
```

## Configuration

### Environment Variables

The MCP server supports the following environment variables:

#### Debug Logging

Enable debug logging to see detailed execution traces:

- `DEBUG=1` - Enable debug logging
- `PHANTOM_MCP_DEBUG=1` - Enable debug logging (alternative)

Debug logs are written to stderr and appear in Claude Desktop's MCP server logs.

### Session Storage

Sessions are stored in `~/.phantom-mcp/session.json` with the following security measures:

- Directory permissions: `0o700` (rwx for user only)
- File permissions: `0o600` (rw for user only)
- Contains: Wallet ID, organization ID, stamper keys, user authentication details

**Session persistence:**

- Sessions use stamper keypair authentication which doesn't expire
- Stamper public key is registered with the auth server during SSO
- Stamper secret key is used to sign all API requests
- Sessions persist indefinitely until explicitly deleted

**To reset your session:**

1. Delete the session file:
   ```bash
   rm ~/.phantom-mcp/session.json
   ```
2. Restart Claude Desktop (the server will re-authenticate on next use)

## Security

### OAuth Flow Security

- Uses PKCE (Proof Key for Code Exchange) for secure OAuth authentication
- App IDs are pre-registered through the Phantom Portal
- Session ID validation prevents replay attacks
- Callback server uses ephemeral localhost binding

### Session Security

- Session files have restrictive Unix permissions (user-only read/write)
- API keys are generated using cryptographically secure random sources
- Tokens are encrypted in transit (HTTPS)
- No plaintext credentials are stored

### Network Security

- All API requests use HTTPS
- Request signing with API key stamper prevents tampering
- Session tokens are bearer tokens with limited scope

## Troubleshooting

### Browser Doesn't Open

**Problem:** The OAuth flow tries to open your browser but fails.

**Solutions:**

- Ensure you have a default browser configured
- Manually visit the URL shown in the logs
- Check if the `open` command works in your terminal: `open https://phantom.app`

### Port 8080 Already in Use

**Problem:** Cannot bind OAuth callback server to port 8080.

**Error:** `EADDRINUSE: address already in use :::8080`

**Solutions:**

- Stop the process using port 8080: `lsof -ti:8080 | xargs kill`
- Change the callback port: Set `PHANTOM_CALLBACK_PORT` environment variable to a different port

### Authentication Email Mismatch

**Problem:** Authentication fails or you can't access your wallet.

**Solution:** Ensure you're using the **same email address** for both:

- Signing in to the Phantom Portal (where you created your app)
- Authenticating in the MCP server (Google/Apple login)

If the emails don't match, authentication will fail.

### Session Not Persisting

**Problem:** The server asks you to authenticate every time.

**Solutions:**

- Check session file exists: `ls -la ~/.phantom-mcp/session.json`
- Verify file permissions: `chmod 600 ~/.phantom-mcp/session.json`
- Check logs for session expiry messages
- Ensure `~/.phantom-mcp` directory has correct permissions: `chmod 700 ~/.phantom-mcp`

### MCP Server Not Loading in Claude

**Problem:** Claude Desktop doesn't show the Phantom tools.

**Solutions:**

1. Verify config file syntax is valid JSON
2. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%/Claude/logs/`
3. Restart Claude Desktop after config changes
4. Test the server manually with MCP inspector (see Manual Testing section)

### Authentication Timeout

**Problem:** Authentication flow times out before you complete it.

**Solutions:**

- The OAuth callback server waits 5 minutes by default
- Complete the authentication flow promptly
- If timeout occurs, restart Claude Desktop to retry

### Invalid Session Error

**Problem:** Session exists but is rejected by API.

**Solutions:**

- Verify your App ID is correct (check the Phantom Portal)
- Ensure the email used for authentication matches the Portal email
- Delete session file: `rm ~/.phantom-mcp/session.json`
- Restart Claude Desktop
- Re-authenticate when prompted

## Development

### Prerequisites

- Node.js 18+ and yarn
- TypeScript 5+

### Building

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Watch mode for development
yarn dev
```

### Testing

```bash
# Run all tests
yarn test

# Watch mode
yarn test:watch

# Check types
yarn check-types
```

### Linting

```bash
# Run ESLint
yarn lint

# Format code with Prettier
yarn prettier
```

### Running Locally

You can test the MCP server locally before installing:

```bash
# Build first
yarn build

# Run directly
node dist/index.js

# Or using the bin wrapper
./bin/phantom-mcp
```

## Contributing

This package is part of the [Phantom Connect SDK](https://github.com/phantom/phantom-connect-sdk) monorepo. Please refer to the main repository for contribution guidelines.

## License

See the main repository [LICENSE](../../LICENSE) file.

## Support

- [Phantom Documentation](https://docs.phantom.com)
- [GitHub Issues](https://github.com/phantom/phantom-connect-sdk/issues)

## Related Packages

- [@phantom/server-sdk](../server-sdk) - Server-side SDK for Phantom integration
- [@phantom/client](../client) - Client library for Phantom API
- [@phantom/react-sdk](../react-sdk) - React SDK for browser applications
