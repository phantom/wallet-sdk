#!/usr/bin/env node

import { ServerSDK, NetworkId } from "@phantom/server-sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Configuration
const config = {
  organizationId: process.env.ORGANIZATION_ID!,
  appId: process.env.APP_ID!,
  apiPrivateKey: process.env.ORGANIZATION_PRIVATE_KEY!,
  apiBaseUrl: process.env.WALLET_API!,
};

// Parse command line arguments
function parseArgs(): { message: string; walletId?: string; walletName?: string } {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ No message provided");
    console.error("\nUsage:");
    console.error('  yarn sign-message "Your message to sign"');
    console.error('  yarn sign-message "Your message" --wallet-id wallet_123...');
    console.error('  yarn sign-message "Your message" --wallet-name "My Wallet"');
    console.error("\nOptions:");
    console.error("  --wallet-id     Use an existing wallet by ID");
    console.error("  --wallet-name   Create a new wallet with this name (or use the first matching wallet)");
    console.error("\nIf no wallet is specified, a new wallet will be created.");
    process.exit(1);
  }

  const message = args[0];
  let walletId: string | undefined;
  let walletName: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--wallet-id" && args[i + 1]) {
      walletId = args[i + 1];
      i++;
    } else if (args[i] === "--wallet-name" && args[i + 1]) {
      walletName = args[i + 1];
      i++;
    }
  }

  return { message, walletId, walletName };
}

// Validate configuration
function validateConfig() {
  const required = ["organizationId", "apiPrivateKey", "apiBaseUrl"];
  const missing = required.filter(key => !config[key as keyof typeof config]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing.join(", "));
    console.error("Please copy env.example to .env and fill in your values.");
    process.exit(1);
  }
}

// Get or create wallet
async function getOrCreateWallet(
  sdk: ServerSDK,
  walletId?: string,
  walletName?: string,
): Promise<{ walletId: string; solanaAddress: string; isNew: boolean }> {
  // If wallet ID is provided, use it directly
  if (walletId) {
    console.log(`📍 Using wallet ID: ${walletId}`);

    // Get wallet addresses to verify it exists and get Solana address
    try {
      const addresses = await sdk.getWalletAddresses(walletId);
      const solanaAddress = addresses.find((addr: any) => addr.addressType === "Solana")?.address;

      if (!solanaAddress) {
        throw new Error("Wallet does not have a Solana address");
      }

      return { walletId, solanaAddress, isNew: false };
    } catch (error) {
      console.error(`❌ Failed to get wallet addresses: ${error}`);
      process.exit(1);
    }
  }

  // If wallet name is provided, try to find existing wallet or create new
  if (walletName) {
    console.log(`🔍 Looking for wallet with name: ${walletName}`);

    try {
      // Search for existing wallet with this name
      const result = await sdk.getWallets(100, 0);
      const existingWallet = result.wallets.find((w: any) => w.walletName === walletName);

      if (existingWallet) {
        console.log(`✅ Found existing wallet: ${existingWallet.walletId}`);
        const addresses = await sdk.getWalletAddresses(existingWallet.walletId);
        const solanaAddress = addresses.find((addr: { addressType: string }) => addr.addressType === "Solana")?.address;

        if (!solanaAddress) {
          throw new Error("Wallet does not have a Solana address");
        }

        return { walletId: existingWallet.walletId, solanaAddress, isNew: false };
      }
    } catch (error) {
      console.log("⚠️  Could not search for existing wallets, will create new one");
    }
  }

  // Create new wallet
  const name = walletName || `Message Signing Wallet ${Date.now()}`;
  console.log(`🆕 Creating new wallet: ${name}`);

  try {
    const wallet = await sdk.createWallet(name);
    const solanaAddress = wallet.addresses.find((addr: any) => addr.addressType === "Solana")?.address;

    if (!solanaAddress) {
      throw new Error("Created wallet does not have a Solana address");
    }

    console.log(`✅ Wallet created: ${wallet.walletId}`);
    return { walletId: wallet.walletId, solanaAddress, isNew: true };
  } catch (error) {
    console.error(`❌ Failed to create wallet: ${error}`);
    process.exit(1);
  }
}

// Main function
async function signMessage() {
  console.log("✍️  Phantom Message Signer\n");

  // Parse arguments
  const { message, walletId, walletName } = parseArgs();

  // Validate config
  validateConfig();

  // Initialize SDK
  console.log("📦 Initializing Server SDK...");
  const sdk = new ServerSDK({
    apiPrivateKey: config.apiPrivateKey,
    organizationId: config.organizationId,
    appId: config.appId,
    apiBaseUrl: config.apiBaseUrl,
  });

  try {
    // Get or create wallet
    const wallet = await getOrCreateWallet(sdk, walletId, walletName);

    console.log(`\n📝 Message Details:`);
    console.log(`   Message: "${message}"`);
    console.log(`   Length: ${message.length} characters`);
    console.log(`   UTF-8 bytes: ${Buffer.from(message, "utf8").length}`);
    console.log(`   Base64url encoded: ${Buffer.from(message, "utf8").toString("base64url")}`);
    console.log(`\n🔑 Wallet Details:`);
    console.log(`   Wallet ID: ${wallet.walletId}`);
    console.log(`   Solana Address: ${wallet.solanaAddress}`);
    console.log(`   Status: ${wallet.isNew ? "Newly created" : "Existing wallet"}`);

    // Sign the message
    console.log(`\n🖊️  Signing message with Solana network...`);

    const result = await sdk.signMessage({
      walletId: wallet.walletId,
      message, // Plain text message - automatically parsed to base64url!
      networkId: NetworkId.SOLANA_MAINNET,
    });

    // Display results
    console.log(`\n✅ Message signed successfully!`);
    console.log(`\n📊 Signature Details:`);
    console.log(`   Human-readable: ${result.signature}`);
    console.log(`   Raw (base64url): ${result.rawSignature}`);
    console.log(`   Length: ${result.rawSignature.length} characters`);
    if (result.blockExplorer) {
      console.log(`   Block Explorer: ${result.blockExplorer}`);
    }

    // Convert raw signature to other formats
    const signatureBuffer = Buffer.from(result.rawSignature, "base64url");
    const signatureHex = signatureBuffer.toString("hex");
    const signatureBytes = Array.from(signatureBuffer);

    console.log(`   Hex: ${signatureHex}`);
    console.log(`   Bytes: [${signatureBytes.slice(0, 8).join(", ")}...] (${signatureBytes.length} bytes)`);

    // Verification info
    console.log(`\n🔐 Verification Info:`);
    console.log(`   To verify this signature:`);
    console.log(`   - Public Key: ${wallet.solanaAddress}`);
    console.log(`   - Message: "${message}"`);
    console.log(`   - Signature (base64): ${result.rawSignature}`);

    // Different network example
    console.log(`\n💡 Tips:`);
    console.log(`   - This signature was created using the Solana network context`);
    console.log(`   - You can modify the script to use other networks (Ethereum, etc.)`);
    console.log(`   - The signature can be verified using the public key and original message`);
    console.log(`   - Save the wallet ID to reuse the same wallet for future signatures`);

    if (wallet.isNew) {
      console.log(`\n⚠️  Remember to save this wallet ID for future use: ${wallet.walletId}`);
    }
  } catch (error) {
    console.error("\n❌ Failed to sign message:", error);
    process.exit(1);
  }
}

// Run the script
signMessage().catch(console.error);
