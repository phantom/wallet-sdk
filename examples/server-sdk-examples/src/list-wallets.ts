#!/usr/bin/env node

import { ServerSDK } from "@phantom/server-sdk";
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

// Format date to readable string
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// List all wallets with pagination
async function listAllWallets() {
  console.log("🔍 Phantom Wallet Lister\n");

  validateConfig();

  // Initialize SDK
  console.log("📦 Initializing Server SDK...");
  const sdk = new ServerSDK(config);

  try {
    console.log("📊 Fetching wallets...\n");

    let totalWallets = 0;
    let offset = 0;
    const pageSize = 50; // Fetch 50 wallets at a time
    let hasMore = true;
    let allWallets: any[] = [];

    while (hasMore) {
      const result = await sdk.getWallets(pageSize, offset);

      if (offset === 0) {
        totalWallets = result.totalCount;
        console.log(`📈 Total wallets in organization: ${totalWallets}\n`);

        if (totalWallets === 0) {
          console.log("⚠️  No wallets found in this organization.");
          return;
        }
      }

      allWallets.push(...result.wallets);

      // Update pagination
      offset += result.wallets.length;
      hasMore = offset < totalWallets;

      // Show progress
      if (hasMore) {
        process.stdout.write(`\rFetched ${offset} of ${totalWallets} wallets...`);
      } else {
        console.log(`\r✅ Fetched all ${totalWallets} wallets!    \n`);
      }
    }

    // Display wallet information
    console.log("📝 Wallet Details:\n");
    console.log("─".repeat(100));

    allWallets.forEach((wallet, index) => {
      console.log(`\n🔑 Wallet #${index + 1}`);
      console.log(`   ID: ${wallet.walletId}`);
      console.log(`   Name: ${wallet.walletName || "Unnamed"}`);
      console.log(`   Created: ${formatDate(wallet.createdAt)}`);
      console.log(`   Updated: ${formatDate(wallet.updatedAt)}`);

      if (wallet.addresses && wallet.addresses.length > 0) {
        console.log(`   Addresses:`);
        wallet.addresses.forEach((addr: any) => {
          console.log(`     • ${addr.addressType}: ${addr.address}`);
        });
      }

      console.log("─".repeat(100));
    });

    // Summary statistics
    console.log("\n📊 Summary:");
    console.log(`   Total wallets: ${totalWallets}`);

    // Calculate address type distribution
    const addressTypes: { [key: string]: number } = {};
    allWallets.forEach(wallet => {
      if (wallet.addresses) {
        wallet.addresses.forEach((addr: any) => {
          addressTypes[addr.addressType] = (addressTypes[addr.addressType] || 0) + 1;
        });
      }
    });

    console.log(`   Address types:`);
    Object.entries(addressTypes).forEach(([type, count]) => {
      console.log(`     • ${type}: ${count} addresses`);
    });

    // Show optional filters
    console.log("\n💡 Tip: You can modify this script to filter wallets by:");
    console.log("   • Creation date");
    console.log("   • Wallet name pattern");
    console.log("   • Address type");
    console.log("   • Or export to CSV/JSON for further analysis\n");
  } catch (error) {
    console.error("\n❌ Failed to list wallets:", error);
    process.exit(1);
  }
}

// Run the script
listAllWallets().catch(console.error);
