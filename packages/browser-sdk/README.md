# @phantom/browser-sdk

Browser SDK for Phantom Wallet supporting both injected and embedded non-custodial wallets.

## Quick Start

```bash
npm install @phantom/browser-sdk
```

### Injected Provider (Browser Extension)

```typescript
import { BrowserSDK, NetworkId } from "@phantom/browser-sdk";

// Connect to Phantom browser extension
const sdk = new BrowserSDK({
  providerType: "injected",
});

const { addresses } = await sdk.connect();
console.log("Connected addresses:", addresses);

// Sign and send transactions
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  transaction: mySolanaTransaction,
});
```

### Embedded Provider

```typescript
import { BrowserSDK, AddressType, NetworkId } from "@phantom/browser-sdk";

// Create embedded non-custodial wallet
const sdk = new BrowserSDK({
  providerType: "embedded",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  apiBaseUrl: "https://api.phantom.com",
  organizationId: "your-org-id",
});

const { walletId, addresses } = await sdk.connect();
console.log("Wallet ID:", walletId);
console.log("Addresses:", addresses);

const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  transaction: mySolanaTransaction,
});
```

## Features

- **🔒 Non-Custodial**: Full user control of private keys for both injected and embedded wallets
- **🌐 Dual Provider Support**: Works with Phantom browser extension or creates embedded wallets
- **🛠️ Native Transactions**: Work with blockchain-native objects, not base64url strings
- **🔗 Multi-Chain**: Solana, Ethereum, Bitcoin, Sui support
- **⚡ TypeScript**: Full type safety for all transaction formats
- **🎯 Unified API**: Same interface for both injected and embedded providers

## Provider Types

### Injected Provider

Uses the Phantom browser extension installed by the user. No additional configuration needed.

```typescript
const sdk = new BrowserSDK({
  providerType: "injected",
});
```

### Embedded Provider

Creates a non-custodial wallet embedded in your application. Requires API configuration.

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  apiBaseUrl: "https://api.phantom.com",
  organizationId: "your-org-id",
  embeddedWalletType: "app-wallet", // or 'user-wallet'
  authOptions: {
    authUrl: "https://auth.phantom.app", // optional, defaults to "https://connect.phantom.app"
    redirectUrl: "https://yourapp.com/callback", // optional, defaults to current page
  },
});
```

### Embedded Wallet Types

#### App Wallet (`'app-wallet'`)

- **New wallets** created per application
- **Unfunded** by default - you need to fund them
- **Independent** from user's existing Phantom wallet
- **Perfect for**: Gaming, DeFi protocols, or apps that need fresh wallets

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  embeddedWalletType: "app-wallet",
  addressTypes: [AddressType.solana],
  // ... other config
});
```

#### User Wallet (`'user-wallet'`)

- **Uses Phantom authentication** - user logs in with existing Phantom account
- **Potentially funded** - brings in user's existing wallet balance
- **Connected** to user's Phantom ecosystem
- **Perfect for**: Trading platforms, NFT marketplaces, or apps needing funded wallets

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  embeddedWalletType: "user-wallet",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  // ... other config
});
```

### Available AddressTypes (Embedded Only)

| AddressType                 | Networks Supported                          |
| --------------------------- | ------------------------------------------- |
| `AddressType.solana`        | Solana Mainnet, Devnet, Testnet             |
| `AddressType.ethereum`      | Ethereum, Polygon, Arbitrum, Optimism, Base |
| `AddressType.bitcoinSegwit` | Bitcoin Mainnet, Testnet                    |
| `AddressType.sui`           | Sui Mainnet, Testnet, Devnet                |

### Solana Provider Configuration

When using `AddressType.solana`, you can choose between two Solana libraries:

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  addressTypes: [AddressType.solana],
  solanaProvider: "web3js", // or 'kit'
  // ... other config
});
```

**Provider Options:**

- `'web3js'` (default) - Uses `@solana/web3.js` library
- `'kit'` - Uses `@solana/kit` library (modern, TypeScript-first)

**When to use each:**

- **@solana/web3.js**: Better ecosystem compatibility, wider community support
- **@solana/kit**: Better TypeScript support, modern architecture, smaller bundle size

## API Reference

### Constructor

```typescript
new BrowserSDK(config: BrowserSDKConfig)
```

#### BrowserSDKConfig

```typescript
interface BrowserSDKConfig {
  providerType: "injected" | "embedded";

  // Required for embedded provider only
  addressTypes?: AddressType[]; // Networks to enable
  apiBaseUrl?: string; // Phantom API base URL
  organizationId?: string; // Your organization ID
  authOptions?: {
    authUrl?: string; // Custom auth URL (default: "https://connect.phantom.app")
    redirectUrl?: string; // Custom redirect URL after authentication
  };
  embeddedWalletType?: "app-wallet" | "user-wallet"; // Wallet type
  solanaProvider?: "web3js" | "kit"; // Solana library choice (default: 'web3js')
}
```

### Methods

#### connect()

Connect to wallet and get addresses for configured AddressTypes.

```typescript
const result = await sdk.connect();
// Returns: { walletId: string, addresses: WalletAddress[] }
// addresses only includes types from addressTypes config
```

For embedded user-wallets, you can specify authentication options:

```typescript
// Phantom Connect with provider selection (default)
const result = await sdk.connect();

// Phantom Connect with Google authentication (skips provider selection)
const result = await sdk.connect({
  authOptions: {
    provider: "google",
  },
});

// Phantom Connect with Apple authentication (skips provider selection)
const result = await sdk.connect({
  authOptions: {
    provider: "apple",
  },
});

// JWT authentication (direct API call)
const result = await sdk.connect({
  authOptions: {
    provider: "jwt",
    jwtToken: "your-jwt-token",
    customAuthData: { userId: "user123" },
  },
});
```

**Authentication Options:**

- `provider` - Authentication method: `"google"`, `"apple"`, or `"jwt"`
  - If not specified: Shows provider selection screen on Phantom Connect
  - If `"google"` or `"apple"`: Skips provider selection and uses specified provider
  - If `"jwt"`: Uses JWT authentication flow via API call
- `jwtToken` - Required when `provider` is `"jwt"`. Your JWT token for authentication
- `customAuthData` - Additional data to pass to authentication service

**Authentication Flow Types:**

1. **Phantom Connect (Redirect-based)**: Used when `provider` is undefined, `"google"`, or `"apple"`

   - Redirects to `https://connect.phantom.app` (or custom `authOptions.authUrl` from config)
   - Handles OAuth flow with selected provider
   - Returns to your app with authentication result using `authOptions.redirectUrl` or current page

2. **JWT Authentication (API-based)**: Used when `provider` is `"jwt"`
   - Makes direct API call to `/api/auth/jwt` endpoint
   - Validates JWT token server-side
   - Returns wallet immediately without redirect

#### signAndSendTransaction(transaction)

Sign and send a native transaction object.

```typescript
// Solana transaction
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  transaction: solanaTransaction, // Native Transaction or VersionedTransaction
});

// Ethereum transaction
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.ETHEREUM_MAINNET,
  transaction: {
    to: "0x...",
    value: parseEther("1"), // 1 ETH
    gas: 21000n,
  },
});
```

#### signMessage(params)

Sign a message string.

```typescript
const signature = await sdk.signMessage({
  message: "Hello from Phantom!",
  networkId: NetworkId.SOLANA_MAINNET,
});
```

**Parameters:**

- `params.message` (string) - Message to sign
- `params.networkId` (NetworkId) - Network identifier

#### getAddresses()

Get connected wallet addresses.

```typescript
const addresses = await sdk.getAddresses();
// Returns addresses matching configured AddressTypes
```

#### disconnect()

Disconnect from wallet and clear session.

```typescript
await sdk.disconnect();
```

## Transaction Examples

### Solana Transactions

The SDK supports two different Solana transaction libraries. Choose based on your needs:

#### Option 1: @solana/web3.js (Legacy Library)

Traditional Solana library with broader ecosystem support.

```bash
npm install @solana/web3.js
```

```typescript
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BrowserSDK, NetworkId } from "@phantom/browser-sdk";

// Create native Solana transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(fromAddress),
    toPubkey: new PublicKey(toAddress),
    lamports: 0.001 * LAMPORTS_PER_SOL,
  }),
);

// Send native transaction object - no encoding needed!
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  transaction: transaction,
});

console.log("Transaction signature:", result.rawTransaction);
```

**VersionedTransaction with @solana/web3.js:**

```typescript
import { VersionedTransaction } from "@solana/web3.js";

const versionedTx = new VersionedTransaction(message);

const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.SOLANA_DEVNET,
  transaction: versionedTx,
});
```

#### Option 2: @solana/kit (Modern Library)

New high-performance Solana library with better TypeScript support.

```bash
npm install @solana/kit
```

```typescript
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";
import { BrowserSDK, NetworkId } from "@phantom/browser-sdk";

// Create transaction with @solana/kit
const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionMessageFeePayer(address(userPublicKey), tx),
  tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
);

const transaction = compileTransaction(transactionMessage);

const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  transaction: transaction,
});
```

### Ethereum Transactions (with Viem)

```typescript
import { parseEther, parseGwei, encodeFunctionData } from "viem";
import { BrowserSDK, NetworkId } from "@phantom/browser-sdk";

// Simple ETH transfer
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.ETHEREUM_MAINNET,
  transaction: {
    to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
    value: parseEther("1"), // 1 ETH
    gas: 21000n,
    gasPrice: parseGwei("20"), // 20 gwei
  },
});

// EIP-1559 transaction with maxFeePerGas
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.ETHEREUM_MAINNET,
  transaction: {
    to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
    value: parseEther("1"),
    data: encodeFunctionData({
      abi: tokenAbi,
      functionName: "transfer",
      args: ["0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E", parseEther("1")],
    }),
    gas: 50000n,
    maxFeePerGas: parseGwei("30"), // 30 gwei
    maxPriorityFeePerGas: parseGwei("2"), // 2 gwei
    type: "eip1559",
  },
});
```

#### Other EVM Networks

```typescript
// Polygon transaction
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.POLYGON_MAINNET,
  transaction: {
    to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
    value: parseEther("1"), // 1 MATIC
    gas: 21000n,
  },
});

// Arbitrum transaction
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.ARBITRUM_ONE,
  transaction: {
    to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
    value: parseEther("0.1"), // 0.1 ETH
    gas: 21000n,
  },
});
```

### Bitcoin Transactions

```typescript
// Bitcoin transaction
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.BITCOIN_MAINNET,
  transaction: {
    inputs: [
      {
        txid: "previous-transaction-id",
        vout: 0,
        scriptSig: "...",
      },
    ],
    outputs: [
      {
        value: 50000, // satoshis
        scriptPubKey: "76a914...88ac", // P2PKH script
      },
    ],
    version: 2,
    locktime: 0,
  },
});

// Bitcoin testnet
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.BITCOIN_TESTNET,
  transaction: {
    // ... transaction details
  },
});
```

### Sui Transactions

```typescript
import { TransactionBlock } from "@mysten/sui.js/transactions";

// Create Sui transaction block
const txb = new TransactionBlock();
txb.transferObjects([coin], recipientAddress);

const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.SUI_MAINNET,
  transaction: {
    kind: "moveCall", // or 'transferObject', 'transferSui', 'pay'
    data: txb, // TransactionBlock from @mysten/sui.js
  },
});

// Sui testnet
const result = await sdk.signAndSendTransaction({
  networkId: NetworkId.SUI_TESTNET,
  transaction: {
    kind: "transferSui",
    data: suiTransactionData,
  },
});
```

## Network IDs Reference

Use the exported `NetworkId` enum for type safety:

```typescript
import { NetworkId } from "@phantom/browser-sdk";
```

### Solana

- `NetworkId.SOLANA_MAINNET` - Solana Mainnet Beta
- `NetworkId.SOLANA_DEVNET` - Solana Devnet
- `NetworkId.SOLANA_TESTNET` - Solana Testnet

### Ethereum/EVM

- `NetworkId.ETHEREUM_MAINNET` - Ethereum Mainnet
- `NetworkId.ETHEREUM_SEPOLIA` - Ethereum Sepolia Testnet
- `NetworkId.POLYGON_MAINNET` - Polygon Mainnet
- `NetworkId.ARBITRUM_ONE` - Arbitrum One
- `NetworkId.OPTIMISM_MAINNET` - Optimism Mainnet
- `NetworkId.BASE_MAINNET` - Base Mainnet

### Bitcoin

- `NetworkId.BITCOIN_MAINNET` - Bitcoin Mainnet
- `NetworkId.BITCOIN_TESTNET` - Bitcoin Testnet

### Sui

- `NetworkId.SUI_MAINNET` - Sui Mainnet
- `NetworkId.SUI_TESTNET` - Sui Testnet
- `NetworkId.SUI_DEVNET` - Sui Devnet

## Advanced Usage

### Multi-Chain Application

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.sui],
  apiBaseUrl: "https://api.phantom.com",
  organizationId: "your-org-id",
});

class MultiChainWallet {
  async sendSolana(amount: number, recipient: string) {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(this.solanaAddress),
        toPubkey: new PublicKey(recipient),
        lamports: amount * LAMPORTS_PER_SOL,
      }),
    );

    return await sdk.signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction,
    });
  }

  async sendEthereum(amount: string, recipient: string) {
    return await sdk.signAndSendTransaction({
      networkId: NetworkId.ETHEREUM_MAINNET,
      transaction: {
        to: recipient,
        value: parseEther(amount),
        gas: 21000n,
      },
    });
  }

  async sendSui(coinId: string, recipient: string) {
    const txb = new TransactionBlock();
    txb.transferObjects([coinId], recipient);

    return await sdk.signAndSendTransaction({
      networkId: NetworkId.SUI_MAINNET,
      transaction: {
        kind: "transferObject",
        data: txb,
      },
    });
  }
}
```

### Error Handling

```typescript
try {
  const result = await sdk.signAndSendTransaction({
    networkId: NetworkId.SOLANA_MAINNET,
    transaction: myTransaction,
  });
  console.log("Success:", result);
} catch (error) {
  if (error.message.includes("User rejected")) {
    console.log("User cancelled the transaction");
  } else if (error.message.includes("insufficient funds")) {
    console.log("Not enough balance");
  } else {
    console.error("Transaction failed:", error);
  }
}
```

### Bundle Optimization Tips

1. **Only include networks you need**:

   ```typescript
   // Good: Only Solana (~250KB)
   addressTypes: [AddressType.solana];

   // Avoid: All networks if not needed (~800KB+)
   addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.sui, AddressType.bitcoinSegwit];
   ```

2. **Install dependencies based on enabled networks**:

   | AddressType                 | Required Dependencies              | Bundle Size |
   | --------------------------- | ---------------------------------- | ----------- |
   | `AddressType.solana`        | `@solana/web3.js` OR `@solana/kit` | ~250KB      |
   | `AddressType.ethereum`      | `viem`                             | ~300KB      |
   | `AddressType.bitcoinSegwit` | `bitcoinjs-lib`                    | ~200KB      |
   | `AddressType.sui`           | `@mysten/sui.js`                   | ~250KB      |

   **Example package.json for Solana + Ethereum (using @solana/web3.js)**:

   ```json
   {
     "dependencies": {
       "@phantom/browser-sdk": "^1.0.0",
       "@solana/web3.js": "^1.87.0",
       "viem": "^2.0.0"
     }
   }
   ```

   **Example package.json for Solana + Ethereum (using @solana/kit)**:

   ```json
   {
     "dependencies": {
       "@phantom/browser-sdk": "^1.0.0",
       "@solana/kit": "^2.0.0",
       "viem": "^2.0.0"
     }
   }
   ```

   **Example package.json for Solana only (using @solana/web3.js)**:

   ```json
   {
     "dependencies": {
       "@phantom/browser-sdk": "^1.0.0",
       "@solana/web3.js": "^1.87.0"
     }
   }
   ```

   **Example package.json for Solana only (using @solana/kit)**:

   ```json
   {
     "dependencies": {
       "@phantom/browser-sdk": "^1.0.0",
       "@solana/kit": "^2.0.0"
     }
   }
   ```

   **Example package.json for all networks (using @solana/web3.js)**:

   ```json
   {
     "dependencies": {
       "@phantom/browser-sdk": "^1.0.0",
       "@solana/web3.js": "^1.87.0",
       "viem": "^2.0.0",
       "bitcoinjs-lib": "^6.1.0",
       "@mysten/sui.js": "^0.50.0"
     }
   }
   ```

   **Example package.json for all networks (using @solana/kit)**:

   ```json
   {
     "dependencies": {
       "@phantom/browser-sdk": "^1.0.0",
       "@solana/kit": "^2.0.0",
       "viem": "^2.0.0",
       "bitcoinjs-lib": "^6.1.0",
       "@mysten/sui.js": "^0.50.0"
     }
   }
   ```

3. **Monitor bundle size**:
   ```bash
   # Analyze your bundle
   npx webpack-bundle-analyzer dist/main.js
   ```

## Server Setup for Embedded Wallets

For embedded wallets, you need to set up a backend endpoint. Add the `serverUrl` parameter to your SDK configuration:

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  addressTypes: [AddressType.solana],
  apiBaseUrl: "https://api.phantom.com",
  organizationId: "your-org-id",
  serverUrl: "http://localhost:3000/api",
});
```

### Required Backend Endpoint

Your backend needs an endpoint that uses the server-sdk:

```javascript
// server.js
const express = require("express");
const { ServerSDK } = require("@phantom/server-sdk");

const app = express();
app.use(express.json());

const serverSDK = new ServerSDK({
  organizationId: process.env.ORGANIZATION_ID,
  apiPrivateKey: process.env.PRIVATE_KEY,
  apiBaseUrl: process.env.API_URL,
});

app.post("/api/organizations", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const organization = await serverSDK.getOrCreateChildOrganizationByTag({
      tag: userId,
    });

    res.json({ organizationId: organization.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to process request" });
  }
});

app.listen(3000);
```
