# Phantom Server SDK

The Phantom Server SDK provides a secure and straightforward way to create and manage wallets, sign transactions, and interact with multiple blockchains from your backend services. This SDK is designed for server-side applications that need programmatic access to Phantom's wallet infrastructure.

## 📖 Documentation

Visit **[docs.phantom.com/server-sdk](https://docs.phantom.com/server-sdk)** for comprehensive documentation including:

- Getting Started Guide
- Creating and Managing Wallets
- Signing Transactions
- Signing Messages
- Complete API Reference
- Integration Examples
- Best Practices
- Security Considerations

## Features

- 🔐 **Secure wallet creation and management** - Create wallets programmatically with enterprise-grade security
- ✍️ **Transaction signing** - Sign and optionally submit transactions across multiple blockchains
- 📝 **Message signing** - Sign arbitrary messages for authentication or verification
- 🌐 **Multi-chain support** - Works with Solana, Ethereum, Polygon, Sui, Bitcoin, Base and other major blockchains
- 🔑 **Ed25519 authentication** - Secure API authentication using cryptographic signatures
- 📊 **Wallet listing and pagination** - Efficiently manage large numbers of wallets

## Installation

Install the Server SDK using your preferred package manager:

```bash
npm install @phantom/server-sdk
```

```bash
yarn add @phantom/server-sdk
```

```bash
pnpm add @phantom/server-sdk
```

## Prerequisites

Before using the SDK, you need:

1. **Phantom Organization Credentials**
   - Organization ID
   - Organization Private Key (base58 encoded)
   - API Base URL

   These credentials are provided when you create an organization with Phantom.

2. **Node.js** version 16 or higher

## Security First

The private key for your organization is meant to be stored **ONLY on your server** in a secure environment.

- **NEVER expose this key in client-side code**
- **NEVER commit it to version control**
- **Always use environment variables or secret management systems**

## Quick Start

### 1. Set up Environment Variables

Create a `.env` file in your project root:

```env
ORGANIZATION_ID=your-organization-id
PRIVATE_KEY=your-base58-encoded-private-key
API_URL=https://api.phantom.app/wallet
```

### 2. Initialize the SDK

```typescript
import { ServerSDK, NetworkId } from "@phantom/server-sdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize the SDK
const sdk = new ServerSDK({
  organizationId: process.env.ORGANIZATION_ID!,
  apiPrivateKey: process.env.PRIVATE_KEY!,
  apiBaseUrl: process.env.API_URL!,
});

// Create a wallet
const wallet = await sdk.createWallet("My First Wallet");
console.log("Wallet ID:", wallet.walletId);
console.log("Addresses:", wallet.addresses);

// Sign a message
const signature = await sdk.signMessage({
  walletId: wallet.walletId,
  message: "Hello, Phantom!",
  networkId: NetworkId.SOLANA_MAINNET,
});
console.log("Signature:", signature);
```

## Usage Examples

### Creating a Wallet

```typescript
// Create a wallet with a custom name
const wallet = await sdk.createWallet("User Wallet 123");

// Access addresses for different chains
const solanaAddress = wallet.addresses.find(addr => addr.addressType === "Solana")?.address;

const ethereumAddress = wallet.addresses.find(addr => addr.addressType === "Ethereum")?.address;

console.log("Solana address:", solanaAddress);
console.log("Ethereum address:", ethereumAddress);
```

### Signing and Sending Transactions

#### Solana - Native Web3.js Transaction Objects

```typescript
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

// Create a Solana transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(solanaAddress),
    toPubkey: new PublicKey(recipientAddress),
    lamports: 1000000, // 0.001 SOL
  }),
);

// Set transaction parameters
transaction.recentBlockhash = blockhash;
transaction.feePayer = new PublicKey(solanaAddress);

// Sign and send the transaction
const signedTx = await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction,
  networkId: NetworkId.SOLANA_MAINNET,
});

console.log("Signed transaction:", signedTx.rawTransaction);
```

#### Ethereum/EVM - Transaction Objects

```typescript
// Viem transaction object
const evmTransaction = {
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: 1000000000000000000n, // 1 ETH in wei
  data: "0x",
  gasLimit: 21000n,
};

const signedEvmTx = await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction: evmTransaction, // Native EVM transaction object
  networkId: NetworkId.ETHEREUM_MAINNET,
});

// Ethers.js transactions also supported
const ethersTransaction = {
  to: recipientAddress,
  value: ethers.parseEther("0.01"),
  serialize: () => "0x...", // Ethers serialization method
};

await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction: ethersTransaction,
  networkId: NetworkId.ETHEREUM_MAINNET,
});
```

#### Raw Formats - Hex Strings and Bytes

```typescript
// Hex string transaction
await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction: "0x02f8710182013685012a05f2008301388094742d35cc...", // Raw hex
  networkId: NetworkId.ETHEREUM_MAINNET,
});

// Raw bytes
const transactionBytes = new Uint8Array([1, 2, 3, 4, 5 /* ... */]);
await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction: transactionBytes,
  networkId: NetworkId.SOLANA_MAINNET,
});
```

### Signing Messages

```typescript
const solanaSignature = await sdk.signMessage({
  walletId: wallet.walletId,
  message: "Please sign this message to authenticate",
  networkId: NetworkId.SOLANA_MAINNET,
});

// Unicode messages work too
const unicodeSignature = await sdk.signMessage({
  walletId: wallet.walletId,
  message: "🚀 Welcome to Web3! 你好世界", // Unicode text
  networkId: NetworkId.SOLANA_MAINNET,
});

const ethMessage = Buffer.from().toString("base64url");
const ethSignature = await sdk.signMessage({
  walletId: wallet.walletId,
  message: "Sign in to our dApp",
  networkId: NetworkId.ETHEREUM_MAINNET,
});
```

### Managing Wallets

```typescript
// Get all wallets for your organization with pagination
const result = await sdk.getWallets(20, 0); // limit: 20, offset: 0

console.log(`Total wallets: ${result.totalCount}`);
console.log("Wallets:", result.wallets);

// Get addresses for a specific wallet
const addresses = await sdk.getWalletAddresses(walletId);

// Get specific addresses by derivation path
const customAddresses = await sdk.getWalletAddresses(
  walletId,
  ["m/44'/501'/0'/0'", "m/44'/60'/0'/0/0"], // Solana and Ethereum
);
```

## Network Support

The SDK supports multiple blockchain networks through the `NetworkId` enum:

### Solana Networks

- `NetworkId.SOLANA_MAINNET` - Solana Mainnet-Beta
- `NetworkId.SOLANA_DEVNET` - Solana Devnet
- `NetworkId.SOLANA_TESTNET` - Solana Testnet

### Ethereum Networks

- `NetworkId.ETHEREUM_MAINNET` - Ethereum Mainnet
- `NetworkId.ETHEREUM_GOERLI` - Goerli Testnet
- `NetworkId.ETHEREUM_SEPOLIA` - Sepolia Testnet

### Other EVM Networks

- `NetworkId.POLYGON_MAINNET` - Polygon Mainnet
- `NetworkId.POLYGON_MUMBAI` - Mumbai Testnet
- `NetworkId.ARBITRUM_ONE` - Arbitrum One
- `NetworkId.BASE_MAINNET` - Base Mainnet

### Future Support

- `NetworkId.BITCOIN_MAINNET` - Bitcoin Mainnet
- `NetworkId.SUI_MAINNET` - Sui Mainnet

## API Reference

For complete API documentation, visit **[docs.phantom.com/server-sdk](https://docs.phantom.com/server-sdk)**.

### Key Methods

- `createWallet(walletName?)` - Creates a new wallet
- `signAndSendTransaction(params)` - Signs and optionally submits transactions
- `signMessage(params)` - Signs arbitrary messages
- `getWalletAddresses(walletId, derivationPaths?)` - Retrieves wallet addresses
- `getWallets(limit?, offset?)` - Lists all wallets with pagination

## Resources

- [Documentation](https://docs.phantom.com/server-sdk)
- [Example Code](https://github.com/phantom/wallet-sdk/tree/main/examples/server-sdk-examples)
- [Integration Guide](https://docs.phantom.com/server-sdk/integration-guide)
- [API Reference](https://docs.phantom.com/server-sdk/api-reference)
- [Changelog](./CHANGELOG.md)

## License

This SDK is distributed under the MIT License. See the [LICENSE](../../LICENSE) file for details.

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.
