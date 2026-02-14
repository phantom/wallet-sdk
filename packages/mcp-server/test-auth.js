#!/usr/bin/env node

/**
 * Test script for OAuth authentication flow
 *
 * This script tests the complete OAuth flow:
 * 1. Get OAuth client (from env vars or DCR with auth.phantom.app)
 * 2. Browser authorization via connect.phantom.app
 * 3. Token exchange with auth.phantom.app
 *
 * Usage:
 *   # With public client (recommended - PKCE only, like browser SDK):
 *   PHANTOM_CLIENT_ID=xxx node test-auth.js
 *
 *   # With confidential client (PKCE + client secret):
 *   PHANTOM_CLIENT_ID=xxx PHANTOM_CLIENT_SECRET=yyy node test-auth.js
 *
 *   # With DCR (not currently supported by auth.phantom.app):
 *   node test-auth.js
 *
 *   # Environment options:
 *   STAGING=1              # Use staging endpoints
 *   DEBUG=1                # Enable debug logging
 *   PHANTOM_CALLBACK_PORT  # Custom callback port (default: 8080)
 */

const { SessionManager } = require("./dist/index.js");

async function testAuthFlow() {
  console.error("\n=== Phantom MCP Server - Auth Flow Test ===\n");

  // Check if staging mode
  const isStaging = process.env.STAGING === "1";

  if (isStaging) {
    console.error("🔧 Running in STAGING mode\n");
    process.env.PHANTOM_AUTH_BASE_URL = "https://staging-auth.phantom.app";
    process.env.PHANTOM_CONNECT_BASE_URL = "https://staging-connect.phantom.app";
    process.env.PHANTOM_API_BASE_URL = "https://staging-api.phantom.app/v1/wallets";
  } else {
    console.error("🌐 Running in PRODUCTION mode\n");
  }

  // Enable debug logging if requested
  if (process.env.DEBUG === "1") {
    process.env.PHANTOM_MCP_DEBUG = "1";
  }

  const rawPort = process.env.PHANTOM_CALLBACK_PORT;
  const callbackPort = Number.parseInt(rawPort ?? "8080", 10);
  if (!Number.isInteger(callbackPort) || callbackPort < 1 || callbackPort > 65535) {
    console.error(`Invalid PHANTOM_CALLBACK_PORT: ${rawPort ?? "(unset)"}`);
    process.exit(1);
  }
  const config = {
    authBaseUrl: process.env.PHANTOM_AUTH_BASE_URL,
    connectBaseUrl: process.env.PHANTOM_CONNECT_BASE_URL,
    apiBaseUrl: process.env.PHANTOM_API_BASE_URL,
    callbackPort,
    appId: process.env.PHANTOM_APP_ID || "phantom-mcp-test",
  };

  const hasClientId = !!process.env.PHANTOM_CLIENT_ID;
  const hasClientSecret = !!process.env.PHANTOM_CLIENT_SECRET;

  let clientMode;
  if (hasClientId && hasClientSecret) {
    clientMode = "Confidential client (PKCE + secret)";
  } else if (hasClientId) {
    clientMode = "Public client (PKCE only)";
  } else {
    clientMode = "Dynamic Client Registration (DCR)";
  }

  console.error("Configuration:");
  console.error(`  Auth URL:    ${config.authBaseUrl || "https://auth.phantom.app"}`);
  console.error(`  Connect URL: ${config.connectBaseUrl || "https://connect.phantom.app"}`);
  console.error(`  API URL:     ${config.apiBaseUrl || "https://api.phantom.app"}`);
  console.error(`  Callback:    http://localhost:${config.callbackPort}/callback`);
  console.error(`  App ID:      ${config.appId}`);
  console.error(`  Client Mode: ${clientMode}\n`);

  console.error("Steps:");
  if (hasClientId) {
    console.error(`  1. Use client ID from env var (${hasClientSecret ? "with secret" : "public client"})`);
  } else {
    console.error("  1. Dynamic Client Registration (DCR) → auth.phantom.app");
  }
  console.error("  2. Browser opens → connect.phantom.app/login (SSO login)");
  console.error("  3. User authenticates via SSO provider");
  console.error(`  4. SSO callback received → localhost:${config.callbackPort}/callback`);
  console.error("  5. Session credentials verified");
  console.error("  6. Session saved → ~/.phantom-mcp/session.json\n");

  const sessionManager = new SessionManager(config);

  try {
    console.error("🚀 Starting authentication flow...\n");

    await sessionManager.initialize();

    console.error("\n✅ Authentication successful!\n");

    const session = sessionManager.getSession();
    console.error("Session Details:");
    console.error(`  Wallet ID:        ${session.walletId}`);
    console.error(`  Organization ID:  ${session.organizationId}`);
    console.error(`  Auth User ID:     ${session.authUserId}`);
    console.error(`  Stamper Public:   ${session.stamperKeys.publicKey}`);
    console.error(`  Session File:     ~/.phantom-mcp/session.json\n`);

    // Test client
    const client = sessionManager.getClient();
    console.error("🔍 Testing PhantomClient...\n");

    const addresses = await client.getWalletAddresses(session.walletId);
    console.error(`✅ Retrieved ${addresses.length} addresses for wallet ${session.walletId}\n`);

    if (addresses.length > 0) {
      console.error("Wallet Addresses:");
      addresses.forEach(addr => {
        console.error(`  ${addr.addressType}: ${addr.address}`);
      });
      console.error("");
    }

    console.error("🎉 Auth flow test completed successfully!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Authentication failed:\n");
    console.error(error.message);

    if (error.stack && process.env.DEBUG === "1") {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    console.error("\n💡 Troubleshooting:");
    console.error("  • Set PHANTOM_CLIENT_ID (DCR not currently supported)");
    console.error("  • PHANTOM_CLIENT_SECRET is optional (for public vs confidential clients)");
    console.error(`  • Check if port ${config.callbackPort} is available`);
    console.error("  • Ensure browser opens to connect.phantom.app");
    console.error("  • Complete the authorization in browser");
    console.error("  • Try with DEBUG=1 for more details\n");

    process.exit(1);
  }
}

// Run the test
testAuthFlow();
