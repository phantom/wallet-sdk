const { PhantomClient, generateKeyPair } = require("@phantom/client");
const { ApiKeyStamper } = require("@phantom/api-key-stamper");
const { base64urlEncode } = require("@phantom/base64url");
const bs58 = require("bs58");
const fs = require("fs").promises;
const path = require("path");

interface DemoData {
  keyPair?: {
    publicKey: string;
    secretKey: string;
  };
  organization?: {
    organizationId: string;
    name: string;
  };
}

async function main() {
  console.log("🚀 Starting Phantom Client Demo");

  const dataPath = path.join(process.cwd(), "demo-data.json");
  let demoData: DemoData = {};

  // Load existing data if it exists
  try {
    const existingData = await fs.readFile(dataPath, "utf-8");
    demoData = JSON.parse(existingData);
    console.log("📄 Loaded existing demo data");
  } catch (error) {
    console.log("📝 Creating new demo data file");
  }

  // Step 1: Generate key pair and save to JSON
  console.log("\n🔑 Generating key pair...");
  const keyPair = generateKeyPair();
  demoData.keyPair = keyPair;

  await fs.writeFile(dataPath, JSON.stringify(demoData, null, 2));
  console.log(`✅ Key pair generated and saved:`);
  console.log(`   Public Key: ${keyPair.publicKey}`);
  console.log(`   Secret Key: ${keyPair.secretKey.substring(0, 20)}...`);

  // Step 2: Instantiate client with API key stamper using the generated key pair
  console.log("\n🔧 Initializing Phantom Client...");

  const stamper = new ApiKeyStamper({
    apiSecretKey: keyPair.secretKey,
  });

  const client = new PhantomClient(
    {
      apiBaseUrl: "https://staging-api.phantom.app/v1/wallets",
      headers: {
        "x-app-id": "2b4308d3-e072-4f31-b890-4bd14ed6e546",
      },
    },
    stamper,
  );

  console.log("✅ Phantom Client initialized");

  // Step 3: Create organization using the create organization method
  console.log("\n🏢 Creating organization...");
  try {
    // Convert base58 public key to base64url format as required by the API
    const base64urlPublicKey = base64urlEncode(bs58.decode(keyPair.publicKey));

    const organization = await client.createOrganization("Demo Organization", [
      {
        username: `demo-user-${Date.now()}`,
        role: "ADMIN",
        authenticators: [
          {
            authenticatorName: `demo-auth-${Date.now()}`,
            authenticatorKind: "keypair",
            publicKey: base64urlPublicKey,
            algorithm: "Ed25519",
          },
        ],
      },
    ]);

    demoData.organization = {
      organizationId: organization.organizationId,
      name: organization.organizationName,
    };

    await fs.writeFile(dataPath, JSON.stringify(demoData, null, 2));
    console.log(`✅ Organization created:`);
    console.log(`   ID: ${organization.organizationId}`);
    console.log(`   Name: ${organization.organizationName}`);

    // Step 4: Set organization ID and create wallet
    console.log("\n💰 Setting organization and creating wallet...");
    client.setOrganizationId(organization.organizationId);

    const wallet = await client.createWallet("Demo Wallet");

    console.log(`✅ Wallet created successfully:`);
    console.log(`   Wallet ID: ${wallet.walletId}`);
    console.log(`   Full wallet data:`, JSON.stringify(wallet, null, 2));
  } catch (error) {
    console.error("❌ Error during demo:", error);
    process.exit(1);
  }

  console.log("\n🎉 Demo completed successfully!");
  console.log(`📄 All data saved to: ${dataPath}`);

  // Generate server SDK usage documentation
  await generateServerSDKDoc(demoData);
}

async function generateServerSDKDoc(demoData: DemoData) {
  console.log("\n📚 Generating Server SDK documentation...");

  const docContent = `# Using Phantom Server SDK with Your Credentials

This guide shows how to use the Phantom Server SDK with your generated credentials.

## Your Credentials

You have been provided with the following credentials:
- **Organization ID**: \`${demoData.organization?.organizationId}\`
- **Private Key**: \`${demoData.keyPair?.secretKey}\`
- **Public Key**: \`${demoData.keyPair?.publicKey}\`

## Setup

1. Install the Server SDK:
\`\`\`bash
npm install @phantom/server-sdk
# or
yarn add @phantom/server-sdk
\`\`\`

2. Create a \`.env\` file with your credentials:
\`\`\`env
ORGANIZATION_ID=${demoData.organization?.organizationId}
PRIVATE_KEY=${demoData.keyPair?.secretKey}
API_URL=https://staging-api.phantom.app/v1/wallets
\`\`\`

## Basic Usage

\`\`\`typescript
import { ServerSDK, NetworkId } from "@phantom/server-sdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize the SDK
const sdk = new ServerSDK({
  organizationId: process.env.ORGANIZATION_ID!,
  appId: process.env.APP_ID!,
  apiPrivateKey: process.env.PRIVATE_KEY!,
  apiBaseUrl: process.env.API_URL!,
});

async function main() {
  try {
    // Create a wallet
    const wallet = await sdk.createWallet("My Wallet");
    console.log("Wallet ID:", wallet.walletId);
    console.log("Addresses:", wallet.addresses);

    // Sign a message (ServerSDK accepts plain text)
    const messageResult = await sdk.signMessage({
      walletId: wallet.walletId,
      message: "Hello from Phantom!",
      networkId: NetworkId.SOLANA_MAINNET,
    });
    console.log("Message signature result:", messageResult);
    console.log("Human-readable signature:", messageResult.signature);
    console.log("Raw signature:", messageResult.rawSignature);

    // Example: Sign a transaction (you'll need actual transaction data)
    // const signedTx = await sdk.signAndSendTransaction({
    //   walletId: wallet.walletId,
    //   transaction: yourTransactionObject, // ServerSDK accepts various formats
    //   networkId: NetworkId.SOLANA_MAINNET,
    // });

    // List all wallets in your organization  
    const walletsResult = await sdk.getWallets(10, 0);
    console.log(\`Total wallets: \${walletsResult.totalCount}\`);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
\`\`\`

## Advanced Features

### Working with Multiple Networks

\`\`\`typescript
// When you create a wallet, it automatically generates addresses for multiple chains
const wallet = await sdk.createWallet("My Multi-chain Wallet");

// Access different chain addresses from the wallet.addresses array
const solanaAddress = wallet.addresses.find(addr => addr.addressType === "Solana")?.address;
const ethereumAddress = wallet.addresses.find(addr => addr.addressType === "Ethereum")?.address;
const bitcoinAddress = wallet.addresses.find(addr => addr.addressType === "BitcoinSegwit")?.address;

console.log("Solana:", solanaAddress);
console.log("Ethereum:", ethereumAddress); 
console.log("Bitcoin:", bitcoinAddress);

// Sign messages on different networks (ServerSDK accepts plain text)
const solanaResult = await sdk.signMessage({
  walletId: wallet.walletId,
  message: "Solana message",
  networkId: NetworkId.SOLANA_MAINNET,
});

const ethereumResult = await sdk.signMessage({
  walletId: wallet.walletId,
  message: "Ethereum message", 
  networkId: NetworkId.ETHEREUM_MAINNET,
});
\`\`\`

### Transaction Signing Examples

The ServerSDK accepts various transaction formats and automatically parses them:

\`\`\`typescript
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

// Solana transaction example - ServerSDK accepts the transaction object directly
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(solanaAddress),
    toPubkey: new PublicKey("RECIPIENT_ADDRESS_HERE"),
    lamports: 1000000, // 0.001 SOL
  })
);

// Set recent blockhash and fee payer (required for Solana transactions)
// transaction.recentBlockhash = recentBlockhash;
// transaction.feePayer = new PublicKey(solanaAddress);

// ServerSDK accepts the transaction object directly - no need to serialize
const signedTransaction = await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction, // Pass the Transaction object directly
  networkId: NetworkId.SOLANA_MAINNET,
});
\`\`\`

## Security Notes

⚠️ **IMPORTANT**: 
- Store your private key securely in environment variables
- Never commit the private key to version control
- Use the staging API URL (\`https://staging-api.phantom.app/v1/wallets\`) for testing
- Switch to production API URL for live applications

## Next Steps

1. Read the full [Server SDK documentation](https://docs.phantom.com/server-sdk)
2. Check out more [examples](https://github.com/phantom/wallet-sdk/tree/main/examples/server-sdk-examples)
3. Integrate with your application's backend services

## Your Credential Data

Your credentials and organization information:
\`\`\`json
${JSON.stringify(demoData, null, 2)}
\`\`\`
`;

  const docPath = path.join(process.cwd(), "SERVER_SDK_USAGE.md");
  await fs.writeFile(docPath, docContent);

  console.log(`✅ Server SDK documentation generated: ${docPath}`);
}

// Run the demo
main().catch(error => {
  console.error("💥 Demo failed:", error);
  process.exit(1);
});
